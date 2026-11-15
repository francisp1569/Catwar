// 세로형 서바이버 디펜스 전투 시뮬레이션 (렌더링과 분리)
import { CAT_BY_ID, HERO_ID, type CatDef } from './data/cats';
import { CONFIG } from './data/config';
import { ENEMIES, type EnemyDef, type EnemyKind } from './data/enemies';
import type { Mix, StageDef } from './data/stages';
import { GENERIC, MAX_WEAPON_LV, rally, type GenericCard, type WeaponDef, type WeaponFx, type WeaponParams } from './data/weapons';
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
}

export interface Member {
  slot: number;
  def: CatDef;
  owned: OwnedCat;
  weapon: WeaponDef;
  /** 전투 중 스킬 레벨 (0 = 아직 잠자는 중) */
  level: number;
  power: number;
  timer: number;
  x: number;
  y: number;
  swing: number;
  wakeFx: number;
}

export interface Shot {
  kind: 'bolt' | 'roll' | 'web';
  x: number; y: number; vx: number; vy: number;
  dmg: number; radius: number; pierce: number;
  color: string; crit: boolean;
  hit: Set<number>;
  tick: number;
  done: boolean;
  spin: number;
  style?: WeaponFx;
}

export type FxKind = 'beam' | 'slam' | 'quake' | 'snipe' | 'dash' | 'heal' | 'thorns';
export interface Fx { kind: FxKind; x: number; y: number; x2?: number; y2?: number; r: number; t: number; life: number; color: string; style?: WeaponFx; }

export interface Field { x: number; y: number; r: number; t: number; life: number; slow: number; dmg: number; tick: number; sx: number; sy: number; }
export interface PendingSlam { x: number; y: number; r: number; delay: number; dmg: number; knock: number; }

export interface Decal { x: number; y: number; r: number; color: string; t: number; seed: number; }

export interface FloatText { x: number; y: number; text: string; color: string; t: number; size: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; r: number; }

export type Card =
  | { type: 'cat'; slot: number; next: number }
  | { type: 'generic'; id: GenericCard };

export type Phase = 'playing' | 'victory' | 'defeat';
export interface BattleResult { victory: boolean; stars: number; kills: number; time: number; progress: number; }

export function fmtDmg(v: number): string {
  return v >= 10000 ? `${(v / 1000).toFixed(0)}K` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`;
}

export interface SquadEntry { def: CatDef; owned: OwnedCat; }

export function buildSquad(cats: Record<string, OwnedCat>, deckIds: string[]): SquadEntry[] {
  return [HERO_ID, ...deckIds.filter((id) => cats[id] && id !== HERO_ID)].map((id) => ({ def: CAT_BY_ID[id], owned: cats[id] }));
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

  readonly maxHp: number;
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
  result: BattleResult | null = null;
  bossSpawned = false;
  shake = 0;

  private nextUid = 1;
  private spawnAcc = 0;
  private burstsDone = new Set<number>();

  constructor(readonly stage: StageDef, entries: SquadEntry[]) {
    let hp = stage.baseHp;
    this.squad = entries.map((e, i) => {
      const s = catStats(e.def, e.owned);
      hp += s.hp;
      return {
        slot: i, def: e.def, owned: e.owned, weapon: e.def.weapon,
        level: i === 0 ? 1 : 0, power: s.atk, timer: 0,
        x: CONFIG.squadX[i], y: CONFIG.squadY + (i === 0 ? 8 : i > 2 ? -6 : 0), swing: 0, wakeFx: 0,
      };
    });
    this.maxHp = Math.round(hp);
    this.hp = this.maxHp;
    this.banner = { text: `STAGE ${stage.no} · ${stage.name}`, t: 2.5 };
  }

  get hero(): Member { return this.squad[0]; }
  get heroRally() { return rally(this.hero.owned.stars); }
  get xpNeed(): number { return CONFIG.xpBase + CONFIG.xpPerLevel * this.level; }
  get progress(): number { return Math.min(1, this.time / this.stage.duration); }
  get timeLeft(): number { return Math.max(0, this.stage.duration - this.time); }
  private get active(): boolean { return this.phase === 'playing' && !this.paused && !this.choice && !this.pickAnim; }

  get dmgMul(): number {
    let m = 1 + 0.12 * this.generic.tuna;
    for (const s of this.squad) if (s.level > 0 && s.weapon.kind === 'aura') m += this.params(s).buff ?? 0;
    return m;
  }
  get speedMul(): number {
    return (1 + 0.12 * this.generic.catnip) * (1 + (this.rallyT > 0 ? this.heroRally.speed : 0));
  }
  private get guard(): { reduce: number; thorns: number; power: number } {
    const g = this.squad.find((s) => s.level > 0 && s.weapon.kind === 'guard');
    if (!g) return { reduce: 0, thorns: 0, power: 0 };
    const p = this.params(g);
    return { reduce: p.reduce ?? 0, thorns: p.thorns ?? 0, power: g.power };
  }

  params(m: Member, level = m.level): WeaponParams {
    return m.weapon.levels[Math.max(0, Math.min(MAX_WEAPON_LV, level) - 1)];
  }

  // ───────────── 플레이어 조작 ─────────────

  canRally(): boolean { return this.active && this.rallyCd <= 0; }

  useRally(): boolean {
    if (!this.canRally()) return false;
    const r = this.heroRally;
    this.rallyCd = r.cd;
    this.rallyT = r.dur;
    this.repair(this.maxHp * r.heal);
    this.banner = { text: '📣 치즈의 꾹꾹이 응원!', t: 1.4 };
    for (const s of this.squad) if (s.level > 0) s.wakeFx = 0.8;
    return true;
  }

  pick(i: number): void {
    const c = this.choice?.[i];
    if (!c) return;
    this.pickAnim = { card: c, index: i, t: 0.7 };
    if (c.type === 'cat') {
      const m = this.squad[c.slot];
      m.level = c.next;
      m.wakeFx = 1;
      m.timer = this.params(m).interval * 0.5;
      this.addFloat(m.x, m.y - 70, c.next === 1 ? `${m.def.name} 합류!` : `${m.def.skillName} Lv.${c.next}`, '#ffe98a', 18);
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
    for (const m of this.squad) {
      if (m.level >= MAX_WEAPON_LV) continue;
      pool.push({ card: { type: 'cat', slot: m.slot, next: m.level + 1 }, w: m.level === 0 ? 3 : 2.2 });
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
    this.choice = null;
    const ratio = this.hp / this.maxHp;
    const stars = !victory ? 0 : ratio >= 0.7 ? 3 : ratio >= 0.35 ? 2 : 1;
    this.result = { victory, stars, kills: this.kills, time: this.time, progress: this.progress };
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
    const mul = this.stage.mul * (1 + this.progress * 0.35); // 시간이 갈수록 조금씩 강해짐
    const e: Enemy = {
      uid: this.nextUid++, def, x, y, baseX: x,
      hp: def.hp * mul * HORDE.hp, maxHp: def.hp * mul * HORDE.hp, atk: def.atk * this.stage.mul * HORDE.atk,
      atkTimer: 0, attacking: false, slowT: 0, slowAmt: 0, stunT: 0, hitFlash: 0,
      animT: Math.random() * 10, dead: false, deathT: 0,
    };
    if (def.boss) { e.hp /= HORDE.hp; e.maxHp /= HORDE.hp; e.atk /= HORDE.atk; }
    this.enemies.push(e);
    return e;
  }

  private updateSpawns(dt: number): void {
    const st = this.stage;
    if (this.time < st.duration) {
      const k = this.progress;
      const rate = st.rate[0] + (st.rate[1] - st.rate[0]) * k;
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
        for (let i = 0; i < st.boss.count; i++) this.spawn(st.boss.kind, W / 2 + (i - (st.boss.count - 1) / 2) * 160, CONFIG.fieldTop - 40);
        this.banner = { text: `👑 ${ENEMIES[st.boss.kind].name} 등장! 쓰러뜨리면 승리!`, t: 2.5 };
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
      if (e.y < stopY) {
        e.attacking = false;
        e.y = Math.min(stopY, e.y + e.def.speed * slow * dt);
        const wob = e.def.flying ? 26 : e.def.boss ? 4 : 8;
        e.x = Math.max(20, Math.min(W - 20, e.baseX + Math.sin(e.animT * (e.def.flying ? 2.2 : 1.3)) * wob));
      } else {
        e.attacking = true;
        e.atkTimer += dt * slow;
        if (e.atkTimer >= e.def.atkInterval) {
          e.atkTimer = 0;
          if (e.def.range) {
            this.shots.push({ kind: 'web', x: e.x, y: e.y + e.def.size, vx: 0, vy: 360, dmg: e.atk, radius: 5, pierce: 0, color: '#ffffff', crit: false, hit: new Set(), tick: 0, done: false, spin: 0 });
          } else {
            this.damageBarricade(e.atk, e.x);
            if (g.thorns > 0) {
              this.damageEnemy(e, g.power * g.thorns * this.dmgMul, { color: '#c9c9d6' });
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
    const real = dmg * (1 - this.guard.reduce);
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

  damageEnemy(e: Enemy, dmg: number, o: { crit?: boolean; color?: string; slow?: number; slowDur?: number; stun?: number; knock?: number; quiet?: boolean } = {}): void {
    if (e.dead) return;
    e.hp -= dmg;
    e.hitFlash = 0.1;
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
      this.burst(e.x, e.y, e.def.color, e.def.boss ? 24 : 6);
      const goo = e.def.id === 'mouse' || e.def.id === 'ratking' ? 'rgba(200,195,210,0.55)' : e.def.id === 'spider' ? 'rgba(150,110,200,0.45)' : 'rgba(150,190,60,0.42)';
      this.decals.push({ x: e.x, y: e.y, r: e.def.size * (e.def.boss ? 2.2 : 1.4), color: goo, t: 0, seed: Math.random() * 10 });
      if (this.decals.length > 70) this.decals.shift();
      this.gainXp(e.def.xp);
      if (e.def.boss) { this.shake = 0.5; this.banner = { text: `${e.def.name} 격파!`, t: 1.8 }; }
    }
  }

  private gainXp(n: number): void {
    if (this.phase !== 'playing') return;
    this.xp += n;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.choice) this.openChoice();
  }

  // ───────────── 고양이 스킬 ─────────────

  private alive(): Enemy[] { return this.enemies.filter((e) => !e.dead && e.y > CONFIG.fieldTop - 30); }

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

  private updateSquad(dt: number): void {
    const spd = this.speedMul;
    for (const m of this.squad) {
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

  private fire(m: Member, p: WeaponParams): boolean {
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
          this.shots.push({ kind: 'bolt', x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg, radius: p.radius ?? 7, pierce: p.pierce ?? 0, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx });
        }
        return true;
      }
      case 'roll': {
        if (!list.length) return false;
        const n = p.count ?? 1;
        for (let i = 0; i < n; i++) {
          const x = n === 1 ? (this.bestColumn(list, 80) ?? W / 2) : 90 + i * (W - 180);
          this.shots.push({ kind: 'roll', x, y: CONFIG.barricadeY - 20, vx: 0, vy: -(p.speed ?? 90), dmg, radius: p.radius ?? 40, pierce: 999, color, crit: false, hit: new Set(), tick: 0, done: false, spin: 0, style: m.weapon.fx });
        }
        return true;
      }
      case 'snipe': {
        let t: Enemy | null = null;
        for (const e of list) if (!t || e.hp > t.hp) t = e;
        if (!t) return false;
        const crit = Math.random() < (p.crit ?? 0);
        this.fx.push({ kind: 'snipe', x: ox, y: oy, x2: t.x, y2: t.y, r: 3, t: 0, life: 0.35, color: crit ? '#ffd84d' : '#ffffff', style: m.weapon.fx });
        this.damageEnemy(t, crit ? dmg * (p.critMul ?? 2) : dmg, { crit });
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
            if (Math.abs(e.x - x) <= (p.width ?? 46) / 2 + e.def.size * 0.5) this.damageEnemy(e, dmg, { knock: p.knock, quiet: true });
          }
        }
        return any;
      }
      case 'frost': {
        const c = this.densest(list, p.radius ?? 70);
        if (!c) return false;
        this.fields.push({ x: c.x, y: c.y, r: p.radius ?? 70, t: 0, life: p.range ?? 3, slow: p.slow ?? 0.4, dmg, tick: 0, sx: m.x + 14, sy: m.y - 70 });
        return true;
      }
      case 'quake': {
        const range = p.range ?? 120;
        const hits = list.filter((e) => e.y >= CONFIG.barricadeY - range && !e.def.flying);
        this.fx.push({ kind: 'quake', x: W / 2, y: CONFIG.barricadeY, r: range, t: 0, life: 0.5, color });
        this.shake = Math.max(this.shake, 0.2);
        for (const e of hits) this.damageEnemy(e, dmg, { stun: p.stun, quiet: true });
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
          this.slams.push({ x: c.x, y: c.y, r: p.radius ?? 80, delay: 0.5, dmg, knock: p.knock ?? 0 });
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
          for (const e of list) if (Math.abs(e.x - x) <= (p.width ?? 30) / 2 + e.def.size * 0.6) this.damageEnemy(e, dmg, { color: '#e6d6ff' });
        }
        return any;
      }
      case 'heal': {
        if (this.hp >= this.maxHp) return false;
        this.repair(this.maxHp * (p.repair ?? 0.02));
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
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.kind === 'web') {
        if (s.y >= CONFIG.barricadeY) { s.done = true; this.damageBarricade(s.dmg, s.x); this.burst(s.x, CONFIG.barricadeY, '#ffffff', 3); }
        continue;
      }
      if (s.y < CONFIG.fieldTop - 60 || s.x < -40 || s.x > W + 40) { s.done = true; continue; }
      if (s.kind === 'roll') {
        s.tick -= dt;
        if (s.tick <= 0) {
          s.tick = 0.25;
          for (const e of list) if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) <= s.radius + e.def.size * 0.5) this.damageEnemy(e, s.dmg, { quiet: true });
        }
        continue;
      }
      for (const e of list) {
        if (e.dead || s.hit.has(e.uid)) continue;
        if (Math.hypot(e.x - s.x, e.y - s.y) <= s.radius + e.def.size) {
          s.hit.add(e.uid);
          this.damageEnemy(e, s.dmg, { crit: s.crit });
          this.burst(s.x, s.y, s.color, 3);
          if (s.pierce-- <= 0) { s.done = true; break; }
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  private updateFields(dt: number): void {
    for (const f of this.fields) {
      f.t += dt;
      f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = 0.5;
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - f.x, e.y - f.y) <= f.r + e.def.size * 0.5) this.damageEnemy(e, f.dmg, { slow: f.slow, slowDur: 0.8, quiet: true });
        }
      }
    }
    this.fields = this.fields.filter((f) => f.t < f.life);

    for (const s of this.slams) {
      s.delay -= dt;
      if (s.delay <= 0) {
        this.fx.push({ kind: 'slam', x: s.x, y: s.y, r: s.r, t: 0, life: 0.5, color: '#9b7350' });
        this.shake = Math.max(this.shake, 0.25);
        for (const e of this.enemies) {
          if (!e.dead && Math.hypot(e.x - s.x, e.y - s.y) <= s.r + e.def.size * 0.5) this.damageEnemy(e, s.dmg, { knock: s.knock });
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
