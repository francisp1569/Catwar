// 세로형 서바이버 디펜스 전투 시뮬레이션 (렌더링과 분리)
import { CAT_BY_ID, HERO_ID, type CatDef } from './data/cats';
import { CONFIG } from './data/config';
import { BATTLE_LINES, JOIN_LINES, RALLY_LINE } from './data/lines';
import { ENEMIES, type EnemyDef, type EnemyKind } from './data/enemies';
import type { Mix, StageDef } from './data/stages';
import { GENERIC, applyMods, rally, type GenericCard, type WeaponDef, type WeaponFx, type WeaponParams } from './data/weapons';
import type { Bonus } from './meta/items';
import { catStats } from './meta/progression';
import type { OwnedCat } from './meta/save';

const W = CONFIG.width;
/** 많은 수의 약한 적 = 무리 느낌. 보스는 제외 */
const HORDE = { hp: 0.3, atk: 0.35 };

export interface Enemy {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  baseX: number;
  hp: number;
  maxHp: number;
  atk: number;
  atkTimer: number;
  attacking: boolean;
  slowT: number;
  slowAmt: number;
  stunT: number;
  hitFlash: number;
  animT: number;
  dead: boolean;
  deathT: number;
  summonT?: number;
  meteorT?: number;
  fleeT?: number;
  /** 땅속 (공격 불가) */
  burrowed?: boolean;
  /** 맞고 뒤로 밀려나는 속도 (px/s, 점점 줄어듦) */
  kbV?: number;
  /** 몇 마리 몫인지 (후반엔 1보다 큼: 경험치·처치 수도 그만큼) */
  worth?: number;
}

export interface Member {
  slot: number;
  def: CatDef;
  owned: OwnedCat;
  weapon: WeaponDef;
  /** 전투 중 스킬 레벨 (0 = 아직 합류 안 함) */
  level: number;
  /** 고른 갈래형 강화 */
  picks: Record<string, number>;
  joinOrder: number;
  targetX: number;
  /** 합류 등장 연출 남은 시간 */
  enterT: number;
  power: number;
  /** 스킬 각성 (갈래 강화를 다 찍으면 열림) */
  evolved?: boolean;
  /** 지원형 고양이의 보조 공격 타이머 */
  sideT?: number;
  /** 대장 전용 공격 타이머 */
  stampT?: number;
  /** 필살기(폭주) 쿨타임 남은 시간 / 폭주 남은 시간 */
  ultCd: number;
  ultT: number;
  timer: number;
  x: number;
  y: number;
  swing: number;
  wakeFx: number;
  /** 이번 전투에서 준 피해 */
  dealt: number;
  speech: { text: string; t: number } | null;
}

export interface Shot {
  kind: 'bolt' | 'roll' | 'web' | 'lob' | 'boomer' | 'vacuum';
  sx?: number; sy?: number; tx?: number; ty?: number; age?: number; dur?: number; back?: boolean; range?: number;
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; pierce: number;
  color: string; crit: boolean;
  hit: Set<number>;
  tick: number;
  done: boolean;
  spin: number;
  style?: WeaponFx;
  /** 적 탄 모양 */
  eshot?: 'web' | 'tongue' | 'meteor';
  src: number;
  trail?: { x: number; y: number }[];
}

export type FxKind = 'beam' | 'slam' | 'quake' | 'snipe' | 'dash' | 'heal' | 'thorns' | 'spark' | 'boom' | 'poof' | 'zap' | 'pounce' | 'spray' | 'shield' | 'feather' | 'dirt' | 'coins' | 'ring' | 'slime' | 'stamp';
export interface ZapPoint { x: number; y: number; }
export interface Fx { kind: FxKind; x: number; y: number; x2?: number; y2?: number; r: number; t: number; life: number; color: string; style?: WeaponFx; pts?: ZapPoint[]; ang?: number; }
export interface Mine { x: number; y: number; r: number; dmg: number; src: number; t: number; seed: number; }

export interface Field { x: number; y: number; r: number; t: number; life: number; slow: number; dmg: number; tick: number; sx: number; sy: number; src: number; }
export interface PendingSlam { x: number; y: number; r: number; delay: number; dmg: number; knock: number; src: number; execute?: number; pounce?: boolean; }

export interface Decal { x: number; y: number; r: number; color: string; t: number; seed: number; }

export interface FloatText { x: number; y: number; text: string; color: string; t: number; size: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; r: number; }

export type Card =
  | { type: 'new'; slot: number }
  | { type: 'mod'; slot: number; mod: string; next: number }
  | { type: 'evolve'; slot: number }
  | { type: 'generic'; id: GenericCard };

export type Phase = 'playing' | 'victory' | 'defeat';
export interface BattleResult { victory: boolean; stars: number; kills: number; time: number; progress: number; discovered: string[]; bonusCoins?: number; }

/** 필살기: 쿨타임(초), 폭주 지속(초), 공격 속도 배율, 피해 배율 */
export const ULT_CD = 32;
export const ULT_DUR = 4;
const ULT_RATE = 2.2;
const ULT_DMG = 1.3;

/** 혼자서는 약한 고양이(지원·느린 공격형)가 대장이 되면 발도장을 더 세게 (대장끼리 비슷한 힘이 되게) */
/** [피해 배율, 빈도 배율] */
export const LEADER_STAMP: Partial<Record<string, [number, number]>> = {
  sphynx: [1.6, 3], abyssinian: [1.6, 3], tuxedo: [1.6, 3],
  bengal: [1.5, 2.5], russianblue: [1.5, 2.5], scottish: [1.5, 2.5],
  samsaek: [1.4, 2], cheesetabby: [1.4, 2],
  persian: [1.3, 1.3], ragdoll: [1.3, 1.3],
  cow: [1.5, 2.5], godeungeo: [1.3, 1.8], americanshort: [1.3, 1.8],
};

/** 공격 종류별 밀려나는 거리 (px). 보스는 15%만 */
const KNOCK_BY_KIND: Partial<Record<string, number>> = {
  bolt: 4, guard: 6, dash: 10, roll: 9, snipe: 14, frost: 3, quake: 12, slam: 18, beam: 1,
  lob: 11, chain: 2, pounce: 12, boomerang: 5, spray: 14,
};

export function fmtDmg(v: number): string {
  return v >= 10000 ? `${(v / 1000).toFixed(0)}K` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`;
}

export interface SquadEntry { def: CatDef; owned: OwnedCat; }

/** 전투에 한 번에 설 수 있는 고양이 수 (치즈 포함) */
export const MAX_JOIN = 6;

/** 치즈 + 보유한 모든 고양이. 치즈 말고는 전투 중 NEW 카드로 랜덤하게 합류한다 */
export function buildSquad(cats: Record<string, OwnedCat>): SquadEntry[] {
  const others = Object.keys(cats).filter((id) => id !== HERO_ID && CAT_BY_ID[id]);
  return [HERO_ID, ...others].map((id) => ({ def: CAT_BY_ID[id], owned: cats[id] }));
}

export class Game {
  phase: Phase = 'playing';
  paused = false;
  speed = 1;
  time = 0;

  enemies: Enemy[] = [];
  squad: Member[] = [];
  shots: Shot[] = [];
  fx: Fx[] = [];
  fields: Field[] = [];
  slams: PendingSlam[] = [];
  floats: FloatText[] = [];
  particles: Particle[] = [];
  decals: Decal[] = [];
  /** 카드를 고른 직후 확대 연출 */
  pickAnim: { card: Card; index: number; t: number } | null = null;

  maxHp: number;
  hp: number;
  hitFlash = 0;

  level = 1;
  xp = 0;
  pendingLevels = 0;
  choice: Card[] | null = null;
  rerolls = CONFIG.rerolls;
  generic: Record<GenericCard, number> = { snack: 0, tuna: 0, catnip: 0 };

  rallyCd = 0;
  rallyT = 0;

  kills = 0;
  banner: { text: string; t: number } | null = null;
  /** 타격감: 잠깐 멈춤 */
  hitStop = 0;
  private lastStopAt = -9;
  /** 이번 전투에서 바리케이드 체력이 가장 낮았던 비율 (밸런스 측정용) */
  minHpRatio = 1;
  /** 대장 발도장이 준 피해 (밸런스 측정용) */
  stampDealt = 0;
  /** 황금쥐로 번 코인 */
  bonusCoins = 0;
  /** 결과 화면 '다음' 버튼으로 이어 할 스테이지 */
  nextId: string | null = null;
  /** 첫 판 튜토리얼 (0: 카드 고르기 안내, 1: 응원 버튼 안내, 2: 끝) */
  tutorial = false;
  tutStep = 0;
  /** 보스 등장 컷인 (등장 시각) */
  bossIntro: { kinds: EnemyKind[]; at: number } | null = null;
  result: BattleResult | null = null;
  bossSpawned = false;
  shake = 0;

  private nextUid = 1;
  private joinCount = 0;
  /** 바리케이드 보호막 */
  shield = 0;
  mines: Mine[] = [];
  supportT = 22;
  private spawnAcc = 0;
  private burstsDone = new Set<number>();

  readonly bonus: Bonus;
  /** 효과음 이벤트 (main에서 꺼내 재생) */
  events: string[] = [];
  /** 이번 전투에서 처음 본 적 */
  discovered: string[] = [];
  private seen: Set<string>;

  constructor(readonly stage: StageDef, entries: SquadEntry[], bonus?: Bonus, seen: string[] = []) {
    this.seen = new Set(seen);
    this.bonus = bonus ?? { atk: 0, hp: 0, speed: 0, reduce: 0, xp: 0, coin: 0, collection: 0 };
    let hp = stage.baseHp;
    this.squad = entries.map((e, i) => {
      const s = catStats(e.def, e.owned);
      if (i === 0) hp += s.hp; // 다른 고양이는 합류할 때 바리케이드 체력에 더해진다
      return {
        slot: i, def: e.def, owned: e.owned, weapon: e.def.weapon,
        level: i === 0 ? 1 : 0, picks: {}, joinOrder: i === 0 ? 0 : -1, targetX: W / 2, enterT: 0, power: s.atk, timer: 0, ultCd: i === 0 ? ULT_CD * 0.6 : ULT_CD, ultT: 0,
        x: W / 2, y: CONFIG.squadY + 6, swing: 0, wakeFx: 0, dealt: 0, speech: null,
      };
    });
    this.maxHp = Math.round(hp * (1 + this.bonus.hp));
    this.hp = this.maxHp;
    this.banner = { text: `${stage.hard ? "🔥 어려움 · " : ""}STAGE ${stage.no} · ${stage.name}`, t: 2.5 };
    this.layout(true);
  }

  /** 합류한 고양이를 바리케이드 뒤에 고르게 배치 (치즈는 가운데) */
  private layout(snap = false): void {
    const act = this.squad.filter((m) => m.level > 0).sort((a, b) => a.joinOrder - b.joinOrder);
    const n = act.length;
    const order: Member[] = new Array(n);
    const mid = Math.floor((n - 1) / 2);
    let l = mid - 1;
    let r = mid + 1;
    order[mid] = act[0];
    for (let i = 1; i < n; i++) {
      if (i % 2 === 1 && r < n) order[r++] = act[i];
      else if (l >= 0) order[l--] = act[i];
      else order[r++] = act[i];
    }
    order.forEach((m, i) => {
      m.targetX = (W * (i + 0.5)) / n;
      m.y = CONFIG.squadY + (m.slot === 0 ? 8 : (i % 2) * -8);
      if (snap) m.x = m.targetX;
    });
  }

  get hero(): Member { return this.squad[0]; }
  get heroRally() { return rally(this.hero.owned.stars); }
  get xpNeed(): number { return CONFIG.xpBase + CONFIG.xpPerLevel * this.level; }
  get progress(): number { return Math.min(1, this.time / this.stage.duration); }
  get timeLeft(): number { return Math.max(0, this.stage.duration - this.time); }
  private get active(): boolean { return this.phase === 'playing' && !this.paused && !this.choice && !this.pickAnim; }

  get dmgMul(): number {
    let m = 1 + 0.12 * this.generic.tuna + this.bonus.atk + this.bonus.collection;
    for (const s of this.squad) if (s.level > 0 && s.weapon.kind === 'aura') m += (this.params(s).buff ?? 0) * (s.ultT > 0 ? 2.5 : 1);
    return m;
  }
  get speedMul(): number {
    return (1 + 0.12 * this.generic.catnip + this.bonus.speed) * (1 + (this.rallyT > 0 ? this.heroRally.speed : 0));
  }
  private get guard(): { reduce: number; thorns: number; power: number; slot: number } {
    const g = this.squad.find((s) => s.level > 0 && s.weapon.kind === 'guard');
    if (!g) return { reduce: 0, thorns: 0, power: 0, slot: -1 };
    const p = this.params(g);
    const boost = g.ultT > 0 ? 2 : 1;
    return { reduce: Math.min(0.8, (p.reduce ?? 0) * boost), thorns: (p.thorns ?? 0) * boost, power: g.power, slot: g.slot };
  }

  params(m: Member): WeaponParams {
    const p = applyMods(m.weapon, m.picks);
    if (m.evolved) {
      // 각성: 피해 +60%, 공격 간격 -25%, 개수형 스킬은 +1
      p.dmg *= 1.6;
      p.interval *= 0.75;
      if (p.count) p.count += 1;
      if (p.radius) p.radius *= 1.15;
    }
    return p;
  }

  // ───────────── 플레이어 조작 ─────────────

  /** 히트스톱 (너무 자주 걸리지 않게) */
  private stop(sec: number, shake = 0): void {
    if (this.time - this.lastStopAt < 0.3) return;
    this.lastStopAt = this.time;
    this.hitStop = Math.max(this.hitStop, sec);
    this.shake = Math.max(this.shake, shake);
  }

  canUlt(slot: number): boolean {
    const m = this.squad[slot];
    return !!m && m.level > 0 && m.ultCd <= 0 && this.active;
  }

  /** 필살기: 고양이 얼굴을 누르면 몇 초간 폭주 */
  useUlt(slot: number): boolean {
    if (!this.canUlt(slot)) return false;
    const m = this.squad[slot];
    m.ultT = ULT_DUR;
    m.ultCd = ULT_CD;
    m.wakeFx = 1.2;
    m.timer = 9999; // 바로 한 번 공격
    if (this.tutorial && this.tutStep === 2) this.tutStep = 3;
    this.banner = { text: `🔥 ${m.def.name} 필살! ${m.def.skillName} 폭주!`, t: 1.5 };
    this.fx.push({ kind: 'boom', x: m.x, y: m.y - 40, r: 50, t: 0, life: 0.5, color: '#ffb000' });
    this.say(m, '냥냥냥냥!');
    this.sfx('levelup');
    this.sfx('meow-hi');
    this.stop(0.08, 0.2);
    return true;
  }

  canRally(): boolean { return this.active && this.rallyCd <= 0; }

  /** 광고 부활을 이미 썼는지 (한 판에 한 번) */
  revived = false;

  /** 패배 직후 부활: 바리케이드 60% 회복 + 가까운 적을 뒤로 날려 보냄 */
  revive(): void {
    if (this.phase !== 'defeat' || this.revived) return;
    this.revived = true;
    this.phase = 'playing';
    this.result = null;
    this.hp = this.maxHp * 0.6;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.y > CONFIG.barricadeY - 260) { e.kbV = 900; e.stunT = Math.max(e.stunT, 1.5); }
    }
    this.banner = { text: '💖 다시 일어났다냥!', t: 1.6 };
    this.fx.push({ kind: 'heal', x: W / 2, y: CONFIG.barricadeY + 20, r: W / 2, t: 0, life: 0.8, color: '#ff9ac0' });
    this.sfx('heal');
    this.sfx('meow-hi');
    this.shake = 0.3;
  }

  useRally(): boolean {
    if (!this.canRally()) return false;
    if (this.tutorial && this.tutStep === 1) this.tutStep = 2;
    const r = this.heroRally;
    this.rallyCd = r.cd;
    this.rallyT = r.dur;
    this.repair(this.maxHp * r.heal);
    this.banner = { text: `📣 ${this.hero.def.name}의 꾹꾹이 응원!`, t: 1.4 };
    this.say(this.hero, RALLY_LINE);
    this.sfx('meow-hi');
    this.sfx('heal');
    for (const s of this.squad) if (s.level > 0) s.wakeFx = 0.8;
    return true;
  }

  pick(i: number): void {
    const c = this.choice?.[i];
    if (!c) return;
    this.pickAnim = { card: c, index: i, t: 0.7 };
    if (this.tutorial && this.tutStep === 0) this.tutStep = 1;
    if (c.type === 'new') {
      const m = this.squad[c.slot];
      m.level = 1;
      m.joinOrder = ++this.joinCount;
      const add = Math.round(catStats(m.def, m.owned).hp * (1 + this.bonus.hp));
      this.maxHp += add;
      this.hp += add;
      m.enterT = 0.8;
      m.wakeFx = 1;
      m.timer = this.params(m).interval * 0.5;
      this.layout();
      m.x = m.targetX;
      this.say(m, JOIN_LINES[m.def.id] ?? '냥!');
      this.sfx('meow');
      this.sfx('card');
      this.addFloat(m.targetX, m.y - 90, `${m.def.name} 합류!`, '#ffe98a', 18);
    } else if (c.type === 'mod') {
      const m = this.squad[c.slot];
      m.picks[c.mod] = (m.picks[c.mod] ?? 0) + 1;
      m.level++;
      m.wakeFx = 0.8;
      const mod = m.weapon.mods.find((x) => x.id === c.mod)!;
      this.sfx('card');
      this.addFloat(m.x, m.y - 90, `${mod.name}!`, '#ffe98a', 18);
    } else if (c.type === 'evolve') {
      const m = this.squad[c.slot];
      m.evolved = true;
      m.level++;
      m.wakeFx = 1.6;
      this.sfx('levelup');
      this.sfx('meow-hi');
      this.banner = { text: `✨ ${m.def.name}의 ${m.def.skillName} 각성!`, t: 2 };
      this.fx.push({ kind: 'boom', x: m.x, y: m.y - 40, r: 60, t: 0, life: 0.6, color: '#ffd84d' });
      this.addFloat(m.x, m.y - 90, '각성!', '#ffd84d', 24);
    } else {
      this.generic[c.id]++;
      if (c.id === 'snack') this.repair(this.maxHp * 0.25);
    }
    this.choice = null;
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.openChoice();
  }

  reroll(): boolean {
    if (!this.choice || this.rerolls <= 0) return false;
    this.rerolls--;
    this.choice = this.rollCards();
    return true;
  }

  private rollCards(): Card[] {
    const pool: { card: Card; w: number }[] = [];
    const joined = this.squad.filter((m) => m.level > 0).length;
    const waiting = this.squad.filter((m) => m.level === 0);
    // 새 고양이 카드: 보유 수와 상관없이 전체 확률은 비슷하게 (한 마리당 최대 3)
    const newW = Math.min(3, 6 / Math.max(1, waiting.length));
    for (const m of this.squad) {
      if (m.level === 0) { if (joined < MAX_JOIN) pool.push({ card: { type: 'new', slot: m.slot }, w: newW }); continue; }
      const open = m.weapon.mods.filter((x) => (m.picks[x.id] ?? 0) < x.max);
      // 갈래 강화를 전부 찍으면 각성 카드 (나오면 꼭 눈에 띄게 높은 확률)
      if (!open.length && !m.evolved) { pool.push({ card: { type: 'evolve', slot: m.slot }, w: 6 }); continue; }
      for (const mod of open) pool.push({ card: { type: 'mod', slot: m.slot, mod: mod.id, next: (m.picks[mod.id] ?? 0) + 1 }, w: 2.4 / Math.max(1.5, open.length) + 0.3 });
    }
    for (const id of Object.keys(GENERIC) as GenericCard[]) {
      if (this.generic[id] >= GENERIC[id].max) continue;
      if (id === 'snack' && this.hp / this.maxHp > 0.85) continue;
      pool.push({ card: { type: 'generic', id }, w: id === 'snack' ? (this.hp / this.maxHp < 0.5 ? 2.5 : 0.8) : 0.9 });
    }
    const out: Card[] = [];
    while (out.length < 3 && pool.length) {
      const total = pool.reduce((s, p) => s + p.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length - 1; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      out.push(pool[idx].card);
      pool.splice(idx, 1);
    }
    if (!out.length) out.push({ type: 'generic', id: 'snack' });
    return out;
  }

  private openChoice(): void {
    this.choice = this.rollCards();
    this.sfx('levelup');
  }

  // ───────────── 메인 업데이트 ─────────────

  update(rawDt: number): void {
    if (this.pickAnim && !this.paused) {
      this.pickAnim.t -= Math.min(rawDt, 0.05);
      if (this.pickAnim.t <= 0) this.pickAnim = null;
      return;
    }
    if (!this.active) return;
    if (this.hitStop > 0) { this.hitStop -= Math.min(rawDt, 0.05); return; }
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.time += dt;
    this.rallyCd = Math.max(0, this.rallyCd - dt);
    this.rallyT = Math.max(0, this.rallyT - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.shake = Math.max(0, this.shake - dt);

    this.updateSpawns(dt);
    this.updateEnemies(dt);
    this.updateSquad(dt);
    this.updateShots(dt);
    this.updateFields(dt);
    this.updateFx(dt);

    if (this.hp <= 0) {
      this.hp = 0;
      this.finish(false);
    } else if (this.time >= this.stage.duration && this.bossSpawned && !this.enemies.some((e) => !e.dead)) {
      this.finish(true);
    }
  }

  private finish(victory: boolean): void {
    this.phase = victory ? 'victory' : 'defeat';
    this.sfx(victory ? 'win' : 'lose');
    this.choice = null;
    const ratio = this.hp / this.maxHp;
    const stars = !victory ? 0 : ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
    this.result = { victory, stars, kills: this.kills, time: this.time, progress: this.progress, discovered: [...this.discovered], bonusCoins: this.bonusCoins };
  }

  // ───────────── 출현 ─────────────

  private pickKind(mix: Mix): EnemyKind {
    const entries = Object.entries(mix) as [EnemyKind, number][];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [k, w] of entries) { r -= w; if (r <= 0) return k; }
    return entries[0][0];
  }

  /**
   * 한 마리에 몇 마리 몫을 담을지: 적이 너무 많으면 폰이 멈추니,
   * 후반 스테이지는 숫자를 줄이고 그만큼 한 마리를 튼튼하게 만든다.
   */
  private get pack(): number {
    return Math.max(1, this.stage.rate[1] / 6);
  }
  /** 화면에 동시에 있을 수 있는 최대 적 수 (넘치면 다음 적에 체력을 몰아준다) */
  private static readonly MAX_ALIVE = 60;
  private overflow = 0;

  private spawn(kind: EnemyKind, x = 30 + Math.random() * (W - 60), y = CONFIG.fieldTop - 20, worth = this.pack): Enemy {
    const def = ENEMIES[kind];
    const mul = this.stage.mul * (1 + this.progress * 1.1); // 시간이 갈수록 조금씩 강해짐
    const w = def.boss ? 1 : worth;
    const e: Enemy = {
      uid: this.nextUid++, def, x, y, baseX: x,
      hp: def.hp * mul * HORDE.hp * Math.pow(w, 0.75), maxHp: def.hp * mul * HORDE.hp * Math.pow(w, 0.75), atk: def.atk * this.stage.mul * HORDE.atk * Math.pow(w, 0.7),
      atkTimer: 0, attacking: false, slowT: 0, slowAmt: 0, stunT: 0, hitFlash: 0,
      animT: Math.random() * 10, dead: false, deathT: 0,
    };
    e.worth = w;
    if (def.boss) { e.hp /= HORDE.hp; e.maxHp /= HORDE.hp; e.atk /= HORDE.atk; }
    if (!this.seen.has(kind)) {
      this.seen.add(kind);
      this.discovered.push(kind);
      this.banner = { text: `🔍 첫 발견! ${def.name}`, t: 2 };
      this.sfx('discover');
    }
    this.enemies.push(e);
    return e;
  }

  /** 최대 수를 넘으면 지금 나올 적의 몫을 쌓아 두었다가 다음 적에 얹는다 */
  private spawnCapped(kind: EnemyKind, x?: number, y?: number, worth = this.pack): void {
    let alive = 0;
    for (const e of this.enemies) if (!e.dead) alive++;
    if (alive >= Game.MAX_ALIVE) { this.overflow += worth * 0.4; return; }
    const extra = Math.min(this.overflow, worth * 2);
    this.overflow -= extra;
    this.spawn(kind, x, y, worth + extra);
  }

  private updateSpawns(dt: number): void {
    const st = this.stage;
    if (this.time < st.duration) {
      const k = this.progress;
      // 레퍼런스처럼: 처음엔 한두 마리씩, 후반엔 폭발적으로
      const rate = st.rate[1] * (0.05 + Math.pow(k, 1.8) * 1.35) + st.rate[0] * 0.15;
      this.spawnAcc += (rate / this.pack) * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        this.spawnCapped(this.pickKind(k < 0.5 ? st.early : st.late));
      }
      st.bursts.forEach((bu, i) => {
        if (this.burstsDone.has(i) || this.time < bu.t) return;
        this.burstsDone.add(i);
        this.banner = { text: `⚠ ${ENEMIES[bu.kind].name} 떼가 몰려온다!`, t: 1.8 };
        const n = Math.max(1, Math.round(bu.count / this.pack));
        for (let j = 0; j < n; j++) {
          this.spawnCapped(bu.kind, 30 + ((j + 0.5) / n) * (W - 60), CONFIG.fieldTop - 20 - (j % 3) * 22, (bu.count / n) * this.pack);
        }
      });
    } else if (!this.bossSpawned) {
      this.bossSpawned = true;
      if (st.boss) {
        const kinds: EnemyKind[] = [];
        for (let i = 0; i < st.boss.count; i++) kinds.push(st.boss.kind);
        if (st.boss.with) kinds.push(st.boss.with);
        kinds.forEach((kd, i) => this.spawn(kd, W / 2 + (i - (kinds.length - 1) / 2) * 180, CONFIG.fieldTop - 40));
        this.bossIntro = { kinds: [...new Set(kinds)], at: this.time };
        this.banner = { text: `👑 ${ENEMIES[st.boss.kind].name}${st.boss.with ? `와 ${ENEMIES[st.boss.with].name}` : ''} 등장!`, t: 2.5 };
        this.sfx('boss');
      } else {
        const kind = this.pickKind(st.late);
        for (let j = 0; j < 24; j++) this.spawn(kind, 30 + ((j + 0.5) / 24) * (W - 60), CONFIG.fieldTop - 20 - (j % 2) * 26);
        this.banner = { text: '마지막 무리! 모두 물리치면 승리!', t: 2.2 };
      }
    }
  }

  // ───────────── 적 ─────────────

  private updateEnemies(dt: number): void {
    const g = this.guard;
    for (const e of this.enemies) {
      e.animT += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      if (e.dead) { e.deathT += dt; continue; }
      if (e.stunT > 0) { e.stunT -= dt; continue; }
      if (e.kbV && e.kbV > 0) {
        e.y = Math.max(CONFIG.fieldTop - 10, e.y - e.kbV * dt);
        e.kbV *= Math.exp(-7 * dt);
        if (e.kbV < 6) e.kbV = 0;
        if (e.kbV > 25 && !e.def.boss) { e.attacking = false; continue; }
      }
      const slow = e.slowT > 0 ? 1 - e.slowAmt : 1;
      const stopY = CONFIG.barricadeY - e.def.size * 0.6 - (e.def.range ?? 0);
      if (e.def.flee) {
        // 황금쥐: 5초 내려왔다가 도망. 화면 밖으로 나가면 사라짐
        e.fleeT = (e.fleeT ?? 0) + dt;
        e.attacking = false;
        if (e.fleeT < 5) e.y = Math.min(stopY - 120, e.y + e.def.speed * slow * dt);
        else e.y -= e.def.speed * 1.5 * slow * dt;
        e.x = Math.max(20, Math.min(W - 20, e.baseX + Math.sin(e.animT * 3) * 40));
        if (e.fleeT > 5 && e.y < CONFIG.fieldTop - 50) { e.dead = true; e.deathT = 1; }
        continue;
      }
      if (e.def.burrow) {
        const was = e.burrowed;
        e.burrowed = e.y < stopY - 70;
        if (was && !e.burrowed) { this.fx.push({ kind: 'dirt', x: e.x, y: e.y, r: 34, t: 0, life: 0.5, color: '#a07050' }); this.sfx('thud'); }
      }
      const hopK = e.def.hop ? Math.max(0, Math.sin(e.animT * 4)) * 2.4 : 1;
      if (e.y < stopY) {
        e.attacking = false;
        e.y = Math.min(stopY, e.y + e.def.speed * slow * hopK * dt);
        const wob = e.def.flying ? 26 : e.def.boss ? 4 : 8;
        e.x = Math.max(20, Math.min(W - 20, e.baseX + Math.sin(e.animT * (e.def.flying ? 2.2 : 1.3)) * wob));
      } else {
        e.attacking = true;
        e.atkTimer += dt * slow;
      }
      if (e.def.meteor) {
        e.meteorT = (e.meteorT ?? 0) + dt;
        if (e.meteorT >= e.def.meteor.every) {
          e.meteorT = 0;
          const mx = 40 + Math.random() * (W - 80);
          this.shots.push({ kind: 'web', eshot: 'meteor', x: mx, y: CONFIG.fieldTop, vx: 0, vy: 420, dmg: e.atk * e.def.meteor.dmg, radius: 16, pierce: 0, color: '#ffb000', crit: false, hit: new Set(), tick: 0, done: false, spin: 0, src: -1 });
        }
      }
      if (e.def.summon) {
        e.summonT = (e.summonT ?? 0) + dt;
        if (e.summonT >= e.def.summon.every) {
          e.summonT = 0;
          const sm = e.def.summon;
          for (let j = 0; j < sm.count; j++) this.spawn(sm.kind, Math.max(30, Math.min(W - 30, e.x + (j - (sm.count - 1) / 2) * 36)), e.y + 10);
          this.fx.push({ kind: e.def.id === 'ratemperor' ? 'ring' : 'poof', x: e.x, y: e.y + 20, r: e.def.id === 'ratemperor' ? 80 : 40, t: 0, life: 0.5, color: '#ffffff' });
        }
      }
      if (e.attacking) {
        if (e.atkTimer >= e.def.atkInterval) {
          e.atkTimer = 0;
          if (e.def.range) {
            this.shots.push({ kind: 'web', eshot: e.def.shot ?? 'web', x: e.x, y: e.y + e.def.size, vx: 0, vy: e.def.shot === 'tongue' ? 900 : 360, dmg: e.atk, radius: e.def.shot === 'tongue' ? 10 : 5, pierce: 0, color: '#ffffff', crit: false, hit: new Set(), tick: 0, done: false, spin: 0, src: -1 });
          } else {
            this.damageBarricade(e.atk, e.x);
            if (g.thorns > 0) {
              this.damageEnemy(e, g.power * g.thorns * this.dmgMul, { color: '#c9c9d6', src: g.slot });
              if (Math.random() < 0.3) this.fx.push({ kind: 'thorns', x: e.x, y: CONFIG.barricadeY, r: 14, t: 0, life: 0.25, color: '#ffffff' });
            }
          }
        }
      }
    }
    this.separate();
    this.enemies = this.enemies.filter((e) => !(e.dead && e.deathT > 0.45));
  }

  /** 적끼리 겹치지 않게 밀어내서 바리케이드 앞에 무리가 쌓이게 한다 */
  private separate(): void {
    const list = this.enemies.filter((e) => !e.dead && !e.def.flying);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = (a.def.size + b.def.size) * 0.75;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= min) continue;
        const push = (min - d) * 0.5;
        const nx = dx / d;
        const ny = dy / d;
        const wa = a.def.boss ? 0.1 : 1;
        const wb = b.def.boss ? 0.1 : 1;
        a.x -= nx * push * wa; a.baseX -= nx * push * wa;
        b.x += nx * push * wb; b.baseX += nx * push * wb;
        // 아래(앞) 쪽 적은 그대로 두고, 뒤쪽 적만 위로 밀린다
        if (dy > 0) a.y -= Math.abs(ny) * push * wa; else b.y -= Math.abs(ny) * push * wb;
      }
    }
    for (const e of list) { e.x = Math.max(16, Math.min(W - 16, e.x)); e.baseX = Math.max(16, Math.min(W - 16, e.baseX)); }
  }

  private damageBarricade(dmg: number, x: number): void {
    this.sfx('hurt');
    let real = dmg * (1 - this.guard.reduce) * (1 - this.bonus.reduce);
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, real);
      this.shield -= absorbed;
      real -= absorbed;
      if (real <= 0) return;
    }
    this.hp -= real;
    this.minHpRatio = Math.min(this.minHpRatio, Math.max(0, this.hp / this.maxHp));
    this.hitFlash = 0.12;
    if (Math.random() < 0.35) this.addFloat(x, CONFIG.barricadeY + 18, `-${Math.round(real)}`, '#ff6b6b', 13);
  }

  private repair(amount: number): void {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    const healed = Math.round(this.hp - before);
    if (healed > 0) {
      this.addFloat(W / 2, CONFIG.barricadeY + 30, `+${healed}`, '#7dff9a', 18);
      this.fx.push({ kind: 'heal', x: W / 2, y: CONFIG.barricadeY + 20, r: W / 2, t: 0, life: 0.6, color: '#7dff9a' });
    }
  }

  damageEnemy(e: Enemy, dmg: number, o: { crit?: boolean; color?: string; slow?: number; slowDur?: number; stun?: number; knock?: number; quiet?: boolean; src?: number } = {}): void {
    if (e.dead || e.burrowed) return;
    if (e.def.armor) dmg *= 1 - e.def.armor;
    if (o.src !== undefined && o.src >= 0) this.squad[o.src].dealt += Math.min(dmg, e.hp);
    e.hp -= dmg;
    if (o.crit) this.stop(0.035, 0.06);
    else if (!o.quiet && dmg > e.maxHp * 0.3) this.stop(0.03);
    if (o.crit) { this.sfx('crit'); this.fx.push({ kind: 'boom', x: e.x, y: e.y - e.def.size * 0.3, r: 16 + e.def.size * 0.4, t: 0, life: 0.35, color: '#ffb347' }); }
    else if (!o.quiet) this.sfx('hit');
    e.hitFlash = 0.12;
    if (o.slow) { e.slowAmt = Math.max(e.def.boss ? o.slow * 0.5 : o.slow, e.slowT > 0 ? e.slowAmt : 0); e.slowT = Math.max(e.slowT, o.slowDur ?? 1); }
    if (o.stun) e.stunT = Math.max(e.stunT, e.def.boss ? o.stun * 0.3 : o.stun);
    // 넉백: 공격 종류에 따라 뒤로 '스윽' 밀려남 (속도로 주고 점점 감속)
    const kindKnock = o.src !== undefined && o.src >= 0 ? KNOCK_BY_KIND[this.squad[o.src].weapon.kind] ?? 0 : 0;
    const knock = (o.knock ?? 0) + kindKnock * (o.crit ? 1.6 : 1);
    if (knock > 0) {
      const resist = e.def.boss ? 0.15 : e.def.armor ? 1 - e.def.armor * 0.8 : 1;
      e.kbV = Math.min(900, (e.kbV ?? 0) + knock * resist * 7);
    }
    if (!o.quiet && Math.random() < 0.4) this.fx.push({ kind: 'spark', x: e.x + (Math.random() - 0.5) * e.def.size, y: e.y - e.def.size * 0.4, r: 8 + e.def.size * 0.5, t: 0, life: 0.18, color: o.color ?? '#fff3b0' });
    if (!o.quiet || o.crit || Math.random() < 0.3) {
      this.addFloat(e.x + (Math.random() - 0.5) * 16, e.y - e.def.size - 6, o.crit ? `${fmtDmg(dmg)}!` : fmtDmg(dmg),
        o.crit ? '#ff4d5e' : o.color ?? '#ffffff', o.crit ? 28 : dmg > 300 ? 22 : 17);
    }
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      e.deathT = 0;
      this.kills += Math.round(e.worth ?? 1);
      this.burst(e.x, e.y, e.def.color, e.def.boss ? 24 : 4);
      this.fx.push({ kind: 'poof', x: e.x, y: e.y, r: e.def.size * 1.5, t: 0, life: 0.45, color: '#ffffff' });
      this.sfx(e.def.boss ? 'boom' : 'kill');
      if (e.def.boss) this.fx.push({ kind: 'boom', x: e.x, y: e.y, r: 90, t: 0, life: 0.6, color: '#ff8a3d' });
      if (e.def.id === 'pigeon' || e.def.id === 'crowboss') this.fx.push({ kind: 'feather', x: e.x, y: e.y, r: e.def.size * 1.6, t: 0, life: 0.6, color: '#fff' });
      if (e.def.id === 'slug') this.fx.push({ kind: 'slime', x: e.x, y: e.y, r: 26, t: 0, life: 3, color: '#8fd14f' });
      if (e.def.flee) {
        const bonus = Math.round(30 + this.stage.no * 12);
        this.bonusCoins += bonus;
        this.fx.push({ kind: 'coins', x: e.x, y: e.y, r: 40, t: 0, life: 0.8, color: '#ffd84d' });
        this.addFloat(e.x, e.y - 30, `+${bonus} 코인!`, '#ffd84d', 20);
        this.sfx('gacha');
      }
      const goo = e.def.id === 'mouse' || e.def.id === 'ratking' ? 'rgba(200,195,210,0.55)' : e.def.id === 'spider' ? 'rgba(150,110,200,0.45)' : 'rgba(150,190,60,0.42)';
      this.decals.push({ x: e.x, y: e.y, r: e.def.size * (e.def.boss ? 2.2 : 1.4), color: goo, t: 0, seed: Math.random() * 10 });
      if (this.decals.length > 70) this.decals.shift();
      this.gainXp(e.def.xp * (e.worth ?? 1));
      if (e.def.boss) { this.hitStop = 0.18; this.shake = 0.6; this.banner = { text: `${e.def.name} 격파!`, t: 1.8 }; }
    }
  }

  private gainXp(n: number): void {
    if (this.phase !== 'playing') return;
    this.xp += n * (1 + this.bonus.xp);
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.choice) this.openChoice();
  }

  // ───────────── 고양이 스킬 ─────────────

  private alive(): Enemy[] { return this.enemies.filter((e) => !e.dead && !e.burrowed && e.y > CONFIG.fieldTop - 30); }

  private frontmost(list: Enemy[]): Enemy | null {
    let best: Enemy | null = null;
    for (const e of list) if (!best || e.y > best.y) best = e;
    return best;
  }

  /** 반경 r 안에 적이 가장 많이 모인 지점 */
  private densest(list: Enemy[], r: number): { x: number; y: number } | null {
    if (!list.length) return null;
    let best = list[0];
    let bestN = -1;
    const sample = list.length > 40 ? list.filter(() => Math.random() < 40 / list.length) : list;
    for (const c of sample) {
      let n = 0;
      for (const e of list) if (Math.hypot(e.x - c.x, e.y - c.y) <= r) n += e.def.boss ? 3 : 1;
      n += c.y / 1000; // 동점이면 앞쪽 우선
      if (n > bestN) { bestN = n; best = c; }
    }
    return { x: best.x, y: best.y };
  }

  /** 폭 w의 세로줄에 적이 가장 많은 x */
  private bestColumn(list: Enemy[], w: number, exclude?: number): number | null {
    if (!list.length) return null;
    let bestX = list[0].x;
    let bestN = -1;
    for (const c of list) {
      if (exclude !== undefined && Math.abs(c.x - exclude) < w) continue;
      let n = 0;
      for (const e of list) if (Math.abs(e.x - c.x) <= w / 2 + e.def.size * 0.5) n++;
      if (n > bestN) { bestN = n; bestX = c.x; }
    }
    return bestN < 0 ? null : bestX;
  }

  sfx(name: string): void {
    if (this.events.length < 40) this.events.push(name);
  }

  say(m: Member, text: string): void {
    m.speech = { text, t: 2.4 };
  }

  private chatterT = 8;

  private updateSquad(dt: number): void {
    const spd = this.speedMul;
    this.chatterT -= dt;
    if (this.chatterT <= 0) {
      this.chatterT = 9 + Math.random() * 8;
      const awake = this.squad.filter((m) => m.level > 0 && !m.speech);
      if (awake.length) this.say(awake[Math.floor(Math.random() * awake.length)], BATTLE_LINES[Math.floor(Math.random() * BATTLE_LINES.length)]);
    }
    // 집사 지원 출동: 로봇청소기
    if (this.time > 12) {
      this.supportT -= dt;
      if (this.supportT <= 0) {
        this.supportT = 26;
        const y = CONFIG.fieldTop + 140 + Math.random() * (CONFIG.barricadeY - CONFIG.fieldTop - 320);
        const fromLeft = Math.random() < 0.5;
        this.shots.push({ kind: 'vacuum', x: fromLeft ? -50 : W + 50, y, vx: fromLeft ? 230 : -230, vy: 0, dmg: this.hero.power * 1.3 * this.dmgMul, radius: 36, pierce: 999, color: '#9fd8ff', crit: false, hit: new Set(), tick: 0, done: false, spin: 0, src: -1 });
        this.banner = { text: '🤖 집사의 로봇청소기 출동!', t: 1.6 };
        this.sfx('vacuum');
      }
    }
    for (const m of this.squad) {
      m.x += (m.targetX - m.x) * Math.min(1, dt * 6);
      m.enterT = Math.max(0, m.enterT - dt);
      if (m.speech) { m.speech.t -= dt; if (m.speech.t <= 0) m.speech = null; }
      m.swing = Math.max(0, m.swing - dt * 3);
      m.wakeFx = Math.max(0, m.wakeFx - dt);
      if (m.level <= 0) continue;
      m.ultCd = Math.max(0, m.ultCd - dt);
      m.ultT = Math.max(0, m.ultT - dt);
      const frenzy = m.ultT > 0 ? ULT_RATE : 1;
      this.sideAttack(m, dt * frenzy);
      if (m.slot === 0) this.leaderStamp(m, dt * frenzy);
      const p = this.params(m);
      if (p.interval <= 0) continue;
      m.timer += dt * (m.weapon.kind === 'heal' ? 1 : spd) * frenzy;
      if (m.timer < p.interval) continue;
      if (this.fire(m, p)) {
        m.timer = 0;
        m.swing = 1;
      } else {
        m.timer = p.interval; // 대상이 생길 때까지 대기
      }
    }
  }

  /** 지원·수비형 고양이도 직접 싸우게 하는 보조 공격 (기본 스킬과 따로 돈다) */
  private static SIDE: Partial<Record<string, { every: number; dmg: number; style: 'bash' | WeaponFx; pierce?: number }>> = {
    godeungeo: { every: 2.2, dmg: 1.7, style: 'bash' },
    samsaek: { every: 1.5, dmg: 1.0, style: 'hairball' },
    persian: { every: 1.3, dmg: 0.8, style: 'notes', pierce: 3 },
    ragdoll: { every: 1.7, dmg: 1.1, style: 'cushion', pierce: 1 },
  };

  /** 대장 전용 공격 '대장의 발도장': 적이 가장 몰린 곳에 거대한 금빛 발바닥을 찍는다 */
  static readonly STAMP_EVERY = 3.4;
  private leaderStamp(m: Member, dt: number): void {
    const [dmgK, freqK] = LEADER_STAMP[m.def.id] ?? [1, 1];
    m.stampT = (m.stampT ?? 0) + dt * this.speedMul * freqK;
    if (m.stampT < Game.STAMP_EVERY) return;
    const list = this.alive().filter((e) => e.y > CONFIG.fieldTop + 20);
    const c = this.densest(list, 70);
    if (!c) return;
    m.stampT = 0;
    const grow = (1 + 0.12 * (m.level - 1)) * (m.evolved ? 1.6 : 1);
    const r = 62 + Math.min(40, m.level * 3);
    const dmg = m.power * 1.0 * dmgK * grow * this.dmgMul;
    for (const e of list) {
      if (Math.hypot(e.x - c.x, e.y - c.y) <= r + e.def.size * 0.5) { this.stampDealt += Math.min(dmg, e.hp); this.damageEnemy(e, dmg, { src: m.slot, knock: 16, stun: 0.25, quiet: true, color: '#ffd84d' }); }
    }
    this.fx.push({ kind: 'stamp', x: c.x, y: c.y, r, t: 0, life: 0.55, color: '#ffd84d' });
    this.sfx('thud');
    this.shake = Math.max(this.shake, 0.12);
  }

  private sideAttack(m: Member, dt: number): void {
    const sd = Game.SIDE[m.def.id];
    if (!sd) return;
    m.sideT = (m.sideT ?? 0) + dt * this.speedMul;
    if (m.sideT < sd.every) return;
    const grow = (1 + 0.12 * (m.level - 1)) * (m.evolved ? 1.6 : 1);
    const dmg = m.power * sd.dmg * grow * this.dmgMul;
    const list = this.alive();
    if (sd.style === 'bash') {
      // 스크래처 방패로 앞에 붙은 적들을 밀쳐낸다
      const near = list.filter((e) => e.y > CONFIG.barricadeY - 160 && Math.abs(e.x - m.x) < 110);
      if (!near.length) return;
      for (const e of near) this.damageEnemy(e, dmg, { src: m.slot, knock: 38, quiet: true });
      this.fx.push({ kind: 'slam', x: m.x, y: CONFIG.barricadeY - 70, r: 100, t: 0, life: 0.35, color: '#c9c9d6' });
      this.sfx('thud');
    } else {
      const t = this.frontmost(list.filter((e) => e.y > CONFIG.fieldTop));
      if (!t) return;
      const ox = m.x;
      const oy = m.y - 46;
      const a = Math.atan2(t.y - oy, t.x - ox);
      const sp = 560;
      this.shots.push({ kind: 'bolt', x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, radius: 10, pierce: sd.pierce ?? 0, color: m.weapon.color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: sd.style, src: m.slot });
      this.sfx('throw');
    }
    m.sideT = 0;
    m.swing = Math.max(m.swing, 0.6);
  }

  private static FIRE_SFX: Partial<Record<WeaponFx, string>> = {
    paw: 'pop', yarn: 'yarn', claws: 'scratch', scratch: 'scratch', wheel: 'wheel', bell: 'bell', feather: 'yarn', butt: 'thud', laser: 'laser', groom: 'heal',
    churu: 'throw', zap: 'zap', pounce: 'pounce', mousetoy: 'throw', water: 'splash', hairball: 'throw',
  };

  private fire(m: Member, p: WeaponParams): boolean {
    const ok = this.fireInner(m, p);
    if (ok) { const n = Game.FIRE_SFX[m.weapon.fx]; if (n) this.sfx(n); }
    return ok;
  }

  private fireInner(m: Member, p: WeaponParams): boolean {
    const dmg = m.power * p.dmg * this.dmgMul * (m.ultT > 0 ? ULT_DMG : 1);
    const list = this.alive();
    const ox = m.x;
    const oy = m.y - 46;
    const color = m.weapon.color;
    switch (m.weapon.kind) {
      case 'bolt': {
        const t = this.frontmost(list.filter((e) => e.y > CONFIG.fieldTop));
        if (!t) return false;
        const n = p.count ?? 1;
        const base = Math.atan2(t.y - oy, t.x - ox);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.12;
          const sp = p.speed ?? 700;
          this.shots.push({ kind: 'bolt', x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, radius: p.radius ?? 7, pierce: p.pierce ?? 0, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx, src: m.slot });
        }
        return true;
      }
      case 'roll': {
        if (!list.length) return false;
        const n = p.count ?? 1;
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? (this.bestColumn(list, 80) ?? W / 2) : 90 + i * (W - 180);
          this.shots.push({ kind: 'roll', x, y: CONFIG.barricadeY - 20, vx: 0, vy: -(p.speed ?? 90), dmg, radius: p.radius ?? 40, pierce: 999, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx, src: m.slot });
        }
        return true;
      }
      case 'snipe': {
        let t: Enemy | null = null;
        for (const e of list) if (!t || e.hp > t.hp) t = e;
        if (!t) return false;
        const crit = Math.random() < (p.crit ?? 0);
        this.fx.push({ kind: 'snipe', x: ox, y: oy, x2: t.x, y2: t.y, r: 3, t: 0, life: 0.35, color: crit ? '#ffd84d' : '#ffffff', style: m.weapon.fx });
        this.damageEnemy(t, crit ? dmg * (p.critMul ?? 2) : dmg, { crit, src: m.slot });
        return true;
      }
      case 'dash': {
        const n = p.count ?? 1;
        let prev: number | undefined;
        let any = false;
        for (let i = 0; i < n; i++) {
          const x = this.bestColumn(list, p.width ?? 46, prev);
          if (x === null) break;
          prev = x;
          any = true;
          this.fx.push({ kind: 'dash', x, y: CONFIG.barricadeY, y2: CONFIG.fieldTop, r: p.width ?? 46, t: 0, life: 0.45, color });
          for (const e of list) {
            if (Math.abs(e.x - x) <= (p.width ?? 46) / 2 + e.def.size * 0.5) this.damageEnemy(e, dmg, { knock: p.knock, quiet: true, src: m.slot });
          }
        }
        return any;
      }
      case 'frost': {
        const c = this.densest(list, p.radius ?? 70);
        if (!c) return false;
        this.fields.push({ x: c.x, y: c.y, r: p.radius ?? 70, t: 0, life: p.range ?? 3, slow: p.slow ?? 0.4, dmg, tick: 0, sx: m.x + 14, sy: m.y - 70, src: m.slot });
        return true;
      }
      case 'quake': {
        const range = p.range ?? 120;
        const hits = list.filter((e) => e.y >= CONFIG.barricadeY - range && !e.def.flying);
        this.fx.push({ kind: 'quake', x: W / 2, y: CONFIG.barricadeY, r: range, t: 0, life: 0.5, color });
        this.shake = Math.max(this.shake, 0.2);
        for (const e of hits) this.damageEnemy(e, dmg, { stun: p.stun, quiet: true, src: m.slot });
        return true;
      }
      case 'slam': {
        const n = p.count ?? 1;
        let any = false;
        let remaining = list;
        for (let i = 0; i < n; i++) {
          const c = this.densest(remaining, p.radius ?? 80);
          if (!c) break;
          any = true;
          this.slams.push({ x: c.x, y: c.y, r: p.radius ?? 80, delay: 0.5, dmg, knock: p.knock ?? 0, src: m.slot });
          remaining = remaining.filter((e) => Math.hypot(e.x - c.x, e.y - c.y) > (p.radius ?? 80) * 1.5);
          if (!remaining.length) remaining = list;
        }
        return any;
      }
      case 'beam': {
        const n = p.count ?? 1;
        let prev: number | undefined;
        let any = false;
        for (let i = 0; i < n; i++) {
          const x = this.bestColumn(list, p.width ?? 30, prev);
          if (x === null) break;
          prev = x;
          any = true;
          this.fx.push({ kind: 'beam', x, y: CONFIG.barricadeY - 10, y2: 0, r: p.width ?? 30, t: 0, life: 0.4, color });
          for (const e of list) if (Math.abs(e.x - x) <= (p.width ?? 30) / 2 + e.def.size * 0.6) this.damageEnemy(e, dmg, { color: '#e6d6ff', src: m.slot });
        }
        return any;
      }
      case 'heal': {
        if (this.hp >= this.maxHp) return false;
        this.repair(this.maxHp * (p.repair ?? 0.02));
        return true;
      }
      case 'lob': {
        const n = p.count ?? 1;
        let rest = list;
        let any = false;
        for (let i = 0; i < n; i++) {
          const c = this.densest(rest, p.radius ?? 60);
          if (!c) break;
          any = true;
          this.shots.push({ kind: 'lob', x: ox, y: oy, sx: ox, sy: oy, tx: c.x, ty: c.y, age: 0, dur: 0.75, vx: 0, vy: 0, dmg, radius: p.radius ?? 60, pierce: 0, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx, src: m.slot });
          rest = rest.filter((e) => Math.hypot(e.x - c.x, e.y - c.y) > (p.radius ?? 60) * 1.4);
          if (!rest.length) rest = list;
        }
        return any;
      }
      case 'chain': {
        let cur = this.frontmost(list);
        if (!cur) return false;
        const pts = [{ x: ox, y: oy }];
        const hit = new Set<number>();
        let d = dmg;
        for (let j = 0; j <= (p.jumps ?? 3) && cur; j++) {
          hit.add(cur.uid);
          pts.push({ x: cur.x, y: cur.y });
          this.damageEnemy(cur, d, { stun: p.stun, src: m.slot, color: '#bfe8ff' });
          d *= 0.88;
          let next: Enemy | null = null;
          let bd = 130;
          for (const e of list) {
            if (e.dead || hit.has(e.uid)) continue;
            const dd = Math.hypot(e.x - cur.x, e.y - cur.y);
            if (dd < bd) { bd = dd; next = e; }
          }
          cur = next;
        }
        this.fx.push({ kind: 'zap', x: ox, y: oy, r: 0, t: 0, life: 0.3, color, pts });
        return true;
      }
      case 'pounce': {
        // 체력 비율이 낮은 적이 많은 곳으로 덮친다
        const c = this.densest(list.filter((e) => e.y > CONFIG.fieldTop + 40), p.radius ?? 55);
        if (!c) return false;
        this.fx.push({ kind: 'pounce', x: ox, y: oy, x2: c.x, y2: c.y, r: p.radius ?? 55, t: 0, life: 0.35, color });
        this.slams.push({ x: c.x, y: c.y, r: p.radius ?? 55, delay: 0.3, dmg, knock: 0, src: m.slot, execute: p.execute ?? 0, pounce: true });
        return true;
      }
      case 'boomerang': {
        const t = this.frontmost(list);
        if (!t) return false;
        const n = p.count ?? 1;
        const base = Math.atan2(t.y - oy, t.x - ox);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.35;
          const sp = p.speed ?? 520;
          this.shots.push({ kind: 'boomer', x: ox, y: oy, sx: ox, sy: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, range: p.range ?? 380, back: false, dmg, radius: p.radius ?? 14, pierce: 999, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx, src: m.slot });
        }
        return true;
      }
      case 'barrier': {
        const cap = this.maxHp * 0.3;
        if (this.shield >= cap) return false;
        this.shield = Math.min(cap, this.shield + this.maxHp * (p.shield ?? 0.06));
        this.fx.push({ kind: 'shield', x: W / 2, y: CONFIG.barricadeY, r: W / 2, t: 0, life: 0.7, color });
        this.sfx('shield');
        return true;
      }
      case 'spray': {
        const range = p.range ?? 260;
        const near = list.filter((e) => e.y > CONFIG.barricadeY - range - 40);
        if (!near.length) return false;
        const tx = this.bestColumn(near, 90) ?? W / 2;
        const sx = m.x;
        const sy = CONFIG.barricadeY - 10;
        const ang = Math.atan2(-range, tx - sx);
        const cone = p.cone ?? 0.45;
        for (const e of near) {
          const da = Math.atan2(e.y - sy, e.x - sx) - ang;
          const dd = Math.hypot(e.x - sx, e.y - sy);
          if (dd <= range && Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) <= cone) this.damageEnemy(e, dmg, { knock: p.knock, quiet: true, src: m.slot, color: '#bfe8ff' });
        }
        this.fx.push({ kind: 'spray', x: sx, y: sy, r: range, t: 0, life: 0.45, color, ang, x2: cone });
        return true;
      }
      case 'mine': {
        if (this.mines.filter((x) => x.src === m.slot).length >= (p.count ?? 3)) return false;
        // 적이 지나갈 길목(바리케이드 앞 중간쯤)에 깐다
        const col = this.bestColumn(list, 70) ?? 60 + Math.random() * (W - 120);
        const y = CONFIG.barricadeY - 120 - Math.random() * 220;
        this.mines.push({ x: Math.max(30, Math.min(W - 30, col + (Math.random() - 0.5) * 60)), y, r: p.radius ?? 55, dmg, src: m.slot, t: 0, seed: Math.random() * 10 });
        return true;
      }
      default:
        return false;
    }
  }

  private updateShots(dt: number): void {
    const list = this.enemies;
    for (const s of this.shots) {
      s.spin += dt * 12;
      if (s.kind === 'bolt') { (s.trail ??= []).push({ x: s.x, y: s.y }); if (s.trail.length > 6) s.trail.shift(); }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind === 'lob') {
        s.age! += dt;
        const k = Math.min(1, s.age! / s.dur!);
        s.x = s.sx! + (s.tx! - s.sx!) * k;
        s.y = s.sy! + (s.ty! - s.sy!) * k - Math.sin(k * Math.PI) * 140;
        if (k >= 1) {
          s.done = true;
          this.fx.push({ kind: 'boom', x: s.tx!, y: s.ty!, r: s.radius * 0.9, t: 0, life: 0.45, color: '#ffb347' });
          this.sfx('boom');
          for (const e of list) if (!e.dead && Math.hypot(e.x - s.tx!, e.y - s.ty!) <= s.radius + e.def.size * 0.5) this.damageEnemy(e, s.dmg, { src: s.src });
        }
        continue;
      }
      if (s.kind === 'vacuum') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick = 0.2;
          for (const e of list) {
            if (e.dead || Math.abs(e.x - s.x) > s.radius + e.def.size || Math.abs(e.y - s.y) > s.radius + e.def.size) continue;
            this.damageEnemy(e, s.dmg, { quiet: true, knock: 6 });
            if (Math.random() < 0.3) this.particles.push({ x: e.x, y: e.y, vx: (s.x - e.x) * 3, vy: (s.y - e.y) * 3, t: 0, life: 0.3, color: '#d8d0e0', r: 3 });
          }
        }
        if (s.x < -80 || s.x > W + 80) s.done = true;
        continue;
      }
      if (s.kind === 'boomer') {
        s.age = (s.age ?? 0) + dt;
        if (!s.back && (Math.hypot(s.x - s.sx!, s.y - s.sy!) >= s.range! || s.y < CONFIG.fieldTop)) { s.back = true; s.hit.clear(); }
        if (s.back) {
          // 돌아올 땐 던진 고양이에게 곧장 날아온다 (예전엔 빙빙 돌며 안 사라지는 경우가 있었음)
          const dx = s.sx! - s.x;
          const dy = s.sy! - s.y;
          const d = Math.hypot(dx, dy);
          const sp = Math.hypot(s.vx, s.vy);
          const turn = Math.min(1, dt * 14);
          s.vx += ((dx / Math.max(1, d)) * sp - s.vx) * turn;
          s.vy += ((dy / Math.max(1, d)) * sp - s.vy) * turn;
          if (d < 30 + sp * dt) { s.done = true; continue; }
        }
        // 안전장치: 오래 떠 있으면 사라짐
        if (s.age > 3) { s.done = true; this.fx.push({ kind: 'poof', x: s.x, y: s.y, r: 20, t: 0, life: 0.3, color: '#fff' }); continue; }
        for (const e of list) {
          if (e.dead || s.hit.has(e.uid)) continue;
          if (Math.hypot(e.x - s.x, e.y - s.y) <= s.radius + e.def.size) {
            s.hit.add(e.uid);
            this.damageEnemy(e, s.dmg, { src: s.src });
          }
        }
        continue;
      }
      if (s.kind === 'web') {
        if (s.y >= CONFIG.barricadeY) {
          s.done = true;
          this.damageBarricade(s.dmg, s.x);
          if (s.eshot === 'meteor') { this.fx.push({ kind: 'boom', x: s.x, y: CONFIG.barricadeY, r: 70, t: 0, life: 0.6, color: '#ffb000' }); this.sfx('boom'); this.shake = 0.3; }
          else this.burst(s.x, CONFIG.barricadeY, '#ffffff', 3);
        }
        continue;
      }
      if (s.y < CONFIG.fieldTop - 60 || s.x < -40 || s.x > W + 40) { s.done = true; continue; }
      if (s.kind === 'roll') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick = 0.25;
          for (const e of list) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) <= s.radius + e.def.size * 0.5) this.damageEnemy(e, s.dmg, { quiet: true, src: s.src });
        }
        continue;
      }
      for (const e of list) {
        if (e.dead || s.hit.has(e.uid)) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) <= s.radius + e.def.size) {
          s.hit.add(e.uid);
          this.damageEnemy(e, s.dmg, { crit: s.crit, src: s.src });
          this.fx.push({ kind: 'spark', x: s.x, y: s.y, r: 14 + s.radius, t: 0, life: 0.18, color: s.color });
          if (s.pierce-- <= 0) { s.done = true; break; }
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  private updateFields(dt: number): void {
    for (const mn of this.mines) {
      mn.t += dt;
      if (mn.t < 0.4) continue;
      const trig = this.enemies.some((e) => !e.dead && !e.def.flying && Math.hypot(e.x - mn.x, e.y - mn.y) <= mn.r * 0.55 + e.def.size * 0.5);
      if (!trig) continue;
      mn.t = -1;
      this.fx.push({ kind: 'boom', x: mn.x, y: mn.y, r: mn.r * 0.9, t: 0, life: 0.45, color: '#ffb347' });
      this.sfx('boom');
      for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - mn.x, e.y - mn.y) <= mn.r + e.def.size * 0.5) this.damageEnemy(e, mn.dmg, { src: mn.src, knock: 20 });
    }
    this.mines = this.mines.filter((mn) => mn.t >= 0);
    for (const f of this.fields) {
      f.t += dt;
      f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = 0.5;
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) <= f.r + e.def.size * 0.5) this.damageEnemy(e, f.dmg, { slow: f.slow, slowDur: 0.8, quiet: true, src: f.src });
        }
      }
    }
    this.fields = this.fields.filter((f) => f.t < f.life);

    for (const s of this.slams) {
      s.delay -= dt;
      if (s.delay <= 0) {
        if (s.pounce) {
          this.fx.push({ kind: 'dash', x: s.x, y: s.y + 30, y2: s.y - 30, r: s.r * 1.2, t: 0, life: 0.35, color: '#e8a040' });
          this.sfx('scratch');
        } else {
          this.fx.push({ kind: 'slam', x: s.x, y: s.y, r: s.r, t: 0, life: 0.5, color: '#9b7350' });
          this.fx.push({ kind: 'boom', x: s.x, y: s.y, r: s.r * 0.7, t: 0, life: 0.45, color: '#ffb347' });
          this.sfx('boom');
          this.shake = Math.max(this.shake, 0.25);
        }
        for (const e of this.enemies) {
          if (e.dead || Math.hypot(e.x - s.x, e.y - s.y) > s.r + e.def.size * 0.5) continue;
          if (s.execute && !e.def.boss && e.hp / e.maxHp <= s.execute) { this.addFloat(e.x, e.y - 24, '사냥!', '#ffcf5a', 16); this.damageEnemy(e, e.hp + 1, { src: s.src, quiet: true }); continue; }
          this.damageEnemy(e, s.dmg, { knock: s.knock, src: s.src });
        }
        this.burst(s.x, s.y, '#d9b48a', 16);
      }
    }
    this.slams = this.slams.filter((s) => s.delay > 0);
  }

  // ───────────── 연출 ─────────────

  addFloat(x: number, y: number, text: string, color: string, size: number): void {
    // 글자(테두리 글씨)는 그리기 비싸서 개수를 제한: 작은 숫자는 많으면 그냥 생략
    if (this.floats.length > 28 && size < 16) return;
    if (this.floats.length > 40) this.floats.shift();
    this.floats.push({ x, y, text, color, t: 0.8, size });
  }

  private burst(x: number, y: number, color: string, n: number): void {
    if (this.particles.length > 120) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 100;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: 0.3 + Math.random() * 0.3, color, r: 2 + Math.random() * 3 });
    }
  }

  private updateFx(dt: number): void {
    for (const d of this.decals) d.t += dt;
    this.decals = this.decals.filter((d) => d.t < 12);
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.life);
    for (const f of this.floats) { f.t -= dt; f.y -= 34 * dt; }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
  }
}
