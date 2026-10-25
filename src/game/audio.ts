/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LanguageId } from './types.ts';

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private bgmOscs: OscillatorNode[] = [];
  private isPlayingBgm: boolean = false;

  private initCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // AudioContext unavailable in headless env
      this.ctx = null;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : 0.08, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a unique phoneme/musical chime for a specific language in the relay chain.
   */
  public playLanguageChime(langId: LanguageId, stepIndex: number = 0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseFreqs: Record<LanguageId, number> = {
      sumerian: 196.0,  // G3 - earthy bass
      akkadian: 220.0,  // A3 - ancient bronze bell
      greek: 329.63,    // E4 - clean rational
      egyptian: 293.66, // D4 - golden mystical
      aramaic: 349.23,  // F4 - desert wind reed
      latin: 392.0,     // G4 - noble trumpet
      han: 440.0,       // A4 - silk stone chime
      gaelic: 523.25,   // C5 - woodland flute
      enochian: 587.33, // D5 - ethereal celestial choir
      celestial: 659.25 // E5 - divine angelic
    };

    const baseFreq = baseFreqs[langId] || 300;
    // Ascending arpeggio per step
    const freq = baseFreq * Math.pow(1.05946, stepIndex * 2);

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Distinct waveform per civilization
    if (langId === 'sumerian' || langId === 'latin') {
      osc.type = 'sawtooth';
    } else if (langId === 'han' || langId === 'greek') {
      osc.type = 'triangle';
    } else if (langId === 'celestial') {
      osc.type = 'sine';
    } else {
      osc.type = 'square';
    }

    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.15);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    // Filter to soften the sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  /**
   * Sound when two members grip hands or connect.
   */
  public playHandshakeSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Sound when launching / throwing a scout.
   */
  public playThrowSound() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.4);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.42);
  }

  /**
   * Heavy stone crumble / collapse rumble.
   */
  public playCrumbleRumble() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.5);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  /**
   * Tilt danger warning ping.
   */
  public playTiltAlert() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(600, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /**
   * Pleasant chime when discovering/picking up a Miracle relic.
   */
  public playChimeSuccess() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((f, idx) => {
      const now = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  /**
   * Triumphant Act completion / puzzle unlock fanfare.
   */
  public playTriumphFanfare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C major chord arpeggio
    notes.forEach((f, idx) => {
      const now = this.ctx!.currentTime + idx * 0.09;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  /**
   * Atmospheric drone BGM (Ancient Babel wind & resonant brass tone)
   */
  public startAmbientBgm() {
    if (this.isPlayingBgm) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isPlayingBgm = true;
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(this.isMuted ? 0 : 0.06, this.ctx.currentTime);
    this.bgmGain.connect(this.ctx.destination);

    // Chord: D minor with open fifths (D2, A2, D3, F3)
    const freqs = [73.42, 110.0, 146.83, 174.61];
    this.bgmOscs = freqs.map((f, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx!.currentTime);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320 + i * 50, this.ctx!.currentTime);

      osc.connect(filter);
      filter.connect(this.bgmGain!);
      osc.start();
      return osc;
    });
  }

  public stopAmbientBgm() {
    this.bgmOscs.forEach(o => {
      try {
        o.stop();
        o.disconnect();
      } catch {
        // ignore
      }
    });
    this.bgmOscs = [];
    this.isPlayingBgm = false;
  }
}

export const sound = new SoundSystem();
