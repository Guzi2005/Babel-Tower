// 智能视线半透与实例剖视系统：从主引擎解耦，负责相机遮挡检测与透明度平滑过渡
(function () {
  const isWalkwayOrFloor = (obj) => {
    if (!obj || !obj.userData) return false;
    const u = obj.userData;
    return !!(u.isFloor || u.isGround || u.isWalkway || u.isRoad || u.isStep || u.isPlatform || u.isDeck || u.isBridge);
  };

  const CameraOcclusion = {
    ensureInstanceOccluder(game, mesh, instanceId) {
      if (!game._instanceOccluders) game._instanceOccluders = new Map();
      const key = mesh.uuid + ':' + instanceId;
      if (game._instanceOccluders.has(key)) return game._instanceOccluders.get(key);
      const original = new THREE.Matrix4(); mesh.getMatrixAt(instanceId, original);
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(m => m.clone());
      const proxy = new THREE.Mesh(mesh.geometry, Array.isArray(mesh.material) ? mats : mats[0]);
      const local = new THREE.Matrix4().copy(mesh.matrixWorld).multiply(original);
      if (game.world && game.world.root && game.world.root.matrixWorld) {
        const inv = new THREE.Matrix4().copy(game.world.root.matrixWorld).invert(); local.premultiply(inv);
      }
      proxy.matrix.copy(local); proxy.matrixAutoUpdate = false;
      proxy.userData.occlusionProxy = true;
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
        game._instanceOccluders = new Map(); game.fadedMeshes.clear(); game._cachedOccluders = new Set();
      }
      // 视线遮挡检测重点聚焦核心领队与过场焦点，避免全体队员同帧进行海量递归光线求交造成帧率卡顿
      const keyLeader = (game.leader && game.leader.recruited && !game.leader.fainted) ? game.leader : (game.units.find(u => u.recruited && !u.fainted) || game.units[0]);
      const targets = keyLeader ? [keyLeader] : [];
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
      const doRaycast = !!game.cut || (game._occFrameCount % 3 === 0);

      if (doRaycast) {
        const camPos = game.camera.position;
        const occludersThisFrame = new Set();
        const rayOffsets = game.cut
          ? [[0, 0], [-0.65, 0], [0.65, 0], [0, 0.65], [0, -0.35]]
          : [[0, 0], [0, 0.55], [-0.35, 0.25], [0.35, 0.25]];

        // 扁平候选数组检测：优先针对真正的墙体、立柱、屋顶等 occlusionCandidates 进行检测，避免遍历全场景无遮挡地面/道路/水体
        const candidateList = (game.world && game.world.occlusionCandidates && game.world.occlusionCandidates.length)
          ? game.world.occlusionCandidates
          : game.world.root.children;
        const isFlat = (candidateList === game.world.occlusionCandidates);

        targets.forEach(u => {
          const uZ = u.z !== undefined ? u.z : (u.targetZ || 0);
          for (let rIdx = 0; rIdx < rayOffsets.length; rIdx++) {
            const off = rayOffsets[rIdx];
            game._occTarget.set(u.x + off[0], u.y + 0.9 + off[1], uZ);
            game._occDir.copy(game._occTarget).sub(camPos);
            const dist = game._occDir.length();
            if (dist < 1.0) continue;
            game._occDir.normalize();

            game.occlusionRaycaster.set(camPos, game._occDir);
            game.occlusionRaycaster.near = 0.8;
            game.occlusionRaycaster.far = Math.max(0.9, dist - 0.3);

            const hits = game.occlusionRaycaster.intersectObjects(candidateList, !isFlat);
            for (let i = 0; i < hits.length; i++) {
              const hit = hits[i];
              const obj = hit.object;
              if (!obj || !obj.isMesh || obj.isSprite || (obj.userData && obj.userData.noOcclusion)) continue;
              // 地面与真实走道永不淡化；屋顶和墙体可以局部透视。
              if (isWalkwayOrFloor(obj)) continue;
              if (!game.cut && hit.face && hit.face.normal.y > 0.45 && hit.point.y <= u.y + 0.95) continue;
              if (obj.isInstancedMesh && hit.instanceId !== undefined) {
                occludersThisFrame.add(this.ensureInstanceOccluder(game, obj, hit.instanceId));
              } else {
                occludersThisFrame.add(obj);
              }
            }
          }

          // 室内与深巷专属透视：若队员位于建筑内部或地面深巷（y < 3.5 且 Z < -1.2），直接将附近建筑的前外墙/前柱头半透
          if (u.inInterior || (u.y < 3.5 && u.z !== undefined && u.z < -1.2)) {
            if (game.world.frontOccluders) {
              game.world.frontOccluders.forEach(o => {
                if (!isWalkwayOrFloor(o)) {
                  o.getWorldPosition(game._occMeshPos);
                  if (Math.abs(game._occMeshPos.x - u.x) < 4.8 && (game._occMeshPos.z > u.z + 0.5)) occludersThisFrame.add(o);
                }
              });
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

      // 平滑渐变至半透
      activeOccluders.forEach(mesh => {
        if (!mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
          if (mat.userData._origOpacity === undefined) {
            mat.userData._origOpacity = mat.opacity !== undefined ? mat.opacity : 1.0;
            mat.userData._origTransparent = !!mat.transparent;
            mat.userData._origDepthWrite = mat.depthWrite !== undefined ? mat.depthWrite : true;
            mat.transparent = true;
            mat.depthWrite = false;
          }
          mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetAlpha, Math.min(1, dt * 16));
        });
        game.fadedMeshes.add(mesh);
      });

      // 恢复不再遮挡视线的物体材质
      game.fadedMeshes.forEach(mesh => {
        if (!activeOccluders.has(mesh) && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          let allRestored = true;
          mats.forEach(mat => {
            if (mat.userData._origOpacity !== undefined) {
              mat.opacity = THREE.MathUtils.lerp(mat.opacity, mat.userData._origOpacity, Math.min(1, dt * 9));
              if (Math.abs(mat.opacity - mat.userData._origOpacity) < 0.04) {
                mat.opacity = mat.userData._origOpacity;
                mat.transparent = mat.userData._origTransparent;
                mat.depthWrite = mat.userData._origDepthWrite;
                delete mat.userData._origOpacity;
                delete mat.userData._origTransparent;
                delete mat.userData._origDepthWrite;
              } else {
                allRestored = false;
              }
            }
          });
          if (allRestored) {
            game.fadedMeshes.delete(mesh);
            if (mesh.userData && mesh.userData.occlusionProxy) this.releaseInstanceOccluder(game, mesh);
          }
        }
      });
    }
  };

  window.CameraOcclusion = CameraOcclusion;
})();
