// 효과음·배경음악
// - public/audio 의 음원 파일(모두 CC0, 출처는 public/audio/CREDITS.md)을 우선 쓰고
// - 파일이 없거나 아직 못 받았으면 Web Audio로 직접 합성한 소리를 쓴다
import { ART_V } from './art';
type Wave = OscillatorType;

const PREF_KEY = 'catwar.sound.v1';

/** 0.1초짜리 무음 WAV (아이폰 오디오 세션 유지용) */
const SILENT_WAV = (() => {
  const n = 800;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
  let bin = '';
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
})();

class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last = new Map<string, number>();
  sfxOn = true;
  /** 받아 둔 음원 (이름 → 후보 여러 개) */
  private samples = new Map<string, AudioBuffer[]>();
  private songs = new Map<TrackName, AudioBuffer>();
  private songSrc: AudioBufferSourceNode | null = null;
  private songName: TrackName | null = null;
  private loading = false;
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
    this.keepSessionAlive();
    if (this.ctx) {
      // iOS는 전화·잠금·앱 전환 뒤 'interrupted' 상태가 되므로 running이 아니면 항상 다시 깨운다
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
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
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    if (this.wanted) this.music(this.wanted);
    void this.loadFiles();
  }

  private async decode(file: string): Promise<AudioBuffer | null> {
    try {
      const res = await fetch(`audio/${file}?v=${ART_V}`);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      // 구형 사파리는 콜백 방식만 지원
      return await new Promise<AudioBuffer>((ok, bad) => { const p = this.ctx!.decodeAudioData(data, ok, bad); if (p) p.then(ok, bad); });
    } catch {
      return null;
    }
  }

  private async loadFiles(): Promise<void> {
    if (this.loading || !this.ctx) return;
    this.loading = true;
    // 지금 필요한 배경음악부터
    const order: TrackName[] = this.wanted === 'battle' ? ['battle', 'lobby'] : ['lobby', 'battle'];
    const jobs = Object.entries(SAMPLE_FILES).map(async ([name, files]) => {
      const bufs = (await Promise.all(files.map((f) => this.decode(`${f}.wav`)))).filter((b): b is AudioBuffer => !!b);
      if (bufs.length) this.samples.set(name, bufs);
    });
    for (const tn of order) {
      const b = await this.decode(`bgm-${tn}.mp3`);
      if (b) {
        this.songs.set(tn, b);
        if (this.wanted === tn) { this.track = null; this.music(tn); }
      }
    }
    await Promise.all(jobs);
  }

  /** 받아 둔 음원 재생 */
  private playBuf(buf: AudioBuffer, rate = 1, vol = 1, at = 0): void {
    const ctx = this.ctx!;
    if (!this.voice(buf.duration / rate)) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(this.sfxBus);
    src.start(at || ctx.currentTime);
  }

  /** 앱을 벗어나면 소리를 바로 멈춘다 */
  sleep(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => {});
  }

  /** 백그라운드에서 돌아왔을 때 */
  wake(): void {
    if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
  }

  private silentEl: HTMLAudioElement | null = null;

  /**
   * 아이폰 무음(진동) 모드에서는 Web Audio 소리가 꺼진다.
   * 오디오 세션을 '재생' 종류로 바꾸고(iOS 17+), 구형 기기는 무음 오디오를 함께 틀어 같은 효과를 낸다.
   */
  private keepSessionAlive(): void {
    try {
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback';
    } catch { /* noop */ }
    if (this.silentEl) {
      if (this.silentEl.paused) void this.silentEl.play().catch(() => {});
      return;
    }
    try {
      const el = document.createElement('audio');
      el.setAttribute('x-webkit-airplay', 'deny');
      el.loop = true;
      el.preload = 'auto';
      el.src = SILENT_WAV;
      el.volume = 0.01;
      this.silentEl = el;
      void el.play().catch(() => {});
    } catch { /* noop */ }
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

  /** 휴대폰 성능 보호: 동시에 울리는 소리 수 제한 */
  private voices = 0;
  private voice(dur: number, music = false): boolean {
    if (!music && this.voices > 22) return false;
    this.voices++;
    setTimeout(() => { this.voices--; }, (dur + 0.05) * 1000);
    return true;
  }

  private tone(freq: number, dur: number, opt: { type?: Wave; vol?: number; to?: number; at?: number; bus?: GainNode; attack?: number } = {}): void {
    const ctx = this.ctx!;
    if (!this.voice(dur, opt.bus === this.musicBus)) return;
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
    if (!this.voice(dur, opt.bus === this.musicBus)) return;
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
    if (this.ctx.state !== 'running') { void this.ctx.resume().catch(() => {}); return; }
    const now = this.ctx.currentTime;
    const gap: Record<string, number> = { throw: 0.1, zap: 0.1, splash: 0.15, pop: 0.07, yarn: 0.1, scratch: 0.06, hit: 0.045, kill: 0.06, hurt: 0.18, boom: 0.12, laser: 0.15, crit: 0.08 };
    const g = gap[name] ?? 0.03;
    if (now - (this.last.get(name) ?? -1) < g) return;
    this.last.set(name, now);
    const r = 0.92 + Math.random() * 0.16;
    const bufs = this.samples.get(name);
    if (bufs) {
      const b = bufs[Math.floor(Math.random() * bufs.length)];
      const rate = name === 'meow-hi' ? 1.18 * r : name === 'pounce' || name.startsWith('meow') || name === 'hit' || name === 'crit' ? r : 1;
      this.playBuf(b, rate, SAMPLE_VOL[name] ?? 1);
      if (name === 'win' && this.samples.get('meow')) this.playBuf(this.samples.get('meow')![0], 1.05, 0.9, now + 0.7);
      return;
    }
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
      case 'throw': this.noise(0.12, { freq: 600, to: 1600, vol: 0.14, q: 2 }); break;
      case 'zap': this.tone(1400, 0.12, { to: 300, vol: 0.1, type: 'sawtooth' }); this.noise(0.1, { freq: 5000, type: 'highpass', vol: 0.14 }); break;
      case 'pounce': this.tone(300, 0.1, { to: 700, vol: 0.12, type: 'triangle' }); this.meow(1.5 * r); break;
      case 'splash': this.noise(0.3, { freq: 2600, to: 800, vol: 0.22, q: 0.8 }); break;
      case 'shield': [660, 990].forEach((f, i) => this.tone(f, 0.3, { vol: 0.1, at: now + i * 0.08, type: 'sine' })); break;
      case 'vacuum': this.noise(1.6, { freq: 500, to: 1400, vol: 0.18, q: 3 }); this.tone(180, 1.4, { to: 240, vol: 0.06, type: 'sawtooth' }); break;
      case 'gacha': [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.15, { vol: 0.12, at: now + i * 0.05, type: 'triangle' })); break;
    }
  }

  // ───────────── 배경음악 (간단한 시퀀서) ─────────────

  music(name: TrackName | null): void {
    this.wanted = name;
    if (!this.ctx) return;
    const song = name ? this.songs.get(name) : null;
    if (song) {
      // 음원 파일이 있으면 그걸 반복 재생 (합성 음악은 끈다)
      if (this.songName === name && this.songSrc) return;
      clearInterval(this.timer);
      this.track = null;
      this.stopSong();
      const src = this.ctx.createBufferSource();
      src.buffer = song;
      src.loop = true;
      const g = this.ctx.createGain();
      g.gain.value = 2.2; // 합성 음악 기준으로 맞춘 버스 음량 보정
      src.connect(g).connect(this.musicBus);
      src.start();
      this.songSrc = src;
      this.songName = name;
      return;
    }
    this.stopSong();
    if (this.track && this.track.name === name) return;
    clearInterval(this.timer);
    this.track = name ? TRACKS[name] : null;
    if (!this.track) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  private stopSong(): void {
    if (this.songSrc) { try { this.songSrc.stop(); } catch { /* noop */ } this.songSrc.disconnect(); }
    this.songSrc = null;
    this.songName = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    const tr = this.track;
    if (!ctx || !tr) return;
    const stepDur = 60 / tr.bpm / 4; // 16분음표
    if (ctx.state !== 'running') return;
    // 멈췄다 돌아오면 밀린 음을 한꺼번에 틀지 않고 지금부터 다시
    if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05;
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

/** 효과음 이름 → 음원 파일 (public/audio/*.wav). 여러 개면 무작위로 하나 */
const SAMPLE_FILES: Record<string, string[]> = {
  meow: ['meow1', 'meow2', 'meow3'], 'meow-hi': ['meow2', 'meow3'], pounce: ['pounce'],
  hit: ['hit'], crit: ['crit'], boom: ['boom'], thud: ['thud'], hurt: ['hurt'],
  gacha: ['gacha'], coin: ['coin'], levelup: ['levelup'], win: ['win'], lose: ['lose'],
  click: ['click'], card: ['card'], heal: ['heal'], discover: ['discover'],
};
/** 음원별 음량 (자주 나는 소리는 작게) */
const SAMPLE_VOL: Record<string, number> = { hit: 0.35, crit: 0.5, click: 0.6, boom: 0.55, thud: 0.7, hurt: 0.5, meow: 0.9, 'meow-hi': 0.8, pounce: 0.5 };

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
