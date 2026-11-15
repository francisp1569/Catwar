// 전투 시뮬레이션 (렌더링과 분리)
import { CAT_BY_ID, HERO_ID, type CatDef, type CatLook } from './data/cats';
import { CONFIG } from './data/config';
import { ENEMIES, type EnemyDef, type EnemyKind } from './data/enemies';
import { skill, type SkillKind } from './data/skills';
import type { SpawnGroup, StageDef } from './data/stages';
import { catStats } from './meta/progression';
import type { OwnedCat } from './meta/save';

export type Side = 'cat' | 'enemy';

/** 소환 시점에 확정되는 전투 능력치 */
export interface Fighter {
  key: string;
  side: Side;
  name: string;
  hp: number;
  atk: number;
  range: number;
  speed: number;
  atkInterval: number;
  size: number;
  color: string;
  projectile?: { speed: number; color: string; radius: number };
  aoe?: number;
  flying?: boolean;
  boss?: boolean;
  reward?: number;
  skill?: SkillKind;
  skillLv: number;
  look?: CatLook;
  hero?: boolean;
}

export interface DeckEntry { def: CatDef; owned: OwnedCat; fighter: Fighter; }

export function catFighter(def: CatDef, owned: OwnedCat): Fighter {
  const s = catStats(def, owned);
  return {
    key: def.id, side: 'cat', name: def.name,
    hp: s.hp, atk: s.atk, range: def.range, speed: def.speed, atkInterval: def.atkInterval, size: def.size * (def.look.scale ?? 1),
    color: def.look.patch ?? def.look.base, projectile: def.projectile, aoe: def.aoe,
    skill: def.skill, skillLv: owned.stars, look: def.look, hero: def.hero,
  };
}

function enemyFighter(def: EnemyDef, mul: number): Fighter {
  return {
    key: def.id, side: 'enemy', name: def.name,
    hp: Math.round(def.hp * mul), atk: Math.round(def.atk * mul), range: def.range, speed: def.speed,
    atkInterval: def.atkInterval, size: def.size, color: def.color, projectile: def.projectile, aoe: def.aoe,
    flying: def.flying, boss: def.boss, reward: def.reward, skillLv: 0,
  };
}

export interface Unit {
  uid: number;
  f: Fighter;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atkTimer: number;
  attacking: boolean;
  swing: number;
  hitFlash: number;
  animT: number;
  dead: boolean;
  deathT: number;
  attackCount: number;
  skillTimer: number;
  slowT: number;
  slowAmt: number;
  stunT: number;
  buffT: number;
  buffAtk: number;
  auraAtk: number;
  /** 스킬 발동 연출 */
  skillFx: number;
}

export interface Projectile {
  x: number; y: number;
  targetUid: number | null; // null이면 집을 노림
  dmg: number; speed: number; color: string; radius: number;
  side: Side; spin: number; done: boolean;
  src: Unit;
  crit: boolean;
}

export interface FloatText { x: number; y: number; text: string; color: string; t: number; size: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; r: number; }

export type Phase = 'playing' | 'victory' | 'defeat';

interface ActiveGroup { kind: EnemyKind; remaining: number; timer: number; interval: number; }

export interface BattleResult { victory: boolean; stars: number; kills: number; time: number; }

export class Game {
  phase: Phase = 'playing';
  paused = false;
  speed = 1;
  time = 0;

  units: Unit[] = [];
  projectiles: Projectile[] = [];
  floats: FloatText[] = [];
  particles: Particle[] = [];

  readonly maxHouseHp: number;
  houseHp: number;
  houseFlash = 0;
  churu = 60;
  walletLevel = 1;
  cooldowns: Record<string, number> = {};

  hero: Unit | null = null;
  heroRespawn = 0;
  heroSkillCd = 0;
  rallyFx = 0;

  waveIndex = -1;
  waveTimer = 0;
  restTimer = 2;
  activeGroups: ActiveGroup[] = [];
  pendingGroups: SpawnGroup[] = [];
  banner: { text: string; t: number } | null = null;
  kills = 0;
  result: BattleResult | null = null;

  private nextUid = 1;

  constructor(
    readonly stage: StageDef,
    readonly deck: DeckEntry[],
    readonly heroEntry: DeckEntry,
  ) {
    this.maxHouseHp = stage.houseHp;
    this.houseHp = stage.houseHp;
    for (const d of deck) this.cooldowns[d.def.id] = 0;
    this.banner = { text: `STAGE ${stage.no} · ${stage.name}`, t: 2.5 };
    this.hero = this.spawn(heroEntry.fighter, CONFIG.houseX + 10);
  }

  get heroSkill() { return skill.rally(this.heroEntry.owned.stars); }

  get churuCap(): number {
    const w = CONFIG.wallet;
    return w.capBase + w.capPerLevel * (this.walletLevel - 1);
  }
  get churuRegen(): number {
    const w = CONFIG.wallet;
    return w.regenBase + w.regenPerLevel * (this.walletLevel - 1);
  }
  get walletUpgradeCost(): number | null {
    if (this.walletLevel >= CONFIG.wallet.maxLevel) return null;
    return CONFIG.wallet.upgradeCostBase * this.walletLevel;
  }

  private get active(): boolean { return this.phase === 'playing' && !this.paused; }

  canSummon(id: string): boolean {
    const d = this.deck.find((e) => e.def.id === id);
    return !!d && this.active && this.churu >= d.def.cost && (this.cooldowns[id] ?? 0) <= 0;
  }

  summon(id: string): boolean {
    if (!this.canSummon(id)) return false;
    const d = this.deck.find((e) => e.def.id === id)!;
    this.churu -= d.def.cost;
    this.cooldowns[id] = d.def.cooldown;
    this.spawn(d.fighter, CONFIG.houseX + 10);
    return true;
  }

  canUseHeroSkill(): boolean {
    return this.active && !!this.hero && !this.hero.dead && this.heroSkillCd <= 0;
  }

  useHeroSkill(): boolean {
    if (!this.canUseHeroSkill()) return false;
    const s = this.heroSkill;
    this.heroSkillCd = s.cd;
    this.rallyFx = 1.2;
    for (const u of this.units) {
      if (u.side !== 'cat' || u.dead) continue;
      this.healUnit(u, u.maxHp * s.heal);
      u.buffT = s.dur;
      u.buffAtk = s.atk;
    }
    this.banner = { text: '📣 치즈의 꾹꾹이 응원!', t: 1.5 };
    return true;
  }

  upgradeWallet(): boolean {
    const cost = this.walletUpgradeCost;
    if (cost === null || this.churu < cost || !this.active) return false;
    this.churu -= cost;
    this.walletLevel++;
    this.addFloat(90, 430, `지갑 Lv.${this.walletLevel}!`, '#ffd84d', 16);
    return true;
  }

  private spawn(f: Fighter, x: number): Unit {
    const jitter = (Math.random() - 0.5) * 22;
    const u: Unit = {
      uid: this.nextUid++, f, side: f.side, x,
      y: CONFIG.laneY + jitter - (f.flying ? 62 : 0),
      hp: f.hp, maxHp: f.hp,
      atkTimer: f.atkInterval * 0.6, attacking: false, swing: 0, hitFlash: 0,
      animT: Math.random() * 10, dead: false, deathT: 0,
      attackCount: 0, skillTimer: 0, slowT: 0, slowAmt: 0, stunT: 0, buffT: 0, buffAtk: 0, auraAtk: 0, skillFx: 0,
    };
    this.units.push(u);
    return u;
  }

  update(rawDt: number): void {
    if (!this.active) return;
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.time += dt;

    this.churu = Math.min(this.churuCap, this.churu + this.churuRegen * dt);
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.heroSkillCd = Math.max(0, this.heroSkillCd - dt);
    this.rallyFx = Math.max(0, this.rallyFx - dt);

    // 주인공 부활
    if (this.hero && this.hero.dead) {
      if (this.heroRespawn <= 0) this.heroRespawn = CONFIG.heroRespawn;
      this.heroRespawn -= dt;
      if (this.heroRespawn <= 0) {
        this.hero = this.spawn(this.heroEntry.fighter, CONFIG.houseX + 10);
        this.addFloat(CONFIG.houseX + 20, 320, '치즈 복귀!', '#ffd84d', 16);
      }
    }

    this.updateWaves(dt);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    this.updateFx(dt);

    if (this.houseHp <= 0) {
      this.houseHp = 0;
      this.finish(false);
    } else if (
      this.waveIndex >= this.stage.waves.length - 1 &&
      this.activeGroups.length === 0 && this.pendingGroups.length === 0 &&
      !this.units.some((u) => u.side === 'enemy' && !u.dead)
    ) {
      this.finish(true);
    }
  }

  private finish(victory: boolean): void {
    this.phase = victory ? 'victory' : 'defeat';
    const ratio = this.houseHp / this.maxHouseHp;
    const stars = !victory ? 0 : ratio >= 0.8 ? 3 : ratio >= 0.4 ? 2 : 1;
    this.result = { victory, stars, kills: this.kills, time: this.time };
  }

  // ───────────── 웨이브 ─────────────

  private updateWaves(dt: number): void {
    const waves = this.stage.waves;
    const enemiesAlive = this.units.some((u) => u.side === 'enemy' && !u.dead);
    const spawningDone = this.activeGroups.length === 0 && this.pendingGroups.length === 0;

    if (spawningDone) {
      if (this.waveIndex >= waves.length - 1) return;
      this.restTimer -= !enemiesAlive || this.waveIndex < 0 ? dt : dt * 0.25;
      if (this.restTimer <= 0) this.startWave(this.waveIndex + 1);
      return;
    }

    this.waveTimer += dt;
    this.pendingGroups = this.pendingGroups.filter((grp) => {
      if (this.waveTimer < grp.delay) return true;
      this.activeGroups.push({ kind: grp.kind, remaining: grp.count, timer: 0, interval: grp.interval });
      return false;
    });

    for (const grp of this.activeGroups) {
      grp.timer -= dt;
      if (grp.timer <= 0 && grp.remaining > 0) {
        const u = this.spawn(enemyFighter(ENEMIES[grp.kind], this.stage.mul), CONFIG.holeX - Math.random() * 8);
        if (u.f.boss) this.banner = { text: `⚠ ${u.f.name}이(가) 나타났다!`, t: 2.5 };
        grp.remaining--;
        grp.timer = grp.interval;
      }
    }
    this.activeGroups = this.activeGroups.filter((grp) => grp.remaining > 0);
    if (this.activeGroups.length === 0 && this.pendingGroups.length === 0) this.restTimer = CONFIG.waveGap;
  }

  private startWave(i: number): void {
    this.waveIndex = i;
    this.waveTimer = 0;
    const wave = this.stage.waves[i];
    this.pendingGroups = [...wave.groups];
    this.banner = { text: `WAVE ${i + 1}/${this.stage.waves.length} · ${wave.name}`, t: 2.2 };
  }

  // ───────────── 유닛 ─────────────

  private gap(a: Unit, b: Unit): number {
    const dir = a.side === 'cat' ? 1 : -1;
    return (b.x - a.x) * dir - a.f.size * 0.6 - b.f.size * 0.6;
  }

  private enemiesInRange(u: Unit): Unit[] {
    return this.units.filter((o) => {
      if (o.dead || o.side === u.side) return false;
      const g = this.gap(u, o);
      return g >= -o.f.size * 1.5 && g <= u.f.range;
    });
  }

  private findTarget(u: Unit): Unit | null {
    let best: Unit | null = null;
    let bestGap = Infinity;
    for (const o of this.enemiesInRange(u)) {
      const g = this.gap(u, o);
      if (g < bestGap) { best = o; bestGap = g; }
    }
    return best;
  }

  private effAtk(u: Unit): number {
    return u.f.atk * (1 + (u.buffT > 0 ? u.buffAtk : 0) + u.auraAtk);
  }

  private updateUnits(dt: number): void {
    // 오라 계산
    for (const u of this.units) u.auraAtk = 0;
    for (const a of this.units) {
      if (a.dead || a.f.skill !== 'aura') continue;
      const s = skill.aura(a.f.skillLv);
      for (const o of this.units) {
        if (o !== a && !o.dead && o.side === a.side && Math.abs(o.x - a.x) <= s.radius) o.auraAtk = Math.max(o.auraAtk, s.atk);
      }
    }

    for (const u of this.units) {
      u.animT += dt;
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.swing = Math.max(0, u.swing - dt * 3);
      u.skillFx = Math.max(0, u.skillFx - dt);
      u.buffT = Math.max(0, u.buffT - dt);
      u.slowT = Math.max(0, u.slowT - dt);
      if (u.dead) { u.deathT += dt; continue; }
      if (u.stunT > 0) { u.stunT -= dt; u.attacking = false; continue; }

      // 회복 스킬 (공격과 별개로 주기 발동)
      if (u.f.skill === 'heal') {
        const s = skill.heal(u.f.skillLv);
        u.skillTimer += dt;
        if (u.skillTimer >= s.every) {
          let best: Unit | null = null;
          for (const o of this.units) {
            if (o.dead || o.side !== u.side || o.hp >= o.maxHp || Math.abs(o.x - u.x) > s.radius) continue;
            if (!best || o.hp / o.maxHp < best.hp / best.maxHp) best = o;
          }
          if (best) {
            u.skillTimer = 0;
            u.skillFx = 0.6;
            this.healUnit(best, this.effAtk(u) * s.mult);
          }
        }
      }

      const slowMul = u.slowT > 0 ? 1 - u.slowAmt : 1;
      let atkSpeed = slowMul;
      if (u.f.skill === 'frenzy' && u.hp / u.maxHp <= skill.frenzy(u.f.skillLv).threshold) atkSpeed *= skill.frenzy(u.f.skillLv).speed;

      const target = this.findTarget(u);
      const houseInRange = u.side === 'enemy' && u.x - u.f.size * 0.6 - CONFIG.houseX <= u.f.range;

      if (target || houseInRange) {
        u.attacking = true;
        u.atkTimer += dt * atkSpeed;
        if (u.atkTimer >= u.f.atkInterval) {
          u.atkTimer = 0;
          u.swing = 1;
          this.attack(u, target);
        }
      } else {
        u.attacking = false;
        u.atkTimer = Math.min(u.atkTimer + dt, u.f.atkInterval * 0.6);
        const dir = u.side === 'cat' ? 1 : -1;
        u.x += dir * u.f.speed * slowMul * dt;
        if (u.side === 'cat') u.x = Math.min(u.x, CONFIG.holeX - 12);
        else u.x = Math.max(u.x, CONFIG.houseX + u.f.size * 0.6);
      }
    }
    this.units = this.units.filter((u) => !(u.dead && u.deathT > 0.6));
  }

  private attack(u: Unit, target: Unit | null): void {
    u.attackCount++;
    const sk = u.f.skill;
    const lv = u.f.skillLv;
    let dmg = this.effAtk(u);
    let crit = false;
    if (sk === 'crit' && Math.random() < skill.crit(lv).chance) {
      dmg *= skill.crit(lv).mult;
      crit = true;
    }

    // 사거리 안 전체 공격
    if (sk === 'pierce' && target && u.attackCount % skill.pierce(lv).every === 0) {
      u.skillFx = 0.6;
      for (const o of this.enemiesInRange(u)) this.fire(u, o, dmg * skill.pierce(lv).mult, crit);
      return;
    }
    if (u.f.projectile) {
      this.fire(u, target, dmg, crit);
      return;
    }
    if (!target) {
      this.damageHouse(dmg);
      return;
    }

    let victims: Unit[] = [target];
    if (u.f.aoe) victims = this.units.filter((o) => !o.dead && o.side !== u.side && Math.abs(o.x - target.x) <= u.f.aoe!);

    if (sk === 'cleave' && u.attackCount % skill.cleave(lv).every === 0) {
      const s = skill.cleave(lv);
      u.skillFx = 0.6;
      victims = this.units.filter((o) => !o.dead && o.side !== u.side && Math.abs(o.x - target.x) <= s.radius);
      dmg *= s.mult;
      this.burst(target.x, target.y - 10, '#ffd27a', 14);
    }
    const knock = sk === 'knockback' && u.attackCount % skill.knockback(lv).every === 0;
    if (knock) { dmg *= skill.knockback(lv).mult; u.skillFx = 0.6; }
    const stun = sk === 'stun' && u.attackCount % skill.stun(lv).every === 0;
    if (stun) u.skillFx = 0.6;

    if (u.f.aoe) this.burst(target.x, target.y, '#ffe08a', 10);
    for (const v of victims) {
      this.damage(v, dmg, crit);
      if (knock && !v.f.boss) this.push(v, skill.knockback(lv).push);
      if (stun) { v.stunT = Math.max(v.stunT, skill.stun(lv).dur * (v.f.boss ? 0.4 : 1)); }
    }
  }

  private fire(u: Unit, target: Unit | null, dmg: number, crit: boolean): void {
    const p = u.f.projectile ?? { speed: 420, color: '#fff3b0', radius: 5 };
    this.projectiles.push({
      x: u.x + (u.side === 'cat' ? 1 : -1) * u.f.size,
      y: u.y - u.f.size * 0.6,
      targetUid: target ? target.uid : null,
      dmg, speed: p.speed, color: p.color, radius: p.radius, side: u.side, spin: 0, done: false, src: u, crit,
    });
  }

  private onHit(src: Unit, t: Unit): void {
    if (src.f.skill === 'slow') {
      const s = skill.slow(src.f.skillLv);
      t.slowT = s.dur;
      t.slowAmt = t.f.boss ? s.amount * 0.5 : s.amount;
    }
  }

  /** 뒤로 밀려남 (적은 쥐구멍 밖, 고양이는 집 안으로 밀려나지 않게) */
  private push(u: Unit, dist: number): void {
    if (u.side === 'enemy') u.x = Math.min(u.x + dist, CONFIG.holeX);
    else u.x = Math.max(u.x - dist, CONFIG.houseX + 10);
  }

  private healUnit(u: Unit, amount: number): void {
    if (u.dead) return;
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + amount);
    const healed = Math.round(u.hp - before);
    if (healed > 0) {
      this.addFloat(u.x, u.y - u.f.size * 2 - 14, `+${healed}`, '#7dff9a', 14);
      this.burst(u.x, u.y - u.f.size, '#a6ffbf', 5);
    }
  }

  private damage(t: Unit, rawDmg: number, crit = false): void {
    if (t.dead) return;
    let dmg = rawDmg;
    if (t.f.skill === 'shield') dmg *= 1 - skill.shield(t.f.skillLv).reduce;
    t.hp -= dmg;
    t.hitFlash = 0.12;
    if (!t.f.boss) this.push(t, 2);
    this.addFloat(t.x, t.y - t.f.size - 10, crit ? `${Math.round(dmg)}!` : `${Math.round(dmg)}`,
      crit ? '#ffd84d' : t.side === 'cat' ? '#ff8a8a' : '#ffffff', crit ? 20 : 14);
    if (t.hp <= 0) {
      t.hp = 0;
      t.dead = true;
      t.deathT = 0;
      this.burst(t.x, t.y, t.f.color, 8);
      if (t.side === 'enemy') {
        this.kills++;
        const r = t.f.reward ?? 0;
        if (r > 0) {
          this.churu = Math.min(this.churuCap, this.churu + r);
          this.addFloat(t.x, t.y - t.f.size - 26, `+${r} 츄르`, '#ffd84d', 13);
        }
      } else if (t === this.hero) {
        this.banner = { text: `치즈가 쓰러졌다! ${CONFIG.heroRespawn}초 후 복귀`, t: 2 };
      }
    }
  }

  private damageHouse(dmg: number): void {
    this.houseHp -= dmg;
    this.houseFlash = 0.15;
    this.addFloat(CONFIG.houseX - 30 + Math.random() * 30, 250, `-${Math.round(dmg)}`, '#ff6b6b', 14);
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.spin += dt * 12;
      let tx: number;
      let ty: number;
      let target: Unit | undefined;
      if (p.targetUid !== null) {
        target = this.units.find((u) => u.uid === p.targetUid);
        if (!target || target.dead) { p.done = true; continue; }
        tx = target.x;
        ty = target.y - target.f.size * 0.5;
      } else {
        tx = CONFIG.houseX - 10;
        ty = 300;
      }
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * dt;
      if (d <= step + 4) {
        p.done = true;
        if (target) { this.damage(target, p.dmg, p.crit); this.onHit(p.src, target); }
        else this.damageHouse(p.dmg);
        this.burst(tx, ty, p.color, 4);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
  }

  private addFloat(x: number, y: number, text: string, color: string, size: number): void {
    this.floats.push({ x, y, text, color, t: 0.9, size });
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 90;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, t: 0, life: 0.4 + Math.random() * 0.3, color, r: 2 + Math.random() * 3 });
    }
  }

  private updateFx(dt: number): void {
    this.houseFlash = Math.max(0, this.houseFlash - dt);
    for (const f of this.floats) { f.t -= dt; f.y -= 30 * dt; }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const p of this.particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
  }
}

export function buildDeck(cats: Record<string, OwnedCat>, deckIds: string[]): { hero: DeckEntry; deck: DeckEntry[] } {
  const mk = (id: string): DeckEntry => {
    const def = CAT_BY_ID[id];
    const owned = cats[id];
    return { def, owned, fighter: catFighter(def, owned) };
  };
  return { hero: mk(HERO_ID), deck: deckIds.filter((id) => cats[id]).map(mk) };
}
