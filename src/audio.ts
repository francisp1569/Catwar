// 효과음·배경음악을 Web Audio로 직접 합성한다 (외부 음원 파일 없음)
type Wave = OscillatorType;

const PREF_KEY = 'catwar.sound.v1';

class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last = new Map<string, number>();
  sfxOn = true;
  musicOn = true;
  private track: Track | null = null;
  private wanted: TrackName | null = null;
  private timer = 0;
  private step = 0;
  private nextTime = 0;

  constructor() {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
      if (typeof p.sfx === 'boolean') this.sfxOn = p.sfx;
      if (typeof p.music === 'boolean') this.musicOn = p.music;
    } catch { /* noop */ }
  }

  private savePrefs(): void {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ sfx: this.sfxOn, music: this.musicOn })); } catch { /* noop */ }
  }

  /** 브라우저 정책상 첫 터치 때 오디오를 켠다 */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 0.55 : 0;
    this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.32 : 0;
    this.musicBus.connect(this.master);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.wanted) this.music(this.wanted);
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.value = on ? 0.55 : 0;
    this.savePrefs();
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.value = on ? 0.32 : 0;
    this.savePrefs();
  }

  // ───────────── 합성 도구 ─────────────

  private tone(freq: number, dur: number, opt: { type?: Wave; vol?: number; to?: number; at?: number; bus?: GainNode; attack?: number } = {}): void {
    const ctx = this.ctx!;
    const t0 = opt.at ?? ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opt.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.to), t0 + dur);
    const v = opt.vol ?? 0.3;
    const a = opt.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(opt.bus ?? this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opt: { vol?: number; freq?: number; to?: number; q?: number; type?: BiquadFilterType; at?: number; bus?: GainNode } = {}): void {
    const ctx = this.ctx!;
    const t0 = opt.at ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = opt.type ?? 'bandpass';
    f.frequency.setValueAtTime(opt.freq ?? 2000, t0);
    if (opt.to) f.frequency.exponentialRampToValueAtTime(opt.to, t0 + dur);
    f.Q.value = opt.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opt.vol ?? 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(opt.bus ?? this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  /** 냥~ : 톱니파를 두 개의 모음 필터(포먼트)에 통과시키며 음높이를 굴린다 */
  private meow(pitch = 1, at?: number): void {
    const ctx = this.ctx!;
    const t0 = at ?? ctx.currentTime;
    const dur = 0.42;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420 * pitch, t0);
    o.frequency.linearRampToValueAtTime(720 * pitch, t0 + 0.12);
    o.frequency.linearRampToValueAtTime(520 * pitch, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const out = ctx.createGain();
    out.gain.value = 0.9;
    for (const [f0, f1, q] of [[700, 1100, 6], [1800, 2600, 8]] as const) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(f0, t0);
      bp.frequency.linearRampToValueAtTime(f1, t0 + 0.15);
      bp.frequency.linearRampToValueAtTime(f0 * 1.1, t0 + dur);
      bp.Q.value = q;
      g.connect(bp).connect(out);
    }
    o.connect(g);
    out.connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // ───────────── 효과음 ─────────────

  play(name: string): void {
    if (!this.ctx || !this.sfxOn) return;
    const now = this.ctx.currentTime;
    const gap: Record<string, number> = { pop: 0.07, yarn: 0.1, scratch: 0.06, hit: 0.045, kill: 0.06, hurt: 0.18, boom: 0.12, laser: 0.15, crit: 0.08 };
    const g = gap[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < g) return;
    this.last.set(name, now);
    const r = 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'pop': this.tone(520 * r, 0.08, { to: 260, vol: 0.18, type: 'triangle' }); break;
      case 'yarn': this.noise(0.14, { freq: 900, to: 2400, vol: 0.18, q: 2 }); break;
      case 'scratch': this.noise(0.07, { freq: 3500, to: 1800, vol: 0.2, q: 3, type: 'highpass' }); break;
      case 'hit': this.noise(0.05, { freq: 1400 * r, vol: 0.16, q: 1.5 }); this.tone(180 * r, 0.05, { to: 90, vol: 0.1 }); break;
      case 'crit': this.tone(1200 * r, 0.09, { to: 1800, vol: 0.12, type: 'square' }); this.noise(0.08, { freq: 2500, vol: 0.18 }); break;
      case 'kill': this.tone(1500 * r, 0.06, { to: 2400, vol: 0.06, type: 'square' }); this.noise(0.12, { freq: 700, to: 300, vol: 0.12, type: 'lowpass' }); break;
      case 'boom':
        this.tone(140, 0.4, { to: 40, vol: 0.45 });
        this.noise(0.45, { freq: 1600, to: 120, vol: 0.4, type: 'lowpass' });
        break;
      case 'thud': this.tone(110, 0.35, { to: 35, vol: 0.5 }); this.noise(0.25, { freq: 400, to: 100, vol: 0.3, type: 'lowpass' }); break;
      case 'laser': this.tone(1800, 0.25, { to: 300, vol: 0.12, type: 'sawtooth' }); break;
      case 'bell': this.tone(1568, 0.3, { vol: 0.12 }); this.tone(2349, 0.25, { vol: 0.07 }); break;
      case 'wheel': this.noise(0.25, { freq: 300, to: 600, vol: 0.2, type: 'lowpass' }); break;
      case 'heal': [880, 1109, 1319].forEach((f, i) => this.tone(f, 0.25, { vol: 0.1, at: now + i * 0.06, type: 'triangle' })); break;
      case 'hurt': this.noise(0.12, { freq: 300, vol: 0.25, type: 'lowpass' }); this.tone(90, 0.12, { to: 60, vol: 0.2 }); break;
      case 'meow': this.meow(r); break;
      case 'meow-hi': this.meow(1.3 * r); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { vol: 0.16, at: now + i * 0.07, type: 'square' })); break;
      case 'card': this.tone(988, 0.12, { vol: 0.12, type: 'triangle' }); this.tone(1319, 0.2, { vol: 0.1, at: now + 0.06, type: 'triangle' }); break;
      case 'click': this.tone(700, 0.05, { to: 900, vol: 0.08, type: 'triangle' }); break;
      case 'boss': [196, 185, 175, 165].forEach((f, i) => this.tone(f, 0.35, { vol: 0.25, at: now + i * 0.2, type: 'sawtooth' })); break;
      case 'discover': this.tone(1047, 0.1, { vol: 0.12, type: 'triangle' }); this.tone(1568, 0.18, { vol: 0.12, at: now + 0.08, type: 'triangle' }); break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.16, { vol: 0.18, at: now + i * 0.12, type: 'square' }));
        this.meow(1.1, now + 0.8);
        break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.3, { vol: 0.16, at: now + i * 0.22, type: 'triangle' })); break;
      case 'gacha': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.15, { vol: 0.12, at: now + i * 0.05, type: 'triangle' })); break;
    }
  }

  // ───────────── 배경음악 (간단한 시퀀서) ─────────────

  music(name: TrackName | null): void {
    this.wanted = name;
    if (!this.ctx) return;
    if (this.track && this.track.name === name) return;
    clearInterval(this.timer);
    this.track = name ? TRACKS[name] : null;
    if (!this.track) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const stepDur = 60 / tr.bpm / 4; // 16분음표
    while (this.nextTime < ctx.currentTime + 0.12) {
      const i = this.step % tr.lead.length;
      const t = this.nextTime;
      const lead = tr.lead[i];
      if (lead) this.tone(midi(lead), stepDur * (tr.leadLen ?? 1.8), { type: tr.leadWave, vol: 0.13, at: t, bus: this.musicBus, attack: 0.01 });
      const bass = tr.bass[i % tr.bass.length];
      if (bass) this.tone(midi(bass), stepDur * 1.9, { type: 'triangle', vol: 0.22, at: t, bus: this.musicBus, attack: 0.01 });
      const dr = tr.drums[i % tr.drums.length];
      if (dr === 'k' || dr === 'x') this.tone(120, 0.12, { to: 45, vol: 0.32, at: t, bus: this.musicBus });
      if (dr === 's' || dr === 'x') this.noise(0.1, { freq: 1800, vol: 0.12, at: t, bus: this.musicBus });
      if (dr === 'h') this.noise(0.03, { freq: 7000, type: 'highpass', vol: 0.05, at: t, bus: this.musicBus });
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

type TrackName = 'lobby' | 'battle';
interface Track { name: TrackName; bpm: number; leadWave: Wave; leadLen?: number; lead: number[]; bass: number[]; drums: string[]; }

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// 직접 만든 짧은 멜로디 (0 = 쉼표). 한 칸 = 16분음표
const TRACKS: Record<TrackName, Track> = {
  lobby: {
    name: 'lobby', bpm: 104, leadWave: 'triangle', leadLen: 2.4,
    lead: [
      72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 74, 72, 0, 0, 0,
      74, 0, 77, 0, 81, 0, 79, 0, 77, 0, 76, 0, 74, 0, 0, 0,
      72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 81, 0, 79, 0,
      77, 0, 76, 0, 74, 0, 79, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    ],
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 50, 0, 0, 0, 57, 0, 0, 0, 55, 0, 0, 0, 43, 0, 0, 0],
    drums: ['k', '', 'h', '', 's', '', 'h', '', 'k', '', 'h', 'k', 's', '', 'h', ''],
  },
  battle: {
    name: 'battle', bpm: 138, leadWave: 'square', leadLen: 1.5,
    lead: [
      69, 0, 72, 69, 76, 0, 74, 72, 71, 0, 72, 74, 72, 0, 69, 0,
      69, 0, 72, 69, 77, 0, 76, 74, 76, 0, 72, 0, 71, 0, 0, 0,
      74, 0, 77, 74, 81, 0, 79, 77, 76, 0, 77, 79, 76, 0, 72, 0,
      74, 0, 72, 71, 72, 0, 74, 0, 69, 0, 0, 0, 64, 0, 68, 0,
    ],
    bass: [45, 0, 45, 0, 45, 0, 57, 0, 41, 0, 41, 0, 41, 0, 53, 0, 43, 0, 43, 0, 43, 0, 55, 0, 40, 0, 40, 0, 44, 0, 52, 0],
    drums: ['k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 'h', 'k', 'h', 'x', 'h'],
  },
};

export const sound = new Sound();
