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

export type FxKind = 'beam' | 'slam' | 'quake' | 'snipe' | 'dash' | 'heal' | 'thorns' | 'spark' | 'boom' | 'poof' | 'zap' | 'pounce' | 'spray' | 'shield' | 'feather' | 'dirt' | 'coins' | 'ring' | 'slime';
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
        level: i === 0 ? 1 : 0, picks: {}, joinOrder: i === 0 ? 0 : -1, targetX: W / 2, enterT: 0, power: s.atk, timer: 0,
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
    for (const s of this.squad) if (s.level > 0 && s.weapon.kind === 'aura') m += this.params(s).buff ?? 0;
    return m;
  }
  get speedMul(): number {
    return (1 + 0.12 * this.generic.catnip + this.bonus.speed) * (1 + (this.rallyT > 0 ? this.heroRally.speed : 0));
  }
  private get guard(): { reduce: number; thorns: number; power: number; slot: number } {
    const g = this.squad.find((s) => s.level > 0 && s.weapon.kind === 'guard');
    if (!g) return { reduce: 0, thorns: 0, power: 0, slot: -1 };
    const p = this.params(g);
    return { reduce: p.reduce ?? 0, thorns: p.thorns ?? 0, power: g.power, slot: g.slot };
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

  canRally(): boolean { return this.active && this.rallyCd <= 0; }

  useRally(): boolean {
    if (!this.canRally()) return false;
    if (this.tutorial && this.tutStep === 1) this.tutStep = 2;
    const r = this.heroRally;
    this.rallyCd = r.cd;
    this.rallyT = r.dur;
    this.repair(this.maxHp * r.heal);
    this.banner = { text: '📣 치즈의 꾹꾹이 응원!', t: 1.4 };
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

  private spawn(kind: EnemyKind, x = 30 + Math.random() * (W - 60), y = CONFIG.fieldTop - 20): Enemy {
    const def = ENEMIES[kind];
    const mul = this.stage.mul * (1 + this.progress * 1.1); // 시간이 갈수록 조금씩 강해짐
    const e: Enemy = {
      uid: this.nextUid++, def, x, y, baseX: x,
      hp: def.hp * mul * HORDE.hp, maxHp: def.hp * mul * HORDE.hp, atk: def.atk * this.stage.mul * HORDE.atk,
      atkTimer: 0, attacking: false, slowT: 0, slowAmt: 0, stunT: 0, hitFlash: 0,
      animT: Math.random() * 10, dead: false, deathT: 0,
    };
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

  private updateSpawns(dt: number): void {
    const st = this.stage;
    if (this.time < st.duration) {
      const k = this.progress;
      // 레퍼런스처럼: 처음엔 한두 마리씩, 후반엔 폭발적으로
      const rate = st.rate[1] * (0.05 + Math.pow(k, 1.8) * 1.35) + st.rate[0] * 0.15;
      this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        this.spawn(this.pickKind(k < 0.5 ? st.early : st.late));
      }
      st.bursts.forEach((bu, i) => {
        if (this.burstsDone.has(i) || this.time < bu.t) return;
        this.burstsDone.add(i);
        this.banner = { text: `⚠ ${ENEMIES[bu.kind].name} 떼가 몰려온다!`, t: 1.8 };
        for (let j = 0; j < bu.count; j++) {
          this.spawn(bu.kind, 30 + ((j + 0.5) / bu.count) * (W - 60), CONFIG.fieldTop - 20 - (j % 3) * 22);
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
    if (o.crit) { this.sfx('crit'); this.fx.push({ kind: 'boom', x: e.x, y: e.y - e.def.size * 0.3, r: 16 + e.def.size * 0.4, t: 0, life: 0.35, color: '#ffb347' }); }
    else if (!o.quiet) this.sfx('hit');
    e.hitFlash = 0.12;
    if (o.slow) { e.slowAmt = Math.max(e.def.boss ? o.slow * 0.5 : o.slow, e.slowT > 0 ? e.slowAmt : 0); e.slowT = Math.max(e.slowT, o.slowDur ?? 1); }
    if (o.stun) e.stunT = Math.max(e.stunT, e.def.boss ? o.stun * 0.3 : o.stun);
    if (o.knock && !e.def.boss) e.y = Math.max(CONFIG.fieldTop - 10, e.y - o.knock);
    if (!o.quiet || o.crit || Math.random() < 0.3) {
      this.addFloat(e.x + (Math.random() - 0.5) * 16, e.y - e.def.size - 6, o.crit ? `${fmtDmg(dmg)}!` : fmtDmg(dmg),
        o.crit ? '#ff4d5e' : o.color ?? '#ffffff', o.crit ? 28 : dmg > 300 ? 22 : 17);
    }
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      e.deathT = 0;
      this.kills++;
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
      this.gainXp(e.def.xp);
      if (e.def.boss) { this.shake = 0.5; this.banner = { text: `${e.def.name} 격파!`, t: 1.8 }; }
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
      const p = this.params(m);
      if (p.interval <= 0) continue;
      m.timer += dt * (m.weapon.kind === 'heal' ? 1 : spd);
      if (m.timer < p.interval) continue;
      if (this.fire(m, p)) {
        m.timer = 0;
        m.swing = 1;
      } else {
        m.timer = p.interval; // 대상이 생길 때까지 대기
      }
    }
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
    const dmg = m.power * p.dmg * this.dmgMul;
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
    if (this.floats.length > 140) this.floats.shift();
    this.floats.push({ x, y, text, color, t: 0.8, size });
  }

  private burst(x: number, y: number, color: string, n: number): void {
    if (this.particles.length > 300) return;
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
