// 小队协同攀爬与救援动作系统（深井捞人、双人托举飞跃、叠罗汉登台、悬崖抛送、急救复苏）
(function () {
  const CoopActions = {
    // ───────── 捞人（拉起下方深井或断崖下的队友） ─────────
    pullUpTeammate(game) {
      if (game.coopActive) return;
      const inWell = game.units.filter(u => u.x > 29.4 && u.x < 33.6 && u.y < -1.5);
      const memEdge = game.available().filter(u => u.y >= -0.5 && Math.abs(u.x - 30.5) < 3.8);

      if (inWell.length === 0) {
        game.hud.banner('井下已无需要拉拔救援的人员！', 'info');
        return;
      }
      if (memEdge.length === 0) {
        game.hud.banner('上方井口需要至少 1 名队员才能伸手施救！', 'warn');
        return;
      }

      game.coopActive = true;
      game.hideCoopPrompt();

      // 优先拉拔井下最高位置的队友（站在木箱或叠高者优先被拉起）
      const sortedInWell = inWell.slice().sort((a, b) => b.y - a.y);
      const targetUnit = sortedInWell[0];

      if (memEdge.length >= 2) {
        // 两人人链「探井捞人」（猴子捞月形制，深及井底）
        const [u1, u2] = memEdge;
        u1.order = null; u1.path = null; u1.vx = 0; u1.vy = 0;
        u2.order = null; u2.path = null; u2.vx = 0; u2.vy = 0;
        targetUnit.order = null; targetUnit.path = null; targetUnit.vx = 0; targetUnit.vy = 0;

        u1.state = 'coop'; u2.state = 'coop'; targetUnit.state = 'coop';
        u1.grounded = null; u2.grounded = null; targetUnit.grounded = null;

        u1.x = 27.6; u1.y = 0; u1.facing = 1; u1.task = { type: 'operate', t: 1.5 };
        u2.x = 28.8; u2.y = -1.6; u2.facing = 1; u2.task = { type: 'hand', t: 1.5 };
        u1.say('抓住我！', 2);
        u2.say('抓住手了……起！', 2);
        targetUnit.task = { type: 'hand', t: 1.5 };
        SFX.playTone(330, 'sine', 0.2, 0.08);

        game.hud.banner(`两人联手探井捞人：合力将【${targetUnit.name}】拉出井底！`, 'good');
        if (window.Achievements) window.Achievements.unlock('monkey_chain');

        const startY = targetUnit.y;
        const startX = targetUnit.x;
        let elapsed = 0;
        const anim = () => {
          elapsed += 0.04;
          const k = Math.min(1, elapsed / 1.1);
          targetUnit.y = startY + k * (0 - startY);
          targetUnit.x = startX + k * (28.4 - startX);
          if (k < 1) {
            requestAnimationFrame(anim);
          } else {
            targetUnit.y = 0;
            targetUnit.x = 28.4;
            u2.x = 29.0; u2.y = 0;
            u1.x = 27.6; u1.y = 0;
            u1.state = 'idle'; u2.state = 'idle'; targetUnit.state = 'idle';
            u1.task = null; u2.task = null; targetUnit.task = null;
            targetUnit.grounded = ENT.findGround(game, targetUnit.x, targetUnit.y, 0.28);
            u2.grounded = ENT.findGround(game, u2.x, u2.y, 0.28);
            u1.grounded = ENT.findGround(game, u1.x, u1.y, 0.28);

            if (targetUnit.id === 'bani' && !targetUnit.recruited) {
              game.recruitUnit(targetUnit, u1);
            }
            targetUnit.say('多谢拉扯！我也脱困了！', 2.0);
            game.hud.banner(`🎉 探井捞人成功！已将【${targetUnit.name}】拉上地面！`, 'good');
            game.coopActive = false;
            game.hud.dirty = true;
          }
        };
        setTimeout(anim, 300);
        setTimeout(() => { if (game.coopActive) { u1.state = 'idle'; u2.state = 'idle'; targetUnit.state = 'idle'; u1.task = null; u2.task = null; targetUnit.task = null; game.coopActive = false; } }, 2500);
      } else {
        // 单人悬臂「伸手捞人」
        const u1 = memEdge[0];
        // 检查井下目标是否在单人手臂/垂索触及范围内 (targetUnit.y >= -3.5m)
        if (targetUnit.y < -3.5) {
          u1.task = { type: 'hand' };
          u1.say('井底太深了！单人手长够不到，需要再来一人连成人链，或者你在底下踩箱子垫高！', 2.5);
          SFX.playTone(220, 'sawtooth', 0.2, 0.08);
          setTimeout(() => {
            u1.task = null;
            game.hud.banner('单人手臂长度有限：井下队员需踩箱垫高，或上方需 2 人形成人链施救！', 'warn');
            game.coopActive = false;
          }, 1200);
          return;
        }

        // 单人拉扯施救
        u1.order = null; u1.path = null; u1.vx = 0; u1.vy = 0;
        targetUnit.order = null; targetUnit.path = null; targetUnit.vx = 0; targetUnit.vy = 0;
        u1.state = 'coop'; targetUnit.state = 'coop';
        u1.grounded = null; targetUnit.grounded = null;

        u1.x = 28.8; u1.y = 0; u1.facing = 1; u1.task = { type: 'hand', t: 1.5 };
        u1.say('抓住我的手！使劲！', 2.0);
        targetUnit.task = { type: 'hand', t: 1.5 };
        SFX.playTone(360, 'sine', 0.2, 0.08);

        game.hud.banner(`上方队员【${u1.name}】俯身伸手，将【${targetUnit.name}】拉起！`, 'good');
        const startY = targetUnit.y;
        const startX = targetUnit.x;
        let elapsed = 0;
        const anim = () => {
          elapsed += 0.05;
          const k = Math.min(1, elapsed / 0.9);
          targetUnit.y = startY + k * (0 - startY);
          targetUnit.x = startX + k * (28.4 - startX);
          if (k < 1) {
            requestAnimationFrame(anim);
          } else {
            targetUnit.y = 0; targetUnit.x = 28.4;
            u1.state = 'idle'; targetUnit.state = 'idle';
            u1.task = null; targetUnit.task = null;
            targetUnit.grounded = ENT.findGround(game, targetUnit.x, targetUnit.y, 0.28);
            u1.grounded = ENT.findGround(game, u1.x, u1.y, 0.28);

            if (targetUnit.id === 'bani' && !targetUnit.recruited) {
              game.recruitUnit(targetUnit, u1);
            }
            targetUnit.say('拉上来了！多谢接应！', 2.0);
            game.hud.banner(`🎉 伸手捞人成功！已将【${targetUnit.name}】拉出枯井！`, 'good');
            game.coopActive = false;
            game.hud.dirty = true;
          }
        };
        setTimeout(anim, 250);
        setTimeout(() => { if (game.coopActive) { u1.state = 'idle'; targetUnit.state = 'idle'; u1.task = null; targetUnit.task = null; game.coopActive = false; } }, 2500);
      }
    },

    monkeyFishing(game) {
      return this.pullUpTeammate(game);
    },

    // ───────── 协力托举（双人协同助跳腾空：底座扎步垫手托举，受托者借力高飞登台） ─────────
    coopBoostUp(game, lifter = null, boosted = null, targetPlat = null) {
      if (game.coopActive) return;

      const available = game.available().filter(u => u.grounded && !u.fainted);
      if (available.length < 2) {
        game.hud.banner('协力托举需要至少 2 名站在地面上的同伴配合！请让队友靠近', 'warn');
        return;
      }

      // 1. 优先搜寻前方最近的高台、平台或屋顶 (落差 1.1m ~ 5.2m)
      const avgRefX = (lifter && boosted) ? (lifter.x + boosted.x) / 2 : (game.leader ? game.leader.x : available[0].x);
      const baseRefY = (lifter && boosted) ? Math.min(lifter.y, boosted.y) : (game.leader ? game.leader.y : available[0].y);

      if (!targetPlat) {
        const candidates = (game.supports || []).filter(s => {
          const dy = s.y - baseRefY;
          const dx = Math.abs((s.x1 + s.x2) / 2 - avgRefX);
          return dy >= 1.1 && dy <= 5.2 && dx < 6.8;
        });
        candidates.sort((a, b) => Math.abs((a.x1 + a.x2) / 2 - avgRefX) - Math.abs((b.x1 + b.x2) / 2 - avgRefX));
        if (candidates.length) targetPlat = candidates[0];
      }

      // 关键合理性防呆：若已有队员成功登顶高台，合理行为由上方队员伸手捞人，绝不把高台队员强行吸扯回地面！
      if (targetPlat) {
        const onTopUnit = available.find(u => u.y >= targetPlat.y - 0.45 && Math.abs(u.x - (targetPlat.x1 + targetPlat.x2) / 2) < (targetPlat.x2 - targetPlat.x1) / 2 + 1.2);
        const onBotUnit = available.find(u => u.y < targetPlat.y - 1.0 && Math.abs(u.x - (targetPlat.x1 + targetPlat.x2) / 2) < (targetPlat.x2 - targetPlat.x1) / 2 + 2.5);
        if (onTopUnit && onBotUnit) {
          game.hud.banner(`✋【高台协力】${onTopUnit.name}已在高台就位，俯身伸手捞拉下方的【${onBotUnit.name}】！`, 'good');
          return this.pullUpOnLedge(game, onTopUnit, onBotUnit);
        }
      }

      // 托举发起者与受托者必须均处在高台下方（高度差 < 高台高度 - 0.65m），严禁选中已在高处的队员
      const belowUnits = targetPlat ? available.filter(u => u.y < targetPlat.y - 0.65) : available;
      if (belowUnits.length < 2) {
        game.hud.banner('高台下方需要至少 2 名地面同伴才能施展托举配合！', 'info');
        return;
      }

      // 2. 智能选定下方托举者 (lifter) 与受托举者 (boosted)
      const sel = belowUnits.filter(u => game.selection.has(u));
      if (!lifter || !boosted || (targetPlat && (lifter.y >= targetPlat.y - 0.65 || boosted.y >= targetPlat.y - 0.65))) {
        if (sel.length >= 2) {
          const strength = (u) => (u.id === 'bani' || u.role === '绝壁挑夫') ? 10 : (u.id === 'ghar' || u.role === '开路工兵') ? 8 : (u.id === 'akad' || u.role === '护卫') ? 7 : (u.id === 'ash') ? 6 : 5;
          sel.sort((a, b) => strength(b) - strength(a));
          lifter = sel[0];
          boosted = sel[1];
        } else if (sel.length === 1) {
          boosted = sel[0];
          const nearby = belowUnits.filter(u => u !== boosted && Math.hypot(u.x - boosted.x, u.y - boosted.y) < 4.5);
          if (!nearby.length) {
            game.hud.banner('附近 4.5 米内没有其他同伴可提供托举！请让队友靠近', 'warn');
            return;
          }
          nearby.sort((a, b) => Math.hypot(a.x - boosted.x, a.y - boosted.y) - Math.hypot(b.x - boosted.x, b.y - boosted.y));
          lifter = nearby[0];
        } else {
          const leader = (game.leader && game.leader.recruited && !game.leader.fainted && belowUnits.includes(game.leader)) ? game.leader : belowUnits[0];
          const nearby = belowUnits.filter(u => u !== leader && Math.hypot(u.x - leader.x, u.y - leader.y) < 4.5);
          if (nearby.length) {
            lifter = leader;
            boosted = nearby[0];
          } else {
            lifter = belowUnits[0];
            boosted = belowUnits[1];
          }
        }
      }

      game.coopActive = true;
      game.hideCoopPrompt();

      // 3. 确定朝向与目标平台 / 高台落脚点
      const avgX = (lifter.x + boosted.x) / 2;
      const baseY = Math.min(lifter.y, boosted.y);

      // 确定投射方向与落脚目标
      let launchDir = lifter.facing || 1;
      let targetX = lifter.x + launchDir * 2.8;
      let targetY = baseY + 3.2;

      if (targetPlat) {
        launchDir = ((targetPlat.x1 + targetPlat.x2) / 2 >= avgX) ? 1 : -1;
        targetX = Math.max(targetPlat.x1 + 0.45, Math.min(targetPlat.x2 - 0.45, avgX + launchDir * 2.4));
        targetY = targetPlat.y;
      }

      lifter.facing = launchDir;
      boosted.facing = launchDir;

      // 4. 动作前摇：托举者扎稳马步垫手，受托举者准备借力起飞
      lifter.order = null; lifter.path = null; lifter.vx = 0; lifter.vy = 0;
      boosted.order = null; boosted.path = null; boosted.vx = 0; boosted.vy = 0;
      lifter.state = 'coop'; boosted.state = 'coop';
      lifter.task = { type: 'hand', t: 1.5 }; boosted.task = { type: 'hand', t: 1.5 };

      lifter.say('▲ gha · ! ✋ (扎稳马步，垫手托举！)', 1.5);
      boosted.say('✦ hop · ↑ ! (借力起步！)', 1.5);
      SFX.playTone(320, 'sawtooth', 0.18, 0.08, 480);

      boosted.x = lifter.x - launchDir * 0.35;
      if (Math.abs(boosted.y - lifter.y) <= 0.45) boosted.y = lifter.y;

      setTimeout(() => {
        if (boosted.fainted || lifter.fainted || !game.units.includes(boosted) || !game.units.includes(lifter)) {
          game.coopActive = false;
          return;
        }

        // 4. 发力蹬跃与空中飞腾！
        SFX.playTone(600, 'sine', 0.28, 0.1, 980);
        game.shake(0.22);
        game.fx.sparkle(lifter.x + launchDir * 0.3, lifter.y + 0.9);
        lifter.say('↑ 喝！起！', 1.2);

        const rise = Math.max(2.4, targetY - lifter.y + 0.8);
        const vy = Math.sqrt(2 * 32 * rise);
        const flightTime = Math.max(0.4, (vy + Math.sqrt(Math.max(0, vy * vy - 2 * 32 * (targetY - lifter.y)))) / 32);
        const vx = (targetX - boosted.x) / flightTime;

        boosted.grounded = null;
        boosted.state = 'jump';
        boosted.coopAirborne = true;
        boosted.task = null;
        boosted.vy = vy;
        boosted.vx = vx;
        boosted.facing = launchDir;

        game.hud.banner(`🚀【协力托举】${lifter.name}发力将【${boosted.name}】猛烈托举送上高台！`, 'good');

        setTimeout(() => {
          lifter.state = 'idle';
          lifter.task = null;
          lifter.grounded = ENT.findGround(game, lifter.x, lifter.y, 0.28);
        }, 550);

        let landed = false;
        const launchAt = performance.now();
        const minAirMs = Math.max(260, flightTime * 550);
        const checkLanding = setInterval(() => {
          if (landed) return;
          if (performance.now() - launchAt < minAirMs) return;
          if (boosted.vy <= 0 && boosted.y <= targetY + 0.35) {
            landed = true;
            clearInterval(checkLanding);
            boosted.coopAirborne = false;
            boosted.x = targetX;
            boosted.y = targetY;
            boosted.vx = 0;
            boosted.vy = 0;
            boosted.state = 'idle';
            boosted.grounded = ENT.findGround(game, boosted.x, boosted.y, 0.28);
            boosted.say('上来了！在高处建立立足点！', 2.0);
            SFX.playConfirm();
            game.coopActive = false;
            game.hud.dirty = true;
          }
        }, 40);

        setTimeout(() => {
          if (!landed) {
            clearInterval(checkLanding);
            boosted.coopAirborne = false;
            game.coopActive = false;
            if (boosted.state === 'coop') boosted.state = 'idle';
          }
        }, 2800);
      }, 400);
    },

    // ───────── 叠罗汉（层层搭起人梯，仅让接近目标面的顶层 NPC 跃出） ─────────
    humanLadder(game, units = null, targetY = 0, landingX = 28.6) {
      if (game.coopActive) return;
      const inWell = units || game.units.filter(u => u.x > 29.4 && u.x < 33.6 && u.y < -1.5);
      if (inWell.length < 2) {
        game.hud.banner('叠罗汉需要至少 2 人在下方配合搭起人梯', 'warn');
        return;
      }
      game.coopActive = true;
      game.hideCoopPrompt();
      const crateInWell = game.crates.find(c => c.x > 29.4 && c.x < 33.6 && c.y < -1.5);
      const baseY = crateInWell ? crateInWell.y + 1.0 : -5.0;
      const stackX = crateInWell ? crateInWell.x : 31.5;

      inWell.forEach(u => {
        u.order = null; u.path = null; u.vx = 0; u.vy = 0;
        u.grounded = null; u.state = 'coop'; u.task = { type: 'operate', t: 1.5 };
      });

      inWell.sort((a, b) => {
        const aSel = game.selection.has(a) ? 1 : 0;
        const bSel = game.selection.has(b) ? 1 : 0;
        return aSel - bSel;
      });

      inWell.forEach((u, i) => {
        u.x = stackX;
        u.y = baseY + i * 1.5;
      });
      SFX.playTone(440, 'triangle', 0.25, 0.08);

      const topUnit = inWell[inWell.length - 1];
      const topHeadY = topUnit.y + 1.5;
      const reachesTarget = topHeadY >= targetY - 0.4;

      if (!reachesTarget) {
        topUnit.task = { type: 'hand', t: 1.5 };
        topUnit.say('够不到井口！高度还差一点，需要木箱垫高或更多同伴！', 2.2);
        SFX.playTone(240, 'sawtooth', 0.2, 0.08);

        setTimeout(() => {
          inWell.forEach((u, i) => {
            u.x = stackX - 0.4 + i * 0.5;
            u.y = baseY;
            u.state = 'idle';
            u.task = null;
            u.grounded = ENT.findGround(game, u.x, u.y, 0.28);
          });
          game.hud.banner('高度不足：叠罗汉未能触及目标面。需推下木箱垫脚或派更多队员！', 'warn');
          game.coopActive = false;
        }, 1400);
        return;
      }

      game.hud.banner(`全员就位搭起人梯！顶层队员【${topUnit.name}】发力借势翻越井口！`, 'good');
      topUnit.task = { type: 'hand', t: 1.5 };
      topUnit.say('我看到井口了！我跳上去了！', 1.8);

      setTimeout(() => {
        topUnit.x = landingX;
        topUnit.y = targetY;
        topUnit.vx = -1.5;
        topUnit.vy = 2.5;
        topUnit.state = 'idle';
        topUnit.task = null;
        topUnit.grounded = ENT.findGround(game, topUnit.x, topUnit.y, 0.28);
        topUnit.say('我翻上来了！底下的同伴稳住，我在上面拉你们！', 2.2);
        SFX.playJump();

        if (topUnit.id === 'bani' && !topUnit.recruited) {
          const rec = inWell.find(u => u !== topUnit && u.recruited) || game.units.find(u => u.recruited);
          game.recruitUnit(topUnit, rec);
        }

        const remaining = inWell.filter(u => u !== topUnit);
        remaining.forEach((u, i) => {
          u.x = stackX - 0.4 + i * 0.5;
          u.y = baseY;
          u.state = 'idle';
          u.task = null;
          u.grounded = ENT.findGround(game, u.x, u.y, 0.28);
        });
        if (remaining.length > 0) {
          remaining[remaining.length - 1].say(`${topUnit.name} 好样的！快在上面伸手拉我们！`, 2.0);
        }

        game.hud.banner(`🎉 叠罗汉成功！顶层【${topUnit.name}】翻越至地面，下方队友留在井中等待拉扯救援！`, 'good');
        game.coopActive = false;
        game.hud.dirty = true;
      }, 900);
    },

    // ───────── 通用高台叠罗汉（高台下搭人梯，助顶层登台，底座留驻） ─────────
    humanLadderOnLedge(game, units, plat) {
      if (game.coopActive || units.length < 2) return;
      game.coopActive = true;
      game.hideCoopPrompt();

      const platY = plat[2];
      const stackX = Math.max(plat[0] - 0.3, Math.min(plat[1] + 0.3, units[0].x));
      const baseY = units[0].y;

      units.forEach(u => {
        u.order = null; u.path = null; u.vx = 0; u.vy = 0;
        u.grounded = null; u.state = 'coop'; u.task = { type: 'operate', t: 1.5 };
      });

      units.forEach((u, i) => {
        u.x = stackX;
        u.y = baseY + i * 1.5;
      });
      SFX.playTone(440, 'triangle', 0.25, 0.08);

      const topU = units[units.length - 1];
      const topHeadY = topU.y + 1.5;

      if (topHeadY < platY - 0.4) {
        topU.task = { type: 'hand', t: 1.5 };
        topU.say('高台太高了，够不到边缘！', 1.8);
        setTimeout(() => {
          units.forEach((u, i) => {
            u.x = stackX - 0.3 + i * 0.6;
            u.y = baseY;
            u.state = 'idle'; u.task = null;
            u.grounded = ENT.findGround(game, u.x, u.y, 0.28);
          });
          game.hud.banner('高度不足：高台过高，叠罗汉未能触及台面！', 'warn');
          game.coopActive = false;
        }, 1200);
        return;
      }

      game.hud.banner(`全员搭起人梯！【${topU.name}】翻身跃上高台！`, 'good');
      topU.task = { type: 'hand', t: 1.5 };

      setTimeout(() => {
        const landX = Math.max(plat[0] + 0.4, Math.min(plat[1] - 0.4, stackX));
        topU.x = landX; topU.y = platY;
        topU.state = 'idle'; topU.task = null;
        topU.grounded = ENT.findGround(game, topU.x, topU.y, 0.28);
        topU.say('我上来了！在上面照应你们！', 2.0);
        SFX.playJump();

        const remaining = units.filter(u => u !== topU);
        remaining.forEach((u, i) => {
          u.x = stackX - 0.3 + i * 0.6; u.y = baseY;
          u.state = 'idle'; u.task = null;
          u.grounded = ENT.findGround(game, u.x, u.y, 0.28);
        });
        if (remaining.length) remaining[0].say('好！等下伸手拉我！', 1.8);

        game.hud.banner(`🎉 叠罗汉登台成功！顶层队员【${topU.name}】跃上高台，下方队友留在台底！`, 'good');
        game.coopActive = false;
        game.hud.dirty = true;
      }, 800);
    },

    // ───────── 通用高台捞人（高台上队员伸手拉拔台底队员） ─────────
    pullUpOnLedge(game, topU, botU) {
      if (game.coopActive) return;
      game.coopActive = true;
      game.hideCoopPrompt();

      topU.order = null; topU.path = null; topU.vx = 0; topU.vy = 0;
      botU.order = null; botU.path = null; botU.vx = 0; botU.vy = 0;
      topU.state = 'coop'; botU.state = 'coop';
      topU.task = { type: 'hand', t: 1.5 }; botU.task = { type: 'hand', t: 1.5 };
      topU.say('抓紧我的手，起！', 2.0);
      SFX.playTone(360, 'sine', 0.2, 0.08);

      const startY = botU.y;
      const startX = botU.x;
      const targetY = topU.y;
      const targetX = topU.x + (topU.x > botU.x ? -0.5 : 0.5);
      let elapsed = 0;
      const anim = () => {
        elapsed += 0.06;
        const k = Math.min(1, elapsed / 0.8);
        botU.y = startY + k * (targetY - startY);
        botU.x = startX + k * (targetX - startX);
        if (k < 1) {
          requestAnimationFrame(anim);
        } else {
          botU.y = targetY; botU.x = targetX;
          topU.state = 'idle'; botU.state = 'idle';
          topU.task = null; botU.task = null;
          botU.grounded = ENT.findGround(game, botU.x, botU.y, 0.28);
          topU.grounded = ENT.findGround(game, topU.x, topU.y, 0.28);
          botU.say('上来了，多谢！', 2.0);
          SFX.playConfirm();
          game.hud.banner(`🎉 捞人成功！已将【${botU.name}】拉上高台！`, 'good');
          game.coopActive = false;
          game.hud.dirty = true;
        }
      };
      setTimeout(anim, 200);
      setTimeout(() => { if (game.coopActive) { topU.state = 'idle'; botU.state = 'idle'; topU.task = null; botU.task = null; game.coopActive = false; } }, 2500);
    },

    flingTeammate(game) {
      if (game.coopActive) return;
      const sofi = game.units.find(u => u.id === 'sofi' && u.recruited);
      const throwers = game.available().filter(u => u !== sofi && Math.abs(u.x - 59.5) < 3.2 && Math.abs(u.y - 10) < 1.5);
      if (!sofi || throwers.length < 1) {
        game.hud.banner('需要苏菲拉与至少一名强壮同伴（如阿卡德或艾什）站在断崖边', 'warn');
        return;
      }
      game.coopActive = true;
      game.hideCoopPrompt();
      const thrower = throwers[0];
      thrower.order = null; thrower.path = null; thrower.vx = 0; thrower.facing = 1;
      thrower.task = { type: 'operate', t: 1.4 };
      thrower.say('▲ gha · ! ⇥', 1.5);

      sofi.order = null; sofi.path = null; sofi.vx = 0; sofi.vy = 0; sofi.facing = 1;
      sofi.say('◎ om · ↑ !!', 1.5);
      SFX.playTone(380, 'sawtooth', 0.25, 0.08, 550);

      setTimeout(() => {
        if (!sofi.alive) { game.coopActive = false; return; }
        SFX.playTone(600, 'sine', 0.35, 0.1, 950);
        game.shake(0.2);
        sofi.x = 60.2; sofi.y = 10.3;
        sofi.vx = 5.2; sofi.vy = 6.8;
        sofi.state = 'jump'; sofi.grounded = null;
        game.fx.sparkle(thrower.x + 0.6, thrower.y + 1.2);

        let landed = false;
        const checkLanding = setInterval(() => {
          if (!landed && sofi.x >= 63.5 && sofi.y <= 10.3) {
            landed = true;
            clearInterval(checkLanding);
            sofi.x = 64.5; sofi.y = 10.0;
            sofi.vx = 0; sofi.vy = 0; sofi.state = 'idle';
            sofi.grounded = ENT.findGround(game, sofi.x, sofi.y, 0.35);
            sofi.say('✦ zir-ta ! 🤝', 2.0);
            SFX.playMiracle();
            game.fx.sparkle(sofi.x, sofi.y + 1.0);

            const b = game.builds.find(q => q.id === 'b1');
            if (b) {
              b.done = true;
              b.mesh.visible = true;
              game.rebuildNav = true;
            }
            game.hud.banner('【协力托举】苏菲拉被合力送过断崖，从对岸放下栈桥木板！全员通路畅通！', 'good');
            game.coopActive = false;
          }
        }, 50);
        setTimeout(() => { if (!landed) { clearInterval(checkLanding); game.coopActive = false; } }, 3200);
      }, 500);
    },

    smartCoopOrBuild(game) {
      if (game.coopAction) {
        game.triggerCoopAction();
        return;
      }
      const sel = (game.selection.size ? [...game.selection] : game.available()).filter(u => !u.fainted);
      const hasMat = sel.some(u => u.stack.includes('wood') || u.stack.includes('stone')) ||
                     game.units.some(u => u.recruited && !u.fainted && (u.stack.includes('wood') || u.stack.includes('stone')));
      if (hasMat) {
        game.buildBridgeOrRamp();
      } else {
        game.coopBoostUp();
      }
    },

    // ── 急救与脱力复苏（多元食物分享急救） ──
    firstAidOrRevive(game) {
      const faintedUnit = game.units.find(u => u.recruited && u.fainted);
      if (!faintedUnit) {
        game.hud.banner('当前队伍无人处于饥饿昏迷状态', 'info');
        return;
      }
      const rescuer = (game.selection.size ? [...game.selection] : game.available()).find(u => !u.fainted && Math.abs(u.x - faintedUnit.x) < 3.2) || game.units.find(u => u.recruited && !u.fainted);
      if (!rescuer) return;

      const FOOD_TYPES = (window.LANG && window.LANG.FOOD_TYPES) || {
        meat: { name: '风干熏肉', icon: '🥩', restore: 45 },
        dates: { name: '蜜饯椰枣', icon: '🍯', restore: 32 },
        bread: { name: '烘烤麦饼', icon: '🍞', restore: 25 },
        water: { name: '陶罐甘泉', icon: '💧', restore: 18 }
      };

      // 寻找身处现场（<= 4.0m）且携带口粮的队员
      const nearbyCarriers = game.units.filter(u => u.recruited && !u.fainted && u.stack.some(t => FOOD_TYPES[t]) && Math.hypot(u.x - faintedUnit.x, u.y - faintedUnit.y) <= 4.0);
      const foodCarrier = nearbyCarriers[0] || (rescuer.stack.some(t => FOOD_TYPES[t]) ? rescuer : null);

      if (foodCarrier) {
        const foodItem = foodCarrier.stack.slice().reverse().find(t => FOOD_TYPES[t]);
        const fInfo = FOOD_TYPES[foodItem];
        const fIdx = foodCarrier.stack.lastIndexOf(foodItem);
        foodCarrier.stack.splice(fIdx, 1);
        if (foodCarrier.refreshStack) foodCarrier.refreshStack();
        game.food = Math.min(100, game.food + fInfo.restore);
        faintedUnit.revive();
        const rLang = rescuer.langs[0];
        const healWord = (window.LANG && window.LANG.conlangLex) ? LANG.conlangLex(rLang, 'heal') : 'vita-sur';
        rescuer.say(`${fInfo.icon} ${rLang} ${healWord}! (以${fInfo.name}救护)`);
        game.hud.banner(`💖 【应急急救】${foodCarrier.name} 取出【${fInfo.name}】喂服，${faintedUnit.name} 恢复意识！`, 'good');
        SFX.playMiracle();
      } else if (game.food > 15) {
        game.food -= 15;
        faintedUnit.revive();
        const rLang = rescuer.langs[0];
        rescuer.say(`✋ ${rLang} ! (分食随身口粮)`);
        game.hud.banner(`💖 【应急分食】消耗 15% 随身备用口粮，${faintedUnit.name} 苏醒重返队伍！`, 'good');
        SFX.playMiracle();
      } else {
        game.hud.banner('急救复苏需要靠近伤者并在背包中持有食物（麦饼/熏肉/椰枣/泉水皆可）！', 'warn');
        SFX.playTone(200, 'square', 0.2, 0.05);
      }
    }
  };

  window.CoopActions = CoopActions;
})();
