// 智能视线半透与实例剖视系统：从主引擎解耦，负责相机遮挡检测与透明度平滑过渡
(function () {
  const isWalkwayOrFloor = (obj) => {
    if (!obj || !obj.userData) return false;
    const u = obj.userData;
    return !!(u.isFloor || u.isGround || u.isWalkway || u.isRoad || u.isStep || u.isPlatform || u.isDeck || u.isBridge);
  };

  const CameraOcclusion = {
    // 为需要半透的普通 Mesh 克隆独立材质，彻底杜绝多个建筑/立柱共享材质时的相互争抢与全楼频闪
    prepareFadeMaterial(mesh) {
      if (!mesh || !mesh.material || mesh.userData._isFadeMaterial) return;
      const origMat = mesh.material;
      mesh.userData._origMaterial = origMat;
      const isArr = Array.isArray(origMat);
      const mats = isArr ? origMat : [origMat];
      const fadeMats = mats.map(m => {
        const clone = m.clone();
        clone.transparent = true;
        clone.depthWrite = false;
        return clone;
      });
      mesh.material = isArr ? fadeMats : fadeMats[0];
      mesh.userData._isFadeMaterial = true;
    },

    // 恢复实心状态并释放克隆材质，零内存泄漏
    restoreFadeMaterial(game, mesh) {
      if (!mesh) return;
      if (mesh.userData && mesh.userData.occlusionProxy) {
        this.releaseInstanceOccluder(game, mesh);
        return;
      }
      if (mesh.userData && mesh.userData._origMaterial) {
        const fadeMat = mesh.material;
        mesh.material = mesh.userData._origMaterial;
        delete mesh.userData._origMaterial;
        delete mesh.userData._isFadeMaterial;
        delete mesh.userData._occLinger;
        const mats = Array.isArray(fadeMat) ? fadeMat : [fadeMat];
        mats.forEach(m => m.dispose());
      }
    },

    ensureInstanceOccluder(game, mesh, instanceId) {
      if (!game._instanceOccluders) game._instanceOccluders = new Map();
      const key = mesh.uuid + ':' + instanceId;
      if (game._instanceOccluders.has(key)) return game._instanceOccluders.get(key);
      const original = new THREE.Matrix4(); mesh.getMatrixAt(instanceId, original);
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => {
        const clone = m.clone();
        clone.transparent = true;
        clone.depthWrite = false;
        return clone;
      });
      const proxy = new THREE.Mesh(mesh.geometry, Array.isArray(mesh.material) ? mats : mats[0]);
      const local = new THREE.Matrix4().copy(mesh.matrixWorld).multiply(original);
      if (game.world && game.world.root && game.world.root.matrixWorld) {
        const inv = new THREE.Matrix4().copy(game.world.root.matrixWorld).invert(); local.premultiply(inv);
      }
      proxy.matrix.copy(local); proxy.matrixAutoUpdate = false;
      proxy.updateMatrixWorld(true);
      proxy.userData.occlusionProxy = true;
      proxy.userData._isFadeMaterial = true;
      proxy.userData.occlusionSource = { mesh, instanceId, original, key };
      proxy.castShadow = false; proxy.receiveShadow = true;
      if (game.world && game.world.root) game.world.root.add(proxy);
      mesh.setMatrixAt(instanceId, new THREE.Matrix4().makeScale(0, 0, 0)); mesh.instanceMatrix.needsUpdate = true;
      game._instanceOccluders.set(key, proxy);
      return proxy;
    },

    releaseInstanceOccluder(game, proxy) {
      const data = proxy.userData && proxy.userData.occlusionSource;
      if (!data) return;
      data.mesh.setMatrixAt(data.instanceId, data.original); data.mesh.instanceMatrix.needsUpdate = true;
      if (proxy.parent) proxy.parent.remove(proxy);
      const mats = Array.isArray(proxy.material) ? proxy.material : [proxy.material]; mats.forEach(m => m.dispose());
      if (game._instanceOccluders) game._instanceOccluders.delete(data.key);
    },

    update(game, dt = 0.016) {
      if (!game.world || !game.world.root || !game.units || !game.units.length || !game.camera) return;
      if (game._occlusionWorldRoot !== game.world.root) {
        game._occlusionWorldRoot = game.world.root;
        game._instanceOccluders = new Map();
        if (game.fadedMeshes) {
          game.fadedMeshes.forEach(m => this.restoreFadeMaterial(game, m));
          game.fadedMeshes.clear();
        }
        game._cachedOccluders = new Set();
      }
      if (!game.fadedMeshes) game.fadedMeshes = new Set();

      // 视线遮挡检测：将 2D 角色视为真实 3D 胶囊体 (3D Capsule)，进行 3D 视线与体素射线检测
      const keyLeader = (game.leader && game.leader.recruited && !game.leader.fainted) ? game.leader : (game.units.find(u => u.recruited && !u.fainted) || game.units[0]);
      const targets = game.units.filter(u => u.recruited && !u.fainted && Math.hypot(u.x - game.cam.x, (u.z || 0) - game.cam.z) < 28.0);
      if (targets.length === 0 && keyLeader) targets.push(keyLeader);
      if (game.cut) {
        if (game.cut.line && game.cut.line.who) {
          const cu = game.units.find(q => q.id === game.cut.line.who);
          if (cu && !targets.includes(cu)) targets.push(cu);
        }
        const bani = game.units.find(q => q.id === 'bani' && !q.recruited);
        if (bani && !targets.includes(bani) && Math.hypot(bani.x - game.cam.x, bani.y - game.cam.y) < 12) targets.push(bani);
        targets.push({ x: game.cam.x, y: game.cam.y + 0.5, z: game.cam.z, isCutFocus: true });
      }
      if (!targets.length) return;

      if (!game._occTarget) {
        game._occTarget = new THREE.Vector3();
        game._occDir = new THREE.Vector3();
        game._occMeshPos = new THREE.Vector3();
      }

      game._occFrameCount = (game._occFrameCount || 0) + 1;
      const doRaycast = !!game.cut || (game._occFrameCount % 2 === 0);

      if (doRaycast) {
        const camPos = game.camera.position;
        const occludersThisFrame = new Set();

        // 扁平候选数组检测：优先针对真正的墙体、立柱、屋顶等 occlusionCandidates 进行检测，避免遍历全场景无遮挡地面/道路/水体
        const candidateList = (game.world && game.world.occlusionCandidates && game.world.occlusionCandidates.length)
          ? game.world.occlusionCandidates
          : game.world.root.children;
        const isFlat = (candidateList === game.world.occlusionCandidates);

        targets.forEach(u => {
          const cap = u.getCapsule ? u.getCapsule() : null;
          const uZ = cap ? cap.z : (u.z !== undefined ? u.z : (u.targetZ || 0));
          const samplePoints = cap ? cap.samplePoints : [
            [0, 0.85, 0], [0, 1.45, 0], [0, 0.25, 0], [-0.35, 0.85, 0], [0.35, 0.85, 0]
          ];

          for (let sIdx = 0; sIdx < samplePoints.length; sIdx++) {
            const sp = samplePoints[sIdx];
            game._occTarget.set(u.x + sp[0], u.y + sp[1], uZ + sp[2]);
            game._occDir.copy(game._occTarget).sub(camPos);
            const dist = game._occDir.length();
            if (dist < 0.6) continue;
            game._occDir.normalize();

            game.occlusionRaycaster.set(camPos, game._occDir);
            game.occlusionRaycaster.near = 0.5;
            game.occlusionRaycaster.far = Math.max(0.6, dist - 0.22);

            const hits = game.occlusionRaycaster.intersectObjects(candidateList, !isFlat);
            for (let i = 0; i < hits.length; i++) {
              const hit = hits[i];
              const obj = hit.object;
              if (!obj || !obj.isMesh || obj.isSprite || (obj.userData && obj.userData.noOcclusion)) continue;
              // 地面与真实走道永不淡化；屋顶和墙体可以局部透视。
              if (isWalkwayOrFloor(obj)) continue;
              if (!game.cut && hit.face && hit.face.normal && hit.face.normal.y > 0.45 && hit.point.y <= u.y + 0.95) continue;
              if (obj.isInstancedMesh && hit.instanceId !== undefined) {
                occludersThisFrame.add(this.ensureInstanceOccluder(game, obj, hit.instanceId));
              } else {
                occludersThisFrame.add(obj);
              }
            }
          }

          // 巨塔底层、大门、室内与深巷专属透视：若队员位于巨塔门厅或外廊柱廊内，将附近的前景遮挡体半透
          const nearTower = (u.x >= 30 && u.x <= 95 && u.y <= 13.0);
          if (u.inInterior || nearTower || (u.y < 3.5 && u.z !== undefined && u.z < -1.2)) {
            if (game.world.frontOccluders) {
              game.world.frontOccluders.forEach(o => {
                if (!isWalkwayOrFloor(o)) {
                  o.getWorldPosition(game._occMeshPos);
                  const threshX = nearTower ? 7.2 : 4.8;
                  const threshZ = nearTower ? (uZ + 0.3) : (uZ + 0.5);
                  if (Math.abs(game._occMeshPos.x - u.x) < threshX && (game._occMeshPos.z > threshZ)) occludersThisFrame.add(o);
                }
              });
            }
          }
          // 实例民居的室内剖视只展开当前这一栋，其他同材质建筑不受影响。
          if (u.interiorId) {
            if (!game._occInstanceMatrix) { game._occInstanceMatrix = new THREE.Matrix4(); game._occInstancePos = new THREE.Vector3(); }
            candidateList.forEach(o => {
              if (!o.isInstancedMesh || o.userData.interiorId !== u.interiorId || isWalkwayOrFloor(o)) return;
              for (let i = 0; i < o.count; i++) {
                o.getMatrixAt(i, game._occInstanceMatrix);
                game._occInstancePos.setFromMatrixPosition(game._occInstanceMatrix).applyMatrix4(o.matrixWorld);
                if (Math.abs(game._occInstancePos.x - u.x) < 8 && Math.abs(game._occInstancePos.z - uZ) < 9) {
                  occludersThisFrame.add(this.ensureInstanceOccluder(game, o, i));
                }
              }
            });
          }
        });

        // 过场演出时，对镜头视线与说话人前方的所有前景遮挡体强制半透
        if (game.cut && game.world && game.world.frontOccluders) {
          game.world.frontOccluders.forEach(o => {
            if (!isWalkwayOrFloor(o)) {
              o.getWorldPosition(game._occMeshPos);
              if (Math.abs(game._occMeshPos.x - game.cam.x) < 7.5 && game._occMeshPos.z > game.cam.z - 0.8) {
                occludersThisFrame.add(o);
              }
            }
          });
        }

        // 开发者透视模式：强制透视全图建筑墙体与遮挡
        if (window.DEV_PARAMS && window.DEV_PARAMS.forceWallAlpha && game.world && game.world.frontOccluders) {
          game.world.frontOccluders.forEach(o => {
            if (!isWalkwayOrFloor(o)) occludersThisFrame.add(o);
          });
        }

        game._cachedOccluders = occludersThisFrame;
      }

      const activeOccluders = game._cachedOccluders || new Set();
      const targetAlpha = game.cut ? 0.10 : 0.15;

      // 1. 将本轮检测到的遮挡体准备好独立材质，并刷新滞后计时器（0.38s）
      activeOccluders.forEach(mesh => {
        if (!mesh || !mesh.material) return;
        this.prepareFadeMaterial(mesh);
        mesh.userData._occLinger = 0.38; // 滞后缓冲，防止角色行走轻微起伏或边界边缘高频闪烁
        game.fadedMeshes.add(mesh);
      });

      // 2. 遍历所有处于半透或恢复过程中的物体，进行非对称防闪平滑过渡
      game.fadedMeshes.forEach(mesh => {
        if (!mesh || !mesh.material) {
          game.fadedMeshes.delete(mesh);
          return;
        }

        if (activeOccluders.has(mesh)) {
          mesh.userData._occLinger = 0.38;
        } else if (mesh.userData._occLinger > 0) {
          mesh.userData._occLinger -= dt;
        }

        const isStillOccluded = (mesh.userData._occLinger > 0);
        const destAlpha = isStillOccluded ? targetAlpha : 1.0;

        // 非对称渐变曲线：
        // 进入半透：响应迅速（dt * 8.5），无视觉迟滞
        // 恢复实体：柔和沉稳（dt * 4.0），防止边缘轻微越界引起的抽搐与闪烁
        const lerpFactor = isStillOccluded ? Math.min(1, dt * 8.5) : Math.min(1, dt * 4.0);

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        let allRestored = true;

        mats.forEach(mat => {
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, destAlpha, lerpFactor);
          if (isStillOccluded || mat.opacity < 0.985) {
            allRestored = false;
          }
        });

        // 彻底离开遮挡区且透明度已平滑过渡回 100% 实体时，无缝恢复原始材质并释放资源
        if (!isStillOccluded && allRestored) {
          this.restoreFadeMaterial(game, mesh);
          game.fadedMeshes.delete(mesh);
        }
      });
    }
  };

  window.CameraOcclusion = CameraOcclusion;
})();
