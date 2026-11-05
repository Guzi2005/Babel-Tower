// Babel Tower: Organic Audio System with CC0 Foley, Constructed Language Vocal Synth & "Pebble Dialectic" Lute/Harp BGM
(function () {
  'use strict';

  // ─────────────────────── 造语专有声学共振峰与音素表 ───────────────────────
  // 基于人类声道滤波 F1/F2，并匹配造语词汇：
  // ☼ 日辉语: sol, ka, rem, ash, soru
  // ♒ 潮汐语: wa, lu, nn, olo
  // ▲ 岩脊语: tor, gha, ul, dun
  // ◎ 环音语: om, en, ii, yoo
  // ✦ 星屑语: zir, e', ta, ses
  const PHONEME_MAP = {
    // 日辉语音素
    sol:  { vowel: 'o', cons: 's', glide: 'l', pitchMod: 1.05 },
    ka:   { vowel: 'a', cons: 'k', pitchMod: 1.0 },
    rem:  { vowel: 'e', cons: 'r', glide: 'm', pitchMod: 0.94 },
    ash:  { vowel: 'a', cons: 'sh', pitchMod: 1.02 },
    so:   { vowel: 'o', cons: 's', pitchMod: 1.0 },
    ru:   { vowel: 'u', cons: 'r', pitchMod: 0.92 },
    soru: { vowel: 'o', cons: 's', pitchMod: 0.98 },

    // 潮汐语音素
    wa:   { vowel: 'a', cons: 'w', pitchMod: 0.96 },
    lu:   { vowel: 'u', cons: 'l', pitchMod: 1.04 },
    nn:   { vowel: 'm', cons: 'n', pitchMod: 0.88 },
    olo:  { vowel: 'o', cons: 'l', pitchMod: 1.0 },

    // 岩脊语音素
    tor:  { vowel: 'o', cons: 't', glide: 'r', pitchMod: 0.92 },
    gha:  { vowel: 'a', cons: 'gh', pitchMod: 0.88 },
    ul:   { vowel: 'u', cons: 'l', pitchMod: 0.95 },
    dun:  { vowel: 'u', cons: 'd', glide: 'n', pitchMod: 0.86 },

    // 环音语音素
    om:   { vowel: 'o', cons: 'm', pitchMod: 0.95 },
    en:   { vowel: 'e', cons: 'n', pitchMod: 1.02 },
    ii:   { vowel: 'i', cons: 'h', pitchMod: 1.10 },
    yoo:  { vowel: 'o', cons: 'y', pitchMod: 1.06 },

    // 星屑语音素
    zir:  { vowel: 'i', cons: 'z', glide: 'r', pitchMod: 1.12 },
    ta:   { vowel: 'a', cons: 't', pitchMod: 1.0 },
    ses:  { vowel: 'e', cons: 's', pitchMod: 1.04 }
  };

  const VOWEL_FORMANTS = {
    a: { f1: 760, f2: 1280, q1: 5.5, q2: 6.0 }, // [a] 爸/卡
    e: { f1: 530, f2: 1880, q1: 5.0, q2: 6.5 }, // [e] 蕾/恩
    i: { f1: 290, f2: 2320, q1: 6.0, q2: 7.5 }, // [i] 兹/伊
    o: { f1: 490, f2: 920,  q1: 5.0, q2: 5.5 }, // [o] 索/托
    u: { f1: 340, f2: 780,  q1: 5.5, q2: 5.5 }, // [u] 鲁/顿
    m: { f1: 260, f2: 1100, q1: 7.0, q2: 7.0 }  // [m/n] 鼻音哼鸣
  };

  // 角色专属人声特质
  const BABBLE_PROFILES = {
    ash:  { pitch: 265, jitter: 0.12, speed: 0.092, gap: 0.024, vibrato: 0,   plosiveWeight: 1.0 },
    akad: { pitch: 138, jitter: 0.08, speed: 0.118, gap: 0.034, vibrato: 0,   plosiveWeight: 1.35 },
    bani: { pitch: 355, jitter: 0.18, speed: 0.076, gap: 0.018, vibrato: 0,   plosiveWeight: 0.9 },
    sofi: { pitch: 510, jitter: 0.10, speed: 0.135, gap: 0.028, vibrato: 5.2, plosiveWeight: 0.6 },
    io:   { pitch: 115, jitter: 0.07, speed: 0.140, gap: 0.040, vibrato: 3.8, plosiveWeight: 1.2 }
  };

  const SAMPLE_DEFS = {
    click: '/audio/click.wav',
    confirm: '/audio/confirm.wav',
    pickup: '/audio/pickup.wav',
    rune_glass: '/audio/rune_glass.wav',
    switch: '/audio/switch.wav',
    step_stone_0: '/audio/step_stone_0.ogg',
    step_stone_1: '/audio/step_stone_1.ogg',
    step_wood_0: '/audio/step_wood_0.ogg',
    hammer: '/audio/hammer.ogg',
    drop: '/audio/drop.ogg',
    plate_heavy: '/audio/plate_heavy.ogg',
    bell_miracle: '/audio/bell_miracle.ogg',
    quake_thud: '/audio/quake_thud.ogg',
    gate_open: '/audio/gate_open.ogg',
    gate_close: '/audio/gate_close.ogg',
    creak: '/audio/creak.ogg',
    lever: '/audio/lever.ogg'
  };

  class SoundSystem {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.bgmEnabled = true;
      this.buffers = new Map();
      this.loading = false;
      this.loaded = false;
      this.lastStepTime = 0;
      this.lastBabbleCancel = null;

      // 总线路由
      this.masterGain = null;
      this.voiceGain = null;
      this.sfxGain = null;
      this.bgmGain = null;

      // BGM 调度器与五大主题曲库轮播
      this.bgmRunning = false;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.bgmNextTime = 0;
      this.chapter = 0;
      this.currentTrackIndex = 0;
      this.trackPlayTimer = 0;
      this.autoRotateEnabled = true;
      this.trackDurationLimit = 90; // 轮播周期：每首古朴乐章巡回 90 秒自然切歌
      this.onTrackChange = null;
      this.tracks = [
        { id: 0, title: '序章·埃尔遗迹《大地的扬尘》', mode: 'A Aeolian 76 BPM', scene: '荒原绿洲与聚落', author: '古朴鲁特琴低吟' },
        { id: 1, title: '第 1 章·索勒斯水道《水车与奔流》', mode: 'D Dorian 88 BPM', scene: '塔基与螺旋回廊', author: '晶莹竖琴水轮琶音' },
        { id: 2, title: '第 2 章·云之回廊《断崖索道》', mode: 'E Phrygian 80 BPM', scene: '悬崖索道与云海', author: '弗里吉亚绝壁风弦与陶笛' },
        { id: 3, title: '第 3 章·圣书图书馆《卵石论战·开源》', mode: 'D Dorian 84 BPM', scene: '圣书智库与内殿', author: '巴洛克对位哲学论辩' },
        { id: 4, title: '终章·通天巴别顶《人类的誓约·上帝之手》', mode: 'D Major 78 BPM', scene: '巴别天顶·星河神界', author: '辉煌复调星辰破晓' }
      ];
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();

          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);

          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
          this.sfxGain.connect(this.masterGain);

          this.voiceGain = this.ctx.createGain();
          this.voiceGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
          this.voiceGain.connect(this.masterGain);

          this.bgmGain = this.ctx.createGain();
          this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
          this.bgmGain.connect(this.masterGain);

          this.loadAllSamples();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    async loadAllSamples() {
      if (this.loading || this.loaded || !this.ctx) return;
      this.loading = true;
      const entries = Object.entries(SAMPLE_DEFS);
      await Promise.all(entries.map(async ([key, url]) => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const ab = await resp.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(ab);
          this.buffers.set(key, buf);
        } catch (e) {}
      }));
      this.loaded = true;
      this.loading = false;
    }

    // ─────────────────────── 开源真实物理采样 ───────────────────────
    playSample(name, opts = {}) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const buf = this.buffers.get(name);
      if (!buf) return;

      const vol = opts.vol !== undefined ? opts.vol : 0.6;
      const pitch = opts.pitch !== undefined ? opts.pitch : 1.0;
      const jitter = opts.jitter !== undefined ? opts.jitter : 0.05;

      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;

      const rate = pitch * (1 + (Math.random() - 0.5) * jitter);
      src.playbackRate.setValueAtTime(Math.max(0.3, Math.min(3.0, rate)), now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.008);

      src.connect(gain);
      gain.connect(this.sfxGain || this.masterGain || this.ctx.destination);

      src.start(now);
      return src;
    }

    // 涉水脚步与水花声效（水泡瞬态音 + 过滤水花白噪）
    playWade(opts = {}) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const vol = opts.vol !== undefined ? opts.vol : 0.38;

      // 1. 水花低频气泡/水团瞬态 (Bubble Bloop sweep)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const baseFreq = 380 + Math.random() * 80;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(140, baseFreq * 0.45), now + 0.11);

      oscGain.gain.setValueAtTime(vol * 0.7, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain || ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);

      // 2. 水花溅散过滤白噪 (Filtered splash noise)
      this.createNoiseBurst(now, 0.14, 850 + Math.random() * 300);
    }

    // 沙地脚步声（松软沙粒微沙摩擦）
    playSandStep(opts = {}) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      this.createNoiseBurst(this.ctx.currentTime, 0.09, 450 + Math.random() * 150);
    }

    // 脚步声（石地/木板/水面/沙地）
    playStep(material = 'stone') {
      const now = performance.now();
      if (now - this.lastStepTime < 140) return;
      this.lastStepTime = now;

      if (material === 'water' || material === 'wade') {
        this.playWade({ vol: 0.38 });
      } else if (material === 'sand') {
        this.playSandStep({ vol: 0.28 });
      } else if (material === 'wood') {
        this.playSample('step_wood_0', { vol: 0.36, pitch: 1.05, jitter: 0.08 });
      } else {
        const pick = Math.random() < 0.5 ? 'step_stone_0' : 'step_stone_1';
        this.playSample(pick, { vol: 0.40, pitch: 1.0, jitter: 0.08 });
      }
    }

    playPickUp() {
      this.playSample('pickup', { vol: 0.48, pitch: 1.1, jitter: 0.05 });
    }

    playDrop() {
      this.playSample('drop', { vol: 0.46, pitch: 0.95, jitter: 0.06 });
    }

    playBuildHammer() {
      this.playSample('hammer', { vol: 0.52, pitch: 1.0, jitter: 0.1 });
    }

    // 重力踏板：沉重石板碰撞 + 卡扣，彻底去除金属摇铃杂音
    playPlateClick() {
      this.playSample('plate_heavy', { vol: 0.60, pitch: 1.0, jitter: 0.03 });
      setTimeout(() => this.playSample('switch', { vol: 0.22, pitch: 1.2 }), 40);
    }

    playLever() {
      this.playSample('lever', { vol: 0.52, pitch: 1.0 });
    }

    playGate(open = true) {
      this.playSample(open ? 'gate_open' : 'gate_close', { vol: 0.52, pitch: 1.0 });
    }

    playGateOpen() {
      this.playGate(true);
    }

    playGateClose() {
      this.playGate(false);
    }

    playCreak() {
      this.playSample('creak', { vol: 0.38, pitch: 1.0, jitter: 0.08 });
    }

    // 彻底重构【语言中介传递链】：摒弃金属散币摇晃声，改为古朴优雅的【竖琴/古拨弦五声音阶】（D-F-A-C-D）
    playLanguageHop(lang, hopIndex = 0) {
      const pentatonic = [293.66, 349.23, 440.0, 523.25, 587.33, 698.46]; // D4, F4, A4, C5, D5, F5
      const freq = pentatonic[Math.min(hopIndex, pentatonic.length - 1)];
      this.playPluckedString(freq, 'harp', { vol: 0.28, duration: 1.1 });
    }

    // 收集符文：清澈透明的水晶泛音，摒弃刺耳摇铃声
    playRelicPickup() {
      this.playSample('rune_glass', { vol: 0.62, pitch: 1.0 });
      this.playPluckedString(587.33, 'harp', { vol: 0.30, duration: 1.4 }); // D5
      setTimeout(() => this.playPluckedString(880.0, 'harp', { vol: 0.24, duration: 1.2 }), 80); // A5
    }

    // 神迹与通关：浑厚深远的远古青铜钟鸣 + 和弦
    playMiracle() {
      this.playSample('bell_miracle', { vol: 0.68, pitch: 1.0 });
      this.playPluckedString(293.66, 'lute', { vol: 0.35, duration: 2.2 }); // D4
      setTimeout(() => this.playPluckedString(440.0, 'harp', { vol: 0.30, duration: 2.0 }), 120); // A4
      setTimeout(() => this.playPluckedString(587.33, 'harp', { vol: 0.28, duration: 2.0 }), 240); // D5
    }

    playThunder() {
      this.playSample('quake_thud', { vol: 0.82, pitch: 0.9, jitter: 0.05 });
    }

    playUIClick() {
      this.playSample('click', { vol: 0.42, pitch: 1.0 });
    }

    playUIConfirm() {
      this.playSample('confirm', { vol: 0.48, pitch: 1.0 });
    }

    playConfirm() {
      this.playUIConfirm();
    }

    playRallyCommand() {
      this.playSample('confirm', { vol: 0.55, pitch: 1.1 });
      this.playPluckedString(440.0, 'lute', { vol: 0.35, duration: 1.4 });
    }

    playParchment() {
      this.playSample('click', { vol: 0.28, pitch: 0.85 });
    }

    playTone(freq, type = 'sine', duration = 0.18, vol = 0.12) {
      if (!this.enabled) return;
      this.init();
      if (freq < 240) {
        this.playSample('drop', { vol: Math.min(0.5, vol * 2.5), pitch: 0.9 });
      } else if (freq < 450) {
        this.playSample('click', { vol: Math.min(0.42, vol * 2.5), pitch: freq / 350 });
      } else {
        this.playPluckedString(freq, 'harp', { vol: Math.min(0.35, vol * 2), duration });
      }
    }

    // ─────────────────────── “贴近造语” 真实人声共振峰合成器 ───────────────────────
    // 将台词直接解析为造语音节（sol, ka, rem, tor, gha, dun, wa, lu, om, en, yoo, zir, ta, ses）
    playBabble(speakerId, text = '', opts = {}) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;

      const prof = BABBLE_PROFILES[speakerId] || BABBLE_PROFILES.ash;

      if (this.lastBabbleCancel && !opts.keepPrev) {
        this.lastBabbleCancel();
      }
      let isCancelled = false;
      this.lastBabbleCancel = () => { isCancelled = true; };

      // 1. 过滤掉括号内的中文辅助说明（如“（艾什指向那座看不见顶的塔）”）
      const clean = (text || '').replace(/[\(（][^\)）]*[\)）]/g, '').trim();

      // 2. 提取台词中的造语单词/音节
      let tokens = clean
        .replace(/[☼♒▲◎✦⚙⛓️↑↓→⇡⇣⚒⇥⊻✋⌂]/g, ' ')
        .replace(/[^a-zA-Z'~·\-\s]/g, ' ')
        .split(/[\s·\-]+/)
        .map(s => s.toLowerCase().trim())
        .filter(s => s && s.length >= 2);

      // 若未提取到有效造语（纯中文或符号），使用该角色常用造语兜底
      if (!tokens.length) {
        if (speakerId === 'ash') tokens = ['sol', 'ka', 'rem'];
        else if (speakerId === 'akad') tokens = ['tor', 'gha', 'dun'];
        else if (speakerId === 'bani') tokens = ['wa', 'lu', 'olo'];
        else if (speakerId === 'sofi') tokens = ['om', 'en', 'yoo'];
        else if (speakerId === 'io') tokens = ['zir', 'ta', 'ses'];
        else tokens = ['sol', 'wa', 'tor'];
      }

      // 将复杂复合词拆分为单个造语音节
      const syllables = [];
      tokens.forEach(tok => {
        if (tok === 'soru') { syllables.push('so', 'ru'); }
        else if (tok === 'wawa') { syllables.push('wa', 'wa'); }
        else if (tok === 'piki') { syllables.push('bi', 'ka'); }
        else if (tok === 'gulu') { syllables.push('gha', 'lu'); }
        else { syllables.push(tok); }
      });

      const maxCount = Math.min(6, Math.max(2, syllables.length));
      const chosen = syllables.slice(0, maxCount);

      const hasQuestion = text.includes('?') || text.includes('？') || text.includes('↑');
      const hasExclaim = text.includes('!') || text.includes('！');

      const now = this.ctx.currentTime;
      let timeOffset = 0;

      chosen.forEach((sylKey, i) => {
        const isLast = (i === chosen.length - 1);
        const def = PHONEME_MAP[sylKey] || { vowel: sylKey[sylKey.length - 1] || 'a', cons: sylKey[0] || 'w', pitchMod: 1.0 };
        const formant = VOWEL_FORMANTS[def.vowel] || VOWEL_FORMANTS.a;

        let pitch = prof.pitch * def.pitchMod * (1 + (Math.random() - 0.5) * prof.jitter);
        if (isLast && hasQuestion) pitch *= 1.28; // 问句/向上指示：尾音明显上挑
        if (isLast && hasExclaim) pitch *= 0.86;  // 叹句：坚决下沉

        const sylDur = prof.speed * (0.95 + Math.random() * 0.15);
        const startTime = now + timeOffset;

        this.synthesizeConstructedSyllable(startTime, sylDur, pitch, formant, def, prof);
        timeOffset += sylDur + prof.gap;
      });
    }

    // 核心造语音节拟真发生器
    synthesizeConstructedSyllable(startTime, duration, pitch, formant, def, prof) {
      if (!this.ctx) return;
      const ctx = this.ctx;

      // 声带微振动源
      const osc = ctx.createOscillator();
      osc.type = (prof.pitch < 180) ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(pitch * 0.95, startTime);
      osc.frequency.exponentialRampToValueAtTime(pitch, startTime + duration * 0.3);

      // 苏菲拉 / 伊奥的柔和揉弦与唱腔
      if (prof.vibrato > 0) {
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(prof.vibrato, startTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(pitch * 0.04, startTime);
        lfo.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }

      // 口腔与咽喉共振峰滤波（F1 与 F2 双带通共鸣）
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.setValueAtTime(formant.f1, startTime);
      f1.Q.setValueAtTime(formant.q1, startTime);

      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.setValueAtTime(formant.f2, startTime);
      f2.Q.setValueAtTime(formant.q2, startTime);

      // 辅音开唇声与摩擦瞬态（s, k, t, z, gh, w, d）
      if (def.cons === 's' || def.cons === 'z' || def.cons === 'sh') {
        const noise = this.createNoiseBurst(startTime, 0.024, def.cons === 'z' ? 2400 : 3800);
        noise.connect(this.voiceGain || this.masterGain || ctx.destination);
      } else if (def.cons === 'k' || def.cons === 't' || def.cons === 'd' || def.cons === 'gh') {
        f1.frequency.setValueAtTime(formant.f1 * 0.65, startTime);
        f1.frequency.exponentialRampToValueAtTime(formant.f1, startTime + 0.018);
      } else if (def.cons === 'w') {
        f2.frequency.setValueAtTime(formant.f2 * 0.55, startTime);
        f2.frequency.exponentialRampToValueAtTime(formant.f2, startTime + 0.035);
      }

      // 音量包络
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.36, startTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(f1);
      osc.connect(f2);
      f1.connect(gain);
      f2.connect(gain);
      gain.connect(this.voiceGain || this.masterGain || ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.015);
    }

    createNoiseBurst(time, dur, centerFreq) {
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(centerFreq, time);
      filter.Q.setValueAtTime(3.5, time);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      noise.connect(filter);
      filter.connect(gain);
      noise.start(time);
      return gain;
    }

    // ─────────────────────── 真实木质文艺复兴鲁特琴 / 竖琴 声学物理拨弦模型 ───────────────────────
    // 告别尖锐数字蜂鸣：指肚软瞬态 (Soft flesh attack) + 复弦同度微失谐 (Double-course chorus) + 梨形云杉木质共振
    playPluckedString(freq, type = 'lute', opts = {}) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const now = opts.time !== undefined ? opts.time : ctx.currentTime;
      const sr = ctx.sampleRate;
      const dur = opts.duration || (type === 'lute' ? 3.6 : 4.0);
      const vol = opts.vol !== undefined ? opts.vol : (type === 'lute' ? 0.36 : 0.28);

      const numSamples = Math.floor(sr * Math.min(4.8, dur));
      const buffer = ctx.createBuffer(2, numSamples, sr); // 立体声双复弦声道
      const chL = buffer.getChannelData(0);
      const chR = buffer.getChannelData(1);

      // 复弦微失谐：文艺复兴鲁特琴的同度弦组天然带有 2.5 音分的微失谐与相位差，赋予其温暖自然的歌唱合唱感
      const detuneFactor = type === 'lute' ? 1.0016 : 1.0008;
      const f1 = freq;
      const f2 = freq * detuneFactor;

      const p1 = Math.max(3, Math.round(sr / f1));
      const p2 = Math.max(3, Math.round(sr / f2));

      const ring1 = new Float32Array(p1);
      const ring2 = new Float32Array(p2);

      // 1. 指肚软瞬态激励（彻底消除刺耳白噪声）：
      // 真实人手触弦时，指肚（Flesh pad）与羊肠弦接触有一个物理接触面，瞬态在 2200Hz 以上天然衰减。
      // 使用 2 阶低通平滑粉红滤波脉冲，带来温润柔和、肉感饱满的纯正原声触弦。
      let noiseLp1 = 0, noiseLp2 = 0;
      for (let i = 0; i < p1; i++) {
        const rawNoise = (Math.random() * 2 - 1);
        noiseLp1 = noiseLp1 * 0.42 + rawNoise * 0.58; // 软滤波
        const env = Math.sin((i / p1) * Math.PI);
        ring1[i] = noiseLp1 * env;
      }
      for (let i = 0; i < p2; i++) {
        const rawNoise = (Math.random() * 2 - 1);
        noiseLp2 = noiseLp2 * 0.42 + rawNoise * 0.58;
        const env = Math.sin((i / p2) * Math.PI);
        ring2[i] = noiseLp2 * env;
      }

      // 物理内耗频率相关衰减：低音弦悠长共鸣，高音泛音柔和自然滚降
      const baseDecay = type === 'lute' ? 0.9958 : 0.9968;
      const decay = Math.min(0.9982, baseDecay + 0.0015 * Math.exp(-freq / 350));

      let r1Idx = 0, prev1 = 0;
      let r2Idx = 0, prev2 = 0;

      for (let i = 0; i < numSamples; i++) {
        // 声学弦体循环平滑低通（(cur + prev) / 2）
        const cur1 = ring1[r1Idx];
        const filt1 = (cur1 + prev1) * 0.5 * decay;
        prev1 = cur1;
        ring1[r1Idx] = filt1;
        chL[i] = cur1;
        r1Idx = (r1Idx + 1) % p1;

        const cur2 = ring2[r2Idx];
        const filt2 = (cur2 + prev2) * 0.5 * decay;
        prev2 = cur2;
        ring2[r2Idx] = filt2;
        chR[i] = cur2;
        r2Idx = (r2Idx + 1) % p2;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      // 2. 真实梨形木质共鸣箱与云杉面板多峰声学建模
      // A) 135Hz 腹腔空气亥姆霍兹共鸣（提供深沉温暖的木质底蕴）
      const bodyAir = ctx.createBiquadFilter();
      bodyAir.type = 'peaking';
      bodyAir.frequency.setValueAtTime(type === 'lute' ? 135 : 180, now);
      bodyAir.Q.setValueAtTime(2.0, now);
      bodyAir.gain.setValueAtTime(type === 'lute' ? 6.5 : 4.0, now);

      // B) 380Hz 云杉面板主谐振（提炼真实木吉他/鲁特琴的胸腔鸣响感）
      const bodyWood = ctx.createBiquadFilter();
      bodyWood.type = 'peaking';
      bodyWood.frequency.setValueAtTime(type === 'lute' ? 380 : 440, now);
      bodyWood.Q.setValueAtTime(1.8, now);
      bodyWood.gain.setValueAtTime(type === 'lute' ? 4.5 : 3.0, now);

      // C) 820Hz 音孔花窗透音区（保留古朴精致的拨弦高雅色彩）
      const bodyRose = ctx.createBiquadFilter();
      bodyRose.type = 'peaking';
      bodyRose.frequency.setValueAtTime(type === 'lute' ? 820 : 1200, now);
      bodyRose.Q.setValueAtTime(2.2, now);
      bodyRose.gain.setValueAtTime(type === 'lute' ? 3.0 : 3.5, now);

      // D) 2600Hz 陡峭声学截止低通滤波（彻底斩断任何尖锐合成器数码毛刺，令音色极度柔润亲和）
      const acousticCut = ctx.createBiquadFilter();
      acousticCut.type = 'lowpass';
      acousticCut.frequency.setValueAtTime(type === 'lute' ? 2600 : 4200, now);
      acousticCut.Q.setValueAtTime(0.707, now); // Butterworth 平滑无尖峰

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(vol * 0.42, now + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.00005, now + dur);

      // 串联完整声学滤波链
      src.connect(bodyAir);
      bodyAir.connect(bodyWood);
      bodyWood.connect(bodyRose);
      bodyRose.connect(acousticCut);
      acousticCut.connect(gain);
      gain.connect(this.bgmGain || this.masterGain || ctx.destination);

      src.start(now);
      return src;
    }

    // 陶笛/古笛空灵微风长音
    playFluteNote(time, freq, dur, vol = 0.15) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      // 空灵气息抖动
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(4.8, time);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(freq * 0.018, time);
      lfo.connect(osc.frequency);
      lfo.start(time);
      lfo.stop(time + dur);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(freq * 2.2, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(vol, time + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain || this.masterGain || ctx.destination);

      osc.start(time);
      osc.stop(time + dur + 0.05);
    }

    // ─────────────────────── 五大章节专属古朴配乐矩阵（类似《1999》卵石论战） ───────────────────────
    startBGM() {
      if (this.bgmRunning || !this.bgmEnabled) return;
      this.init();
      if (!this.ctx) return;

      this.bgmRunning = true;
      this.bgmStep = 0;
      this.bgmNextTime = this.ctx.currentTime + 0.1;
      this.scheduleBGM();
      if (this.onTrackChange) {
        this.onTrackChange(this.getCurrentTrack());
      }
    }

    getCurrentTrack() {
      return this.tracks[this.currentTrackIndex] || this.tracks[0];
    }

    setTrack(idx, opts = {}) {
      const target = Math.max(0, Math.min(this.tracks.length - 1, typeof idx === 'number' ? idx : 0));
      if (this.currentTrackIndex === target && !opts.force) return this.getCurrentTrack();

      this.currentTrackIndex = target;
      this.chapter = target;
      this.trackPlayTimer = 0;
      this.bgmStep = 0;

      // 平滑音量交叉淡入淡出（0.28s 衰减 -> 切换 -> 0.45s 渐强复位，消灭突兀爆音）
      if (this.ctx && this.bgmGain) {
        const now = this.ctx.currentTime;
        const origVol = 0.35;
        this.bgmGain.gain.cancelScheduledValues(now);
        this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
        this.bgmGain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        this.bgmGain.gain.linearRampToValueAtTime(origVol, now + 0.65);
      }

      const track = this.getCurrentTrack();
      if (this.onTrackChange) {
        this.onTrackChange(track, opts);
      }
      return track;
    }

    nextTrack(manual = true) {
      const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
      return this.setTrack(nextIdx, { force: true, manual, dir: 'next' });
    }

    prevTrack(manual = true) {
      const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
      return this.setTrack(prevIdx, { force: true, manual, dir: 'prev' });
    }

    setChapter(idx, opts = {}) {
      return this.setTrack(idx, opts);
    }

    // 每一帧更新时间戳：支持空闲轮播自动切歌换换口味
    update(dt = 0.016) {
      if (!this.bgmRunning || !this.bgmEnabled) return;
      this.trackPlayTimer += dt;
      if (this.autoRotateEnabled && this.trackPlayTimer >= this.trackDurationLimit) {
        this.nextTrack(false);
      }
    }

    stopBGM() {
      this.bgmRunning = false;
      if (this.bgmTimer) {
        clearTimeout(this.bgmTimer);
        this.bgmTimer = null;
      }
    }

    toggleBGM() {
      this.bgmEnabled = !this.bgmEnabled;
      if (this.bgmEnabled) {
        this.startBGM();
      } else {
        this.stopBGM();
      }
      return this.bgmEnabled;
    }

    scheduleBGM() {
      if (!this.bgmRunning || !this.ctx) return;

      // 章节特色速度微调（序章大地 76BPM、水道 88BPM、断崖 80BPM、卵石论战 84BPM、天穹 78BPM）
      const chBpms = [76, 88, 80, 84, 78];
      const bpm = chBpms[this.chapter || 0] || 84;
      const beat = 60 / bpm;
      const sub = beat / 3;
      const lookahead = 0.55;

      if (this.bgmNextTime < this.ctx.currentTime) {
        this.bgmNextTime = this.ctx.currentTime + 0.05;
      }

      let scheduleCount = 0;
      while (this.bgmNextTime < this.ctx.currentTime + lookahead && scheduleCount++ < 36) {
        this.playBGMPattern(this.chapter || 0, this.bgmStep, this.bgmNextTime, sub);
        this.bgmStep = (this.bgmStep + 1) % 192;
        this.bgmNextTime += sub;
      }

      this.bgmTimer = setTimeout(() => this.scheduleBGM(), 110);
    }

    playBGMPattern(chapter, step, time, sub) {
      const bar = Math.floor(step / 6);
      const beatInBar = step % 6;

      // 常用频率常数
      const A1 = 55.0, D2 = 73.42, E2 = 82.41, F2 = 87.31, G2 = 98.0, A2 = 110.0, B2 = 123.47;
      const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.0, A3 = 220.0, B3 = 246.94;
      const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.0, A4 = 440.0, B4 = 493.88;
      const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.0;

      // ─────────────────────── 章节 0: 序章·埃尔遗迹《大地的扬尘》 ───────────────────────
      // A Aeolian 自然小调，苍茫厚重的大地泥土质感，鲁特琴低音悠长深沉
      if (chapter === 0) {
        // 低音根音持续延音
        if (beatInBar === 0) {
          const bassA = [A2, A2, G2, G2, F2, F2, E2, E2][bar % 8];
          this.playPluckedString(bassA, 'lute', { time, duration: sub * 5.8, vol: 0.36 });
        }
        // 质朴的慢速单弦拨音
        const arpsA = [
          [A2, E3, A3, C4, E4, C4],
          [A2, E3, A3, C4, E4, A3],
          [G2, D3, G3, B3, D4, B3],
          [G2, D3, G3, B3, D4, G3],
          [F2, C3, F3, A3, C4, A3],
          [F2, C3, F3, A3, C4, F3],
          [E2, B2, E3, G3, B3, G3],
          [E2, B2, E3, 207.65, B3, E3] // E major 导音归宿
        ][bar % 8];
        this.playPluckedString(arpsA[beatInBar], 'lute', { time, duration: sub * 3.4, vol: 0.24 });

        // 苍凉长音旋律（第 4 小节起）
        if (bar >= 4) {
          const melA = {
            24: A3, 27: C4, 30: B3,
            36: E4, 39: D4, 42: C4, 45: B3,
            48: A3, 52: G3, 56: A3
          };
          if (melA[step]) this.playPluckedString(melA[step], 'lute', { time, duration: sub * 4.0, vol: 0.38 });
        }
        return;
      }

      // ─────────────────────── 章节 1: 第 1 章·索勒斯水道《水车与奔流》 ───────────────────────
      // D Dorian 调式，轻快奔腾的水轮琶音，竖琴晶莹如泉
      if (chapter === 1) {
        if (beatInBar === 0) {
          const bassD = [D3, D3, G2, G2, C3, C3, A2, A2][bar % 8];
          this.playPluckedString(bassD, 'lute', { time, duration: sub * 5.6, vol: 0.38 });
        }
        // 快速晶莹的流水琶音
        const arpWater = [
          [D3, A3, D4, F4, A4, F4],
          [D3, A3, D4, F4, A4, D5],
          [G2, D3, G3, B3, D4, G4],
          [G2, D3, G3, B3, D4, B4],
          [C3, G3, C4, E4, G4, E4],
          [C3, G3, C4, E4, G4, C5],
          [A2, E3, A3, C4, E4, C4],
          [A2, E3, A3, 277.18, E4, A4]
        ][bar % 8];
        this.playPluckedString(arpWater[beatInBar], 'harp', { time, duration: sub * 2.6, vol: 0.26 });

        // 水车灵动跳跃小调
        if (bar >= 2) {
          const melWater = {
            12: F4, 15: A4, 18: G4, 21: E4,
            24: D4, 26: E4, 28: F4, 30: D4,
            36: C4, 38: D4, 40: E4, 44: A3,
            60: D5, 63: A4, 66: F4, 69: E4
          };
          if (melWater[step]) this.playPluckedString(melWater[step], 'lute', { time, duration: sub * 3.2, vol: 0.34 });
        }
        return;
      }

      // ─────────────────────── 章节 2: 第 2 章·云之回廊《断崖索道》 ───────────────────────
      // E Phrygian 调式（E-F-G-A-B-C-D），悬崖峭壁的幽邃紧张与云海呼啸
      if (chapter === 2) {
        if (beatInBar === 0) {
          const bassClimb = [E3, E3, F3, F3, D3, D3, E3, 155.56][bar % 8];
          this.playPluckedString(bassClimb, 'lute', { time, duration: sub * 5.6, vol: 0.40 });
        }
        // 弗里吉亚半音张力交织
        const arpClimb = [
          [E3, B3, E4, G4, B4, G4],
          [E3, B3, E4, G4, B4, E4],
          [F3, C4, F4, A4, C5, A4], // F 级大二度半音对撞
          [F3, C4, F4, A4, C5, F4],
          [D3, A3, D4, F4, A4, F4],
          [D3, A3, D4, F4, A4, D4],
          [E3, B3, E4, G4, B4, G4],
          [E3, B3, E4, G4, B4, E5]
        ][bar % 8];
        this.playPluckedString(arpClimb[beatInBar], 'harp', { time, duration: sub * 2.8, vol: 0.25 });

        // 高空微风笛音
        if (bar >= 4) {
          const windFlute = {
            24: { f: B4, d: sub * 5 },
            36: { f: C5, d: sub * 5 },
            48: { f: A4, d: sub * 5 },
            60: { f: G4, d: sub * 4 },
            72: { f: E4, d: sub * 6 }
          };
          if (windFlute[step]) this.playFluteNote(time, windFlute[step].f, windFlute[step].d, 0.16);
        }
        return;
      }

      // ─────────────────────── 章节 3: 第 3 章·圣书图书馆《卵石论战·开源》 ───────────────────────
      // 正统《重返未来：1999》洞穴囚徒哲学论辩对位法，D Dorian 严密理性与古典弦鸣
      if (chapter === 3) {
        if (beatInBar === 0) {
          let bassL = D3;
          if (bar % 8 === 2 || bar % 8 === 3) bassL = C3;
          else if (bar % 8 === 4 || bar % 8 === 5) bassL = 116.54; // Bb2
          else if (bar % 8 === 6 || bar % 8 === 7) bassL = A2;
          this.playPluckedString(bassL, 'lute', { time, duration: sub * 5.8, vol: 0.40 });
        }

        const arpDebate = [
          [D3, A3, D4, F4, A4, F4],
          [D3, A3, D4, F4, A4, D4],
          [C3, G3, C4, E4, G4, E4],
          [C3, G3, C4, E4, G4, C4],
          [116.54, 174.61, 233.08, 293.66, 349.23, 293.66],
          [116.54, 174.61, 233.08, 293.66, 349.23, 233.08],
          [A2, E3, A3, C4, E4, C4],
          [A2, E3, A3, 277.18, E4, A3]
        ][bar % 8];
        this.playPluckedString(arpDebate[beatInBar], 'harp', { time, duration: sub * 2.8, vol: 0.22 });

        // 鲁特琴与竖琴交替论辩对位
        if (bar >= 4) {
          const debateMel = {
            24: D4, 26: F4, 28: E4, 30: D4,
            36: A3, 38: C4, 40: D4,
            48: F4, 50: G4, 52: A4, 54: B4, // Dorian 亮音 B4
            60: A4, 62: G4, 64: F4, 66: E4,
            72: D4, 75: F4, 78: E4, 81: C4,
            96: D5, 98: C5, 100: A4, 102: F4, // 智性高潮
            108: G4, 110: A4, 112: F4, 114: D4,
            132: A3, 134: D4, 136: F4, 138: E4
          };
          if (debateMel[step]) this.playPluckedString(debateMel[step], 'lute', { time, duration: sub * 3.8, vol: 0.38 });
        }

        if (bar >= 16 && bar < 28) {
          const fluteDebate = {
            96: { f: A4, d: sub * 5 },
            108: { f: D5, d: sub * 6 },
            120: { f: C5, d: sub * 4 },
            132: { f: A4, d: sub * 5 },
            144: { f: F4, d: sub * 6 }
          };
          if (fluteDebate[step]) this.playFluteNote(time, fluteDebate[step].f, fluteDebate[step].d, 0.15);
        }
        return;
      }

      // ─────────────────────── 章节 4: 终章·银河穹顶《上帝之手·余烬》 ───────────────────────
      // 升华至 D Major 辉煌复调，群像散落人间，万语共鸣
      if (chapter === 4) {
        if (beatInBar === 0) {
          const bassEnd = [D3, D3, 138.59, 138.59, B2, B2, A2, A2][bar % 8]; // D -> C# -> B -> A 庄严下行
          this.playPluckedString(bassEnd, 'lute', { time, duration: sub * 5.8, vol: 0.42 });
        }
        // 辉煌星辰大调琶音
        const arpEnd = [
          [D3, A3, D4, 277.18, A4, 277.18],
          [D3, A3, D4, 369.99, A4, D5], // F# 大三度温暖破晓
          [138.59, A3, 277.18, E4, A4, E4],
          [138.59, A3, 277.18, E4, A4, 277.18],
          [B2, 185.0, D4, 369.99, B4, 369.99],
          [B2, 185.0, D4, 369.99, B4, D5],
          [A2, E3, A3, 277.18, E4, 277.18],
          [A2, E3, A3, 277.18, E4, A4]
        ][bar % 8];
        this.playPluckedString(arpEnd[beatInBar], 'harp', { time, duration: sub * 3.0, vol: 0.28 });

        // 终局全音域拨弦
        if (bar >= 2) {
          const endMel = {
            12: 369.99, 15: A4, 18: D5, 21: 277.18, // F#4 -> A4 -> D5 -> C#5
            24: B4, 27: A4, 30: 369.99, 33: D4,
            36: E4, 39: 369.99, 42: A4, 45: 277.18,
            48: D5, 51: E5, 54: 369.99 * 2, 57: D5
          };
          if (endMel[step]) this.playPluckedString(endMel[step], 'lute', { time, duration: sub * 4.2, vol: 0.40 });
        }
        return;
      }
    }
  }

  window.SFX = new SoundSystem();
})();
