// 게임 상태와 시뮬레이션 로직 (렌더링과 분리)
import { CATS, CAT_ORDER, CONFIG, ENEMIES, WAVES, type CatKind, type EnemyKind, type Side, type UnitDef } from './data';

export interface Unit {
  uid: number;
  def: UnitDef;
  side: Side;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atkTimer: number;
  attacking: boolean;
  /** 공격 모션 연출용(0~1) */
  swing: number;
  hitFlash: number;
  animT: number;
  dead: boolean;
  deathT: number;
}

export interface Projectile {
  x: number;
  y: number;
  targetUid: number | null; // null이면 집을 노림
  dmg: number;
  speed: number;
  color: string;
  radius: number;
  side: Side;
  spin: number;
  done: boolean;
}

export interface FloatText {
  x: number; y: number; text: string; color: string; t: number;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number; t: number; life: number; color: string; r: number;
}

export type Phase = 'title' | 'playing' | 'victory' | 'defeat';

interface ActiveGroup { kind: EnemyKind; remaining: number; timer: number; interval: number; }

export class Game {
  phase: Phase = 'title';
  paused = false;
  speed = 1;
  time = 0;

  units: Unit[] = [];
  projectiles: Projectile[] = [];
  floats: FloatText[] = [];
  particles: Particle[] = [];

  houseHp = CONFIG.houseHp;
  houseFlash = 0;
  churu = 0;
  walletLevel = 1;
  cooldowns: Record<CatKind, number> = { loaf: 0, yarn: 0, zoomies: 0, boss: 0 };

  waveIndex = -1;
  waveTimer = 0;      // 현재 웨이브 경과 시간
  restTimer = 0;      // 다음 웨이브까지 남은 휴식
  activeGroups: ActiveGroup[] = [];
  pendingGroups: { group: (typeof WAVES)[number]['groups'][number]; started: boolean }[] = [];
  banner: { text: string; t: number } | null = null;
  kills = 0;

  private nextUid = 1;

  start(): void {
    this.phase = 'playing';
    this.paused = false;
    this.time = 0;
    this.units = [];
    this.projectiles = [];
    this.floats = [];
    this.particles = [];
    this.houseHp = CONFIG.houseHp;
    this.churu = 60;
    this.walletLevel = 1;
    this.kills = 0;
    for (const k of CAT_ORDER) this.cooldowns[k] = 0;
    this.waveIndex = -1;
    this.restTimer = 2;
    this.activeGroups = [];
    this.pendingGroups = [];
    this.banner = { text: '침입자가 몰려와요! 고양이를 소환하세요', t: 2.5 };
  }

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

  canSummon(kind: CatKind): boolean {
    const def = CATS[kind];
    return this.phase === 'playing' && !this.paused && this.churu >= (def.cost ?? 0) && this.cooldowns[kind] <= 0;
  }

  summon(kind: CatKind): boolean {
    if (!this.canSummon(kind)) return false;
    const def = CATS[kind];
    this.churu -= def.cost ?? 0;
    this.cooldowns[kind] = def.cooldown ?? 0;
    this.spawnUnit(def, CONFIG.houseX + 10);
    return true;
  }

  upgradeWallet(): boolean {
    const cost = this.walletUpgradeCost;
    if (cost === null || this.churu < cost || this.paused || this.phase !== 'playing') return false;
    this.churu -= cost;
    this.walletLevel++;
    this.floats.push({ x: 600, y: 440, text: `지갑 Lv.${this.walletLevel}!`, color: '#ffd84d', t: 1.2 });
    return true;
  }

  private spawnUnit(def: UnitDef, x: number): Unit {
    const jitter = (Math.random() - 0.5) * 22;
    const u: Unit = {
      uid: this.nextUid++,
      def,
      side: def.side,
      x,
      y: CONFIG.laneY + jitter - (def.flying ? 62 : 0),
      hp: def.hp,
      maxHp: def.hp,
      atkTimer: def.atkInterval * 0.6,
      attacking: false,
      swing: 0,
      hitFlash: 0,
      animT: Math.random() * 10,
      dead: false,
      deathT: 0,
    };
    this.units.push(u);
    return u;
  }

  update(rawDt: number): void {
    // 연출은 일시정지 중에도 멈춤
    if (this.phase !== 'playing' || this.paused) {
      if (this.banner) this.banner.t -= rawDt;
      return;
    }
    const dt = Math.min(rawDt, 0.05) * this.speed;
    this.time += dt;

    // 자원
    this.churu = Math.min(this.churuCap, this.churu + this.churuRegen * dt);
    for (const k of CAT_ORDER) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

    this.updateWaves(dt);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    this.updateFx(dt);

    // 승패 판정
    if (this.houseHp <= 0) {
      this.houseHp = 0;
      this.phase = 'defeat';
    } else if (
      this.waveIndex >= WAVES.length - 1 &&
      this.activeGroups.length === 0 &&
      this.pendingGroups.length === 0 &&
      !this.units.some((u) => u.side === 'enemy' && !u.dead)
    ) {
      this.phase = 'victory';
    }
  }

  private updateWaves(dt: number): void {
    const enemiesAlive = this.units.some((u) => u.side === 'enemy' && !u.dead);
    const spawningDone = this.activeGroups.length === 0 && this.pendingGroups.length === 0;

    if (spawningDone) {
      if (this.waveIndex >= WAVES.length - 1) return;
      // 이전 웨이브 적이 거의 정리되면 휴식 카운트다운
      if (!enemiesAlive || this.waveIndex < 0) {
        this.restTimer -= dt;
      } else {
        this.restTimer = Math.max(this.restTimer, 0) - dt * 0.25; // 적이 남아 있어도 천천히 진행
      }
      if (this.restTimer <= 0) this.startWave(this.waveIndex + 1);
      return;
    }

    this.waveTimer += dt;
    for (const p of this.pendingGroups) {
      if (!p.started && this.waveTimer >= p.group.delay) {
        p.started = true;
        this.activeGroups.push({ kind: p.group.kind, remaining: p.group.count, timer: 0, interval: p.group.interval });
      }
    }
    this.pendingGroups = this.pendingGroups.filter((p) => !p.started);

    for (const g of this.activeGroups) {
      g.timer -= dt;
      if (g.timer <= 0 && g.remaining > 0) {
        const u = this.spawnUnit(ENEMIES[g.kind], CONFIG.holeX);
        if (g.kind === 'ratking') this.banner = { text: '⚠ 대왕쥐가 나타났다!', t: 2.5 };
        u.x += Math.random() * 8;
        g.remaining--;
        g.timer = g.interval;
      }
    }
    this.activeGroups = this.activeGroups.filter((g) => g.remaining > 0);
    if (this.activeGroups.length === 0 && this.pendingGroups.length === 0) {
      this.restTimer = CONFIG.waveGap;
    }
  }

  private startWave(i: number): void {
    this.waveIndex = i;
    this.waveTimer = 0;
    const wave = WAVES[i];
    this.pendingGroups = wave.groups.map((group) => ({ group, started: false }));
    this.banner = { text: `WAVE ${i + 1}/${WAVES.length} · ${wave.name}`, t: 2.2 };
  }

  /** a가 바라보는 방향으로 b까지의 거리 (몸 크기 제외) */
  private gap(a: Unit, b: Unit): number {
    const dir = a.side === 'cat' ? 1 : -1;
    return (b.x - a.x) * dir - a.def.size * 0.6 - b.def.size * 0.6;
  }

  private findTarget(u: Unit): Unit | null {
    let best: Unit | null = null;
    let bestGap = Infinity;
    for (const o of this.units) {
      if (o.dead || o.side === u.side) continue;
      const g = this.gap(u, o);
      if (g < -o.def.size * 1.5) continue; // 등 뒤
      if (g <= u.def.range && g < bestGap) {
        best = o;
        bestGap = g;
      }
    }
    return best;
  }

  private updateUnits(dt: number): void {
    for (const u of this.units) {
      u.animT += dt;
      u.hitFlash = Math.max(0, u.hitFlash - dt);
      u.swing = Math.max(0, u.swing - dt * 3);
      if (u.dead) {
        u.deathT += dt;
        continue;
      }

      const target = this.findTarget(u);
      // 적: 집이 사거리 안인지
      const houseInRange = u.side === 'enemy' && u.x - u.def.size * 0.6 - CONFIG.houseX <= u.def.range;

      if (target || houseInRange) {
        u.attacking = true;
        u.atkTimer += dt;
        if (u.atkTimer >= u.def.atkInterval) {
          u.atkTimer = 0;
          u.swing = 1;
          this.attack(u, target);
        }
      } else {
        u.attacking = false;
        u.atkTimer = Math.min(u.atkTimer + dt, u.def.atkInterval * 0.6);
        const dir = u.side === 'cat' ? 1 : -1;
        u.x += dir * u.def.speed * dt;
        if (u.side === 'cat') u.x = Math.min(u.x, CONFIG.holeX - 30);
        else u.x = Math.max(u.x, CONFIG.houseX + u.def.size * 0.6);
      }
    }
    this.units = this.units.filter((u) => !(u.dead && u.deathT > 0.6));
  }

  private attack(u: Unit, target: Unit | null): void {
    const p = u.def.projectile;
    if (p) {
      this.projectiles.push({
        x: u.x + (u.side === 'cat' ? 1 : -1) * u.def.size,
        y: u.y - u.def.size * 0.6,
        targetUid: target ? target.uid : null,
        dmg: u.def.atk,
        speed: p.speed,
        color: p.color,
        radius: p.radius,
        side: u.side,
        spin: 0,
        done: false,
      });
      return;
    }
    if (target) {
      if (u.def.aoe) {
        for (const o of this.units) {
          if (o.dead || o.side === u.side) continue;
          if (Math.abs(o.x - target.x) <= u.def.aoe) this.damage(o, u.def.atk);
        }
        this.burst(target.x, target.y, '#ffe08a', 10);
      } else {
        this.damage(target, u.def.atk);
      }
    } else {
      this.damageHouse(u.def.atk);
    }
  }

  private damage(t: Unit, dmg: number): void {
    if (t.dead) return;
    t.hp -= dmg;
    t.hitFlash = 0.12;
    // 살짝 밀려남
    t.x += (t.side === 'cat' ? -1 : 1) * 2;
    this.floats.push({ x: t.x, y: t.y - t.def.size - 10, text: `${Math.round(dmg)}`, color: t.side === 'cat' ? '#ff8a8a' : '#ffffff', t: 0.7 });
    if (t.hp <= 0) {
      t.hp = 0;
      t.dead = true;
      t.deathT = 0;
      this.burst(t.x, t.y, t.def.color, 8);
      if (t.side === 'enemy') {
        this.kills++;
        const r = t.def.reward ?? 0;
        if (r > 0) {
          this.churu = Math.min(this.churuCap, this.churu + r);
          this.floats.push({ x: t.x, y: t.y - t.def.size - 26, text: `+${r} 츄르`, color: '#ffd84d', t: 1 });
        }
      }
    }
  }

  private damageHouse(dmg: number): void {
    this.houseHp -= dmg;
    this.houseFlash = 0.15;
    this.floats.push({ x: CONFIG.houseX - 30 + Math.random() * 30, y: 250, text: `-${dmg}`, color: '#ff6b6b', t: 0.8 });
  }

  private updateProjectiles(dt: number): void {
    for (const p of this.projectiles) {
      p.spin += dt * 12;
      let tx: number;
      let ty: number;
      let target: Unit | undefined;
      if (p.targetUid !== null) {
        target = this.units.find((u) => u.uid === p.targetUid);
        if (!target || target.dead) {
          p.done = true;
          continue;
        }
        tx = target.x;
        ty = target.y - target.def.size * 0.5;
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
        if (target) this.damage(target, p.dmg);
        else this.damageHouse(p.dmg);
        this.burst(tx, ty, p.color, 4);
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.done);
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
    for (const f of this.floats) {
      f.t -= dt;
      f.y -= 30 * dt;
    }
    this.floats = this.floats.filter((f) => f.t > 0);
    for (const p of this.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
  }
}
