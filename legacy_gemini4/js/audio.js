// Procedural WebAudio Synthesizer for Babel: The Lost Appositive
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.18, vol = 0.12, slideTo = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playLanguageHop(lang, hopIndex = 0) {
    const baseFreqs = {
      A: 330,
      B: 440,
      C: 523.25,
      D: 587.33,
      E: 659.25,
      F: 783.99
    };
    const f = (baseFreqs[lang] || 360) * Math.pow(1.04, Math.min(hopIndex, 8));
    this.playTone(f, 'triangle', 0.14, 0.08, f * 1.12);
  }

  playRallyCommand() {
    this.playTone(293.66, 'triangle', 0.22, 0.14, 440);
    setTimeout(() => this.playTone(587.33, 'sine', 0.28, 0.11), 70);
  }

  playPickUp() {
    this.playTone(320, 'sine', 0.15, 0.12, 620);
  }

  playDrop() {
    this.playTone(520, 'sine', 0.15, 0.12, 260);
  }

  playBuildHammer() {
    this.playTone(180, 'square', 0.09, 0.08, 95);
  }

  playPlateClick() {
    this.playTone(240, 'triangle', 0.16, 0.12, 480);
  }

  playMiracle() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, 'sine', 0.45, 0.09), i * 55);
    });
  }

  playThunder() {
    this.playTone(92, 'sawtooth', 0.65, 0.15, 38);
  }

  playRelicPickup() {
    this.playTone(587.33, 'triangle', 0.2, 0.12, 880);
    setTimeout(() => this.playTone(880, 'sine', 0.35, 0.12, 1174.66), 90);
  }
}

window.SFX = new SoundSystem();
