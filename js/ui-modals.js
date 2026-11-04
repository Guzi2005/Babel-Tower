// ═══════════════════════════════════════════════════════════════════════════════
// UI 模态交互系统 (UIModals)：纸娃娃角色定制面板与行商以物易物货栈
// 从主 Game 引擎类彻底解耦，提供独立的 DOM 管理、事件绑定与渲染控制
// ═══════════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const UIModals = {
    // ─────────────── 纸娃娃外貌装束定制面板 (Paper Doll Customizer) ───────────────
    PaperDoll: {
      ensure(game) {
        let modal = $('paperdoll-modal');
        if (modal) return modal;
        modal = document.createElement('div');
        modal.id = 'paperdoll-modal';
        modal.className = 'paperdoll-modal-overlay';
        modal.innerHTML = `
          <div class="paperdoll-modal-box">
            <div class="paperdoll-modal-header">
              <div class="pd-header-title-row">
                <span style="font-size: 20px;">🎨</span>
                <h2>泥版人事名录 · 纸娃娃外貌装束定制</h2>
                <span class="pd-header-badge">远古风貌 · 角色纸娃娃系统</span>
              </div>
              <button class="pd-close-btn" id="btn-close-paperdoll" title="关闭 (Esc)">✕</button>
            </div>
            <div class="paperdoll-modal-body">
              <!-- 左侧：128x128 像素画实时预览 -->
              <div class="paperdoll-preview-col">
                <div class="pd-avatar-box">
                  <canvas id="pd-preview-canvas" class="pd-avatar-canvas" width="128" height="128"></canvas>
                </div>
                <div id="pd-unit-name" class="pd-unit-name">艾什</div>
                <div id="pd-unit-sub" class="pd-unit-sub">学者 · 智慧宫抄写员</div>
                <div id="pd-unit-langs" class="pd-unit-langs"></div>
              </div>
              <!-- 右侧：分类定制控制面板 -->
              <div class="paperdoll-controls-col" id="pd-controls-col">
              </div>
            </div>
            <div class="paperdoll-modal-footer">
              <div class="pd-footer-left">
                <button class="pd-btn-action pd-btn-secondary" id="btn-pd-random">🎲 随机全套外貌</button>
                <button class="pd-btn-action pd-btn-secondary" id="btn-pd-reset">✨ 恢复原典立绘</button>
              </div>
              <div class="pd-footer-right">
                <button class="pd-btn-action pd-btn-primary" id="btn-pd-confirm">💾 确认并关闭</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        $('btn-close-paperdoll').onclick = () => this.close(game);
        $('btn-pd-confirm').onclick = () => this.close(game);
        modal.onclick = (e) => { if (e.target === modal) this.close(game); };
        $('btn-pd-random').onclick = () => {
          if (!game.editingUnit) return;
          game.editingUnit.rerollAppearance();
          game.hud.dirty = true;
          this.render(game, game.editingUnit);
          if (window.SFX && SFX.playTone) SFX.playTone(520, 'sine', 0.12, 0.05);
        };
        $('btn-pd-reset').onclick = () => {
          if (!game.editingUnit) return;
          const u = game.editingUnit;
          const def = (LANG.MEMBERS && LANG.MEMBERS[u.id]) || (LANG.ARCHETYPES && LANG.ARCHETYPES[u.role]);
          if (def && def.pal) {
            u.setAppearance(def.pal);
          } else {
            u.rerollAppearance();
          }
          game.hud.dirty = true;
          this.render(game, u);
          if (window.SFX && SFX.playConfirm) SFX.playConfirm();
        };
        return modal;
      },

      open(game, unit) {
        if (!unit) return;
        game.editingUnit = unit;
        const modal = this.ensure(game);
        modal.classList.add('active');
        this.render(game, unit);
        if (window.SFX && SFX.playParchment) SFX.playParchment();
      },

      close(game) {
        const modal = $('paperdoll-modal');
        if (modal) modal.classList.remove('active');
        game.editingUnit = null;
        if (window.SFX && SFX.playUIClick) SFX.playUIClick();
      },

      render(game, u) {
        if (!u) u = game.editingUnit;
        if (!u) return;

        const nameEl = $('pd-unit-name');
        if (nameEl) nameEl.textContent = u.name;
        const subEl = $('pd-unit-sub');
        if (subEl) subEl.textContent = `${u.role || '探险队员'} · ${u.roleDesc || '巴别通天队'}`;
        const langWrap = $('pd-unit-langs');
        if (langWrap) {
          langWrap.innerHTML = '';
          (u.langs || []).forEach(l => {
            const span = document.createElement('span');
            span.textContent = l;
            span.style.color = (LANG.LANGS && LANG.LANGS[l] && LANG.LANGS[l].color) || '#ffd24a';
            langWrap.appendChild(span);
          });
        }

        this.drawPreview(game, u);
        this.renderControls(game, u);
      },

      drawPreview(game, u) {
        const cv = $('pd-preview-canvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, 128, 128);
        ctx.imageSmoothingEnabled = false;

        // 阴影基座
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(64, 116, 32, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 离屏渲染纸娃娃角色 (16x24 -> 80x120 居中)
        const off = document.createElement('canvas');
        off.width = 16; off.height = 24;
        const offCtx = off.getContext('2d');
        if (PX.drawChar) PX.drawChar(offCtx, u.pal, 'stand', 0, false);
        else if (PX.drawBody) PX.drawBody(offCtx, u.pal, 'stand', 0, false);

        ctx.drawImage(off, 24, 2, 80, 120);
      },

      renderControls(game, u) {
        const col = $('pd-controls-col');
        if (!col) return;
        col.innerHTML = '';

        const makeSection = (title, icon) => {
          const sec = document.createElement('div');
          sec.className = 'pd-section';
          const t = document.createElement('div');
          t.className = 'pd-section-title';
          t.innerHTML = `<span>${icon} ${title}</span>`;
          sec.appendChild(t);
          return sec;
        };

        const triggerChange = () => {
          u.palVersion = (u.palVersion || 0) + 1;
          u.dirty = true; u.drawKey = '';
          game.hud.dirty = true;
          this.drawPreview(game, u);
          if (window.SFX && SFX.playUIClick) SFX.playUIClick();
        };

        // 1. 肤色
        const secSkin = makeSection('肤色 (Historical Skin Tones)', '🎨');
        const rowSkin = document.createElement('div');
        rowSkin.className = 'pd-swatch-row';
        (LANG.SKINS || []).forEach(s => {
          const sw = document.createElement('div');
          sw.className = 'pd-swatch' + (u.pal.skin === s.hex ? ' active' : '');
          sw.style.backgroundColor = s.hex;
          sw.title = `${s.name} (${s.id})`;
          sw.onclick = () => {
            u.pal.skin = s.hex;
            rowSkin.querySelectorAll('.pd-swatch').forEach(x => x.classList.remove('active'));
            sw.classList.add('active');
            triggerChange();
          };
          rowSkin.appendChild(sw);
        });
        secSkin.appendChild(rowSkin);
        col.appendChild(secSkin);

        // 2. 头饰与发型
        const secHat = makeSection('头饰与发型 (Headwear & Hairstyles)', '👑');
        const rowHat = document.createElement('div');
        rowHat.className = 'pd-pill-row';
        (LANG.HATS || []).forEach(h => {
          const pill = document.createElement('div');
          const active = (u.pal.hat || 'none') === h.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = h.name;
          pill.title = h.id;
          pill.onclick = () => {
            u.pal.hat = h.id;
            rowHat.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowHat.appendChild(pill);
        });
        secHat.appendChild(rowHat);
        col.appendChild(secHat);

        // 3. 发色
        const secHair = makeSection('发色 (Hair Color Tones)', '💇');
        const rowHair = document.createElement('div');
        rowHair.className = 'pd-swatch-row';
        (LANG.HAIRS || []).forEach(h => {
          const sw = document.createElement('div');
          sw.className = 'pd-swatch' + (u.pal.hairColor === h.hex ? ' active' : '');
          sw.style.backgroundColor = h.hex;
          sw.title = `${h.name} (${h.id})`;
          sw.onclick = () => {
            u.pal.hairColor = h.hex;
            rowHair.querySelectorAll('.pd-swatch').forEach(x => x.classList.remove('active'));
            sw.classList.add('active');
            triggerChange();
          };
          rowHair.appendChild(sw);
        });
        secHair.appendChild(rowHair);
        col.appendChild(secHair);

        // 4. 五官眼神
        const secEye = makeSection('五官眼神 (Eye Expression & Kohl Liner)', '👁️');
        const rowEye = document.createElement('div');
        rowEye.className = 'pd-pill-row';
        (LANG.EYE_STYLES || []).forEach(e => {
          const pill = document.createElement('div');
          const active = (u.pal.eyeStyle || 'normal') === e.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = e.name;
          pill.title = e.id;
          pill.onclick = () => {
            u.pal.eyeStyle = e.id;
            rowEye.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowEye.appendChild(pill);
        });
        secEye.appendChild(rowEye);
        col.appendChild(secEye);

        // 5. 眉形
        const secBrow = makeSection('眉形 (Eyebrow Shape)', '〰️');
        const rowBrow = document.createElement('div');
        rowBrow.className = 'pd-pill-row';
        (LANG.BROW_STYLES || []).forEach(b => {
          const pill = document.createElement('div');
          const active = (u.pal.browStyle || 'straight') === b.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = b.name;
          pill.title = b.id;
          pill.onclick = () => {
            u.pal.browStyle = b.id;
            rowBrow.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowBrow.appendChild(pill);
        });
        secBrow.appendChild(rowBrow);
        col.appendChild(secBrow);

        // 6. 胡须
        const secBeard = makeSection('胡须美髯 (Beard & Moustache)', '🧔');
        const rowBeard = document.createElement('div');
        rowBeard.className = 'pd-pill-row';
        (LANG.BEARDS || []).forEach(b => {
          const pill = document.createElement('div');
          const active = (u.pal.beard || 'clean') === b.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = b.name;
          pill.title = b.id;
          pill.onclick = () => {
            u.pal.beard = b.id;
            rowBeard.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowBeard.appendChild(pill);
        });
        secBeard.appendChild(rowBeard);
        col.appendChild(secBeard);

        // 7. 仪式面纹
        const secMark = makeSection('仪式面纹与祭司印记 (Ritual Facial Markings)', '✨');
        const rowMark = document.createElement('div');
        rowMark.className = 'pd-pill-row';
        (LANG.FACE_MARKS || []).forEach(m => {
          const pill = document.createElement('div');
          const active = (u.pal.faceMark || 'none') === m.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = m.name;
          pill.title = m.id;
          pill.onclick = () => {
            u.pal.faceMark = m.id;
            rowMark.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowMark.appendChild(pill);
        });
        secMark.appendChild(rowMark);
        col.appendChild(secMark);

        // 8. 服装形制
        const secOutfit = makeSection('服装形制 (Ancient Outfits & Armor)', '👘');
        const rowOutfit = document.createElement('div');
        rowOutfit.className = 'pd-pill-row';
        (LANG.OUTFIT_TYPES || []).forEach(o => {
          const pill = document.createElement('div');
          const active = (u.pal.outfitType || 'tunic') === o.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = o.name;
          pill.title = o.id;
          pill.onclick = () => {
            u.pal.outfitType = o.id;
            rowOutfit.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowOutfit.appendChild(pill);
        });
        secOutfit.appendChild(rowOutfit);
        col.appendChild(secOutfit);

        // 9. 鞋履
        const secFoot = makeSection('鞋履 (Footwear)', '👞');
        const rowFoot = document.createElement('div');
        rowFoot.className = 'pd-pill-row';
        (LANG.FOOTWEARS || []).forEach(f => {
          const pill = document.createElement('div');
          const active = (u.pal.footwear || 'sandals') === f.id;
          pill.className = 'pd-pill' + (active ? ' active' : '');
          pill.textContent = f.name;
          pill.title = f.id;
          pill.onclick = () => {
            u.pal.footwear = f.id;
            rowFoot.querySelectorAll('.pd-pill').forEach(x => x.classList.remove('active'));
            pill.classList.add('active');
            triggerChange();
          };
          rowFoot.appendChild(pill);
        });
        secFoot.appendChild(rowFoot);
        col.appendChild(secFoot);
      }
    },

    // ─────────────── 行脚集市 · 以物易物货栈 (Caravan Trade Modal) ───────────────
    Trade: {
      open(game, merchant) {
        if (!merchant) merchant = game.units.find(u => u.isMerchant) || { name: '纳布·辛', role: '行脚商人', langs: ['⚖️', '☼'] };
        if (game.tradeModalEl) this.close(game);

        const el = document.createElement('div');
        el.id = 'trade-modal';
        el.className = 'pixel-trade-modal';
        el.innerHTML = `
          <div class="trade-box">
            <div class="trade-header">
              <span class="trade-title">⚖️ 行商集市 · 以物易物货栈</span>
              <button class="trade-close" id="trade-btn-close">✕</button>
            </div>
            <div class="trade-merchant-info">
              <div class="merchant-name">【${merchant.name}】 ${merchant.role}</div>
              <div class="merchant-speech">“愿高塔之光庇佑你的队伍！长途跋涉口粮告急？还是修桥缺木石？行商货栈支持以物易物，等价交换！”</div>
            </div>
            <div class="trade-list">
              <div class="trade-item" data-deal="wood_for_bread">
                <div class="trade-desc">🪵 1 根木材 ➔ 🥖 2 份口粮麦饼</div>
                <button class="trade-action-btn" id="deal-wood-bread">兑换口粮</button>
              </div>
              <div class="trade-item" data-deal="stone_for_meat">
                <div class="trade-desc">🪨 1 块石料 ➔ 🥩 2 份熏羊肉干</div>
                <button class="trade-action-btn" id="deal-stone-meat">兑换肉干</button>
              </div>
              <div class="trade-item" data-deal="dates_for_water">
                <div class="trade-desc">🌴 1 串椰枣 ➔ 💧 2 袋清澈甘泉</div>
                <button class="trade-action-btn" id="deal-dates-water">兑换甘泉</button>
              </div>
              <div class="trade-item" data-deal="food_for_wood">
                <div class="trade-desc">🥖 2 份口粮 ➔ 🪵 1 根急造木材</div>
                <button class="trade-action-btn" id="deal-food-wood">急换工料</button>
              </div>
            </div>
            <div class="trade-footer">
              <span class="trade-status-text">当前队伍备粮: ${Math.round(game.food)}%</span>
              <span class="trade-tip">按 ESC 或点击 ✕ 关闭</span>
            </div>
          </div>
        `;
        document.body.appendChild(el);
        game.tradeModalEl = el;

        $('trade-btn-close').onclick = () => this.close(game);
        $('deal-wood-bread').onclick = () => this.execute(game, 'wood_for_bread', merchant);
        $('deal-stone-meat').onclick = () => this.execute(game, 'stone_for_meat', merchant);
        $('deal-dates-water').onclick = () => this.execute(game, 'dates_for_water', merchant);
        $('deal-food-wood').onclick = () => this.execute(game, 'food_for_wood', merchant);

        SFX.playTone(440, 'sine', 0.15, 0.08, 600);
        if (merchant.say) merchant.say('⚖️ ☼ ka-rem ! 欢迎光临！', 2.0);
      },

      close(game) {
        if (game.tradeModalEl) {
          game.tradeModalEl.remove();
          game.tradeModalEl = null;
        }
      },

      execute(game, deal, merchant) {
        const recruited = game.units.filter(u => u.recruited && !u.fainted);
        const mX = merchant ? merchant.x : 13.5;
        const mY = merchant ? merchant.y : 0;

        if (deal === 'wood_for_bread') {
          const u = recruited.find(q => q.stack.includes('wood'));
          if (!u) {
            game.hud.banner('队伍中无人背负木材，无法换取麦饼', 'warn');
            SFX.playTone(160, 'square', 0.15, 0.05);
            return;
          }
          const idx = u.stack.lastIndexOf('wood');
          u.stack.splice(idx, 1);
          u.refreshStack();
          game.food = Math.min(100, game.food + 25);
          game.spawnItem('bread', mX - 0.8, mY + 0.3);
          game.spawnItem('bread', mX + 0.8, mY + 0.3);
          SFX.playMiracle();
          game.hud.banner('【交易成功】消耗 1 根木材，换取 2 份香脆麦饼！饱食度恢复！', 'good');
          if (merchant && merchant.say) merchant.say('⚖️ 麦饼已备妥，一路顺风！', 2.0);
        } else if (deal === 'stone_for_meat') {
          const u = recruited.find(q => q.stack.includes('stone'));
          if (!u) {
            game.hud.banner('队伍中无人背负石料，无法换取羊肉干', 'warn');
            SFX.playTone(160, 'square', 0.15, 0.05);
            return;
          }
          const idx = u.stack.lastIndexOf('stone');
          u.stack.splice(idx, 1);
          u.refreshStack();
          game.food = Math.min(100, game.food + 30);
          game.spawnItem('meat', mX - 0.8, mY + 0.3);
          game.spawnItem('meat', mX + 0.8, mY + 0.3);
          SFX.playMiracle();
          game.hud.banner('【交易成功】消耗 1 块石料，换取 2 份精制熏肉干！', 'good');
          if (merchant && merchant.say) merchant.say('⚖️ 上好的特制风干肉脯！', 2.0);
        } else if (deal === 'dates_for_water') {
          const u = recruited.find(q => q.stack.includes('dates'));
          if (!u) {
            game.hud.banner('队伍中无人背负椰枣，无法换取甘泉水袋', 'warn');
            SFX.playTone(160, 'square', 0.15, 0.05);
            return;
          }
          const idx = u.stack.lastIndexOf('dates');
          u.stack.splice(idx, 1);
          u.refreshStack();
          game.food = Math.min(100, game.food + 20);
          game.spawnItem('water', mX - 0.8, mY + 0.3);
          game.spawnItem('water', mX + 0.8, mY + 0.3);
          SFX.playMiracle();
          game.hud.banner('【交易成功】消耗 1 串椰枣，换得 2 袋清冽甘泉！', 'good');
          if (merchant && merchant.say) merchant.say('⚖️ 清冽的绿洲活泉！', 2.0);
        } else if (deal === 'food_for_wood') {
          const foodUsers = recruited.filter(q => q.stack.some(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water'));
          let foodFound = 0;
          for (const u of foodUsers) {
            while (foodFound < 2 && u.stack.some(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water')) {
              const idx = u.stack.findIndex(t => t === 'bread' || t === 'meat' || t === 'dates' || t === 'water');
              u.stack.splice(idx, 1);
              u.refreshStack();
              foodFound++;
            }
            if (foodFound >= 2) break;
          }
          if (foodFound < 2) {
            if (game.food >= 30) {
              game.food -= 22;
              foodFound = 2;
            }
          }
          if (foodFound < 2) {
            game.hud.banner('全队口粮不足 2 份，无法急换工料原木', 'warn');
            SFX.playTone(160, 'square', 0.15, 0.05);
            return;
          }
          game.spawnItem('wood', mX, mY + 0.3);
          SFX.playPickUp();
          game.hud.banner('【交易成功】消耗口粮，急换 1 根工料原木！已送达商摊脚边！', 'good');
          if (merchant && merchant.say) merchant.say('⚖️ 质地上乘的雪松原木交付！', 2.0);
        }
        if (game.tradeModalEl) {
          const statusEl = game.tradeModalEl.querySelector('.trade-status-text');
          if (statusEl) statusEl.textContent = `当前队伍备粮: ${Math.round(game.food)}%`;
        }
        game.hud.dirty = true;
      }
    }
  };

  window.UIModals = UIModals;
})();
