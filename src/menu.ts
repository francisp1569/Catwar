// 로비 (DOM): 하단 5탭 — 상점 · 가방 · 전투 · 고양이 · 지도
import { drawFaceArtCircle, getArt } from './art';
import { drawCatLookToon, drawCatPortrait, IDLE_POSE } from './catdraw';
import { CATS, CAT_BY_ID, HERO_ID, RARITY_COLOR, type CatDef, type CatLook } from './data/cats';
import { SLOTS, SLOT_INFO, ITEM_MAX_LV, type Slot } from './data/items';
import { AREA_NAME, STAGES, type StageDef } from './data/stages';
import { rallyDesc } from './data/weapons';
import {
  ITEM_BOX10_COST, ITEM_BOX_COST, PULL10_COST, PULL_COST, RATES, claimFree, pull, pullItems, today, type PullResult,
} from './meta/gacha';
import {
  NAP_MAX_HOURS, bonuses, canItemUp, claimNap, collectionBonus, dismantle, dismantleValue, equip, fmtStat, isEquipped,
  itemName, itemStat, itemUp, itemUpCost, mergeAll, napPending, napRate, playerLevel, unequip,
} from './meta/items';
import {
  MAX_STARS, STAR_COST, canLevelUp, canStarUp, catStats, levelCap, levelUp, levelUpCost, starUp,
} from './meta/progression';
import { isUnlocked } from './meta/rewards';
import { DECK_SIZE, resetSave, writeSave, type Item, type SaveData } from './meta/save';
import { drawStagePreview } from './render';

type Tab = 'shop' | 'bag' | 'battle' | 'cats' | 'map';

const SILHOUETTE: CatLook = { base: '#4a3d55', pattern: 'solid', eye: '#4a3d55' };
const RARITY_LIST = ['SSR', 'SR', 'R', 'N'] as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString());

function power(def: CatDef, save: SaveData): number {
  const o = save.cats[def.id];
  if (!o) return 0;
  const s = catStats(def, o);
  return Math.round(s.hp / 3 + s.atk * 6 + o.stars * 20);
}

function teamPower(save: SaveData): number {
  const b = bonuses(save);
  const base = [HERO_ID, ...save.deck].reduce((sum, id) => sum + power(CAT_BY_ID[id], save), 0);
  return Math.round(base * (1 + b.atk + b.collection + b.hp * 0.5 + b.speed));
}

function stars(n: number, max = MAX_STARS): string {
  return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span></span>`;
}

function rarityBadge(r: string): string {
  return `<span class="rarity" style="background:${RARITY_COLOR[r as keyof typeof RARITY_COLOR]}">${r}</span>`;
}

function fmtTime(sec: number): string {
  return sec >= 60 ? `${Math.floor(sec / 60)}분${sec % 60 ? ` ${sec % 60}초` : ''}` : `${sec}초`;
}

export class Menu {
  private tab: Tab = 'battle';
  private catIdx = 0;
  private bagFilter: 'all' | Slot = 'all';
  private bagTab: 'equip' | 'mat' = 'equip';
  private resetArmed = false;
  private root: HTMLElement;
  private modal: HTMLElement;
  private toastTimer = 0;
  private raf = 0;

  constructor(private save: SaveData, private onStart: (stageId: string) => void) {
    this.root = document.getElementById('menu')!;
    this.modal = document.getElementById('modal')!;
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.modal.addEventListener('click', (e) => this.onClick(e));
  }

  refresh(): void {
    if (!this.root.hidden) this.render();
  }

  show(save: SaveData): void {
    this.save = save;
    this.root.hidden = false;
    this.render();
    this.startAnim();
  }

  hide(): void {
    this.root.hidden = true;
    this.closeModal();
    cancelAnimationFrame(this.raf);
  }

  private commit(): void {
    writeSave(this.save);
    this.render();
  }

  private toast(msg: string): void {
    const el = document.getElementById('toast')!;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 1800);
  }

  private get stage(): StageDef {
    return STAGES.find((s) => s.id === this.save.selectedStage) ?? STAGES[0];
  }

  // ───────────── 이벤트 ─────────────

  private onClick(e: MouseEvent): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) {
      if (e.target === this.modal) this.closeModal();
      return;
    }
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    const s = this.save;
    switch (act) {
      case 'tab': this.tab = arg as Tab; this.closeModal(); this.render(); break;
      case 'start': {
        const st = STAGES.find((x) => x.id === arg)!;
        if (!isUnlocked(s, st)) { this.toast('이전 스테이지를 먼저 클리어해요'); break; }
        this.onStart(arg);
        break;
      }
      case 'stage-prev':
      case 'stage-next': {
        const i = STAGES.findIndex((x) => x.id === s.selectedStage);
        const ni = Math.max(0, Math.min(STAGES.length - 1, i + (act === 'stage-next' ? 1 : -1)));
        s.selectedStage = STAGES[ni].id;
        this.commit();
        break;
      }
      case 'select-stage': s.selectedStage = arg; this.tab = 'battle'; this.commit(); break;
      case 'cat-prev': this.catIdx = (this.catIdx + CATS.length - 1) % CATS.length; this.render(); break;
      case 'cat-next': this.catIdx = (this.catIdx + 1) % CATS.length; this.render(); break;
      case 'cat-pick': this.catIdx = CATS.findIndex((c) => c.id === arg); this.render(); break;
      case 'goto-cat': this.catIdx = CATS.findIndex((c) => c.id === arg); this.tab = 'cats'; this.closeModal(); this.render(); break;
      case 'levelup': {
        const r = canLevelUp(s, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        levelUp(s, arg);
        this.commit();
        break;
      }
      case 'starup': {
        const r = canStarUp(s, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        starUp(s, arg);
        this.commit();
        this.toast(`${CAT_BY_ID[arg].name} 성급 상승! ✨`);
        break;
      }
      case 'deck-toggle': this.toggleDeck(arg); if (!this.modal.hidden) this.openDeck(); break;
      case 'deck-auto': this.autoDeck(); this.openDeck(); break;
      case 'deck': this.openDeck(); break;
      case 'skills': this.openSkills(arg); break;
      case 'album': this.openAlbum(arg); break;
      case 'pull': this.doPull(arg === '10' ? 10 : 1); break;
      case 'pull-item': this.doPullItems(arg === '10' ? 10 : 1); break;
      case 'free': {
        const r = claimFree(s);
        if (!r) { this.toast('오늘은 이미 받았어요. 내일 또 와요!'); break; }
        if (r.cat.isNew && s.deck.length < DECK_SIZE) s.deck.push(r.cat.def.id);
        this.commit();
        this.openPullResult([r.cat], [r.item]);
        break;
      }
      case 'nap': {
        const p = napPending(s);
        if (p.coins <= 0) { this.toast('고양이들이 아직 낮잠 중이에요 💤'); break; }
        const got = claimNap(s);
        this.commit();
        this.toast(`낮잠 보상 🪙${got.coins}${got.yarn ? ` 🧶${got.yarn}` : ''} 받았어요`);
        break;
      }
      case 'bag-filter': this.bagFilter = arg as 'all' | Slot; this.render(); break;
      case 'bag-tab': this.bagTab = arg as 'equip' | 'mat'; this.render(); break;
      case 'item': this.openItem(Number(arg)); break;
      case 'slot': {
        const uid = s.equip[arg as Slot];
        if (uid !== undefined) this.openItem(uid);
        else { this.bagFilter = arg as Slot; this.render(); this.toast(`${SLOT_INFO[arg as Slot].name} 장비가 없어요. 스테이지나 상점에서 얻어요`); }
        break;
      }
      case 'item-up':
      case 'item-up5': {
        const it = s.items.find((i) => i.uid === Number(arg));
        if (!it) break;
        let n = 0;
        while (n < (act === 'item-up5' ? 5 : 1) && itemUp(s, it)) n++;
        if (!n) { const r = canItemUp(s, it); if (!r.ok) this.toast(r.reason); break; }
        this.commit();
        this.openItem(it.uid);
        break;
      }
      case 'item-equip': {
        const it = s.items.find((i) => i.uid === Number(arg));
        if (!it) break;
        if (isEquipped(s, it)) unequip(s, it); else equip(s, it);
        this.commit();
        this.openItem(it.uid);
        break;
      }
      case 'item-break': {
        const it = s.items.find((i) => i.uid === Number(arg));
        if (!it) break;
        if (isEquipped(s, it)) { this.toast('장착 중인 장비는 분해할 수 없어요'); break; }
        const v = dismantle(s, it);
        this.closeModal();
        this.commit();
        this.toast(`분해해서 🧶 털실 ${v}개를 얻었어요`);
        break;
      }
      case 'merge': {
        const made = mergeAll(s);
        if (!made.length) { this.toast('합성할 장비가 없어요 (같은 부위·같은 등급 3개 필요)'); break; }
        this.commit();
        this.openItemsResult(made, '합성 완료!');
        break;
      }
      case 'settings': this.resetArmed = false; this.openSettings(); break;
      case 'reset':
        if (!this.resetArmed) { this.resetArmed = true; this.openSettings(); break; }
        this.save = resetSave();
        this.resetArmed = false;
        this.closeModal();
        this.commit();
        this.toast('처음부터 다시 시작해요');
        break;
      case 'close': this.closeModal(); break;
    }
  }

  private toggleDeck(id: string): void {
    const deck = this.save.deck;
    if (id === HERO_ID) { this.toast('치즈는 언제나 출전해요'); return; }
    const i = deck.indexOf(id);
    if (i >= 0) deck.splice(i, 1);
    else if (deck.length >= DECK_SIZE) { this.toast(`편성은 최대 ${DECK_SIZE}마리까지!`); return; }
    else deck.push(id);
    this.commit();
  }

  private autoDeck(): void {
    const owned = CATS.filter((c) => !c.hero && this.save.cats[c.id]);
    owned.sort((a, b) => power(b, this.save) - power(a, this.save));
    this.save.deck = owned.slice(0, DECK_SIZE).map((c) => c.id);
    this.commit();
    this.toast('전투력 순으로 자동 편성했어요');
  }

  private doPull(n: 1 | 10): void {
    const res = pull(this.save, n);
    if (!res) { this.toast('참치캔이 부족해요 🥫'); return; }
    for (const r of res) {
      if (r.isNew && this.save.deck.length < DECK_SIZE && !this.save.deck.includes(r.def.id)) this.save.deck.push(r.def.id);
    }
    this.commit();
    this.openPullResult(res, []);
  }

  private doPullItems(n: 1 | 10): void {
    const res = pullItems(this.save, n);
    if (!res) { this.toast('참치캔이 부족해요 🥫'); return; }
    this.commit();
    this.openItemsResult(res, '장비 상자에서 나온 것들!');
  }

  // ───────────── 애니메이션 (스테이지 미리보기, 큰 고양이) ─────────────

  private startAnim(): void {
    cancelAnimationFrame(this.raf);
    let last = 0;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (this.root.hidden || now - last < 33) return;
      last = now;
      const t = now / 1000;
      this.root.querySelectorAll<HTMLCanvasElement>('canvas[data-anim]').forEach((c) => this.drawAnim(c, t));
    };
    this.raf = requestAnimationFrame(loop);
  }

  private fit(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, c.clientWidth, c.clientHeight);
    return ctx;
  }

  private drawAnim(c: HTMLCanvasElement, t: number): void {
    const ctx = this.fit(c);
    if (!ctx) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    if (c.dataset.anim === 'stage') {
      const st = STAGES.find((x) => x.id === c.dataset.stage) ?? STAGES[0];
      drawStagePreview(ctx, st, w, h, t, !isUnlocked(this.save, st));
    } else if (c.dataset.anim === 'cat') {
      const id = c.dataset.id!;
      const owned = !!this.save.cats[id];
      const look = owned ? CAT_BY_ID[id].look : SILHOUETTE;
      const s = Math.min(h * 0.27, w / 5.2);
      ctx.save();
      ctx.translate(w / 2 - s * 0.15, h * 0.9 + Math.sin(t * 2) * 2);
      ellipse(ctx, s * 0.1, 0, s * 1.6, s * 0.28, 'rgba(60,20,40,0.18)');
      drawCatLookToon(ctx, 'menu-big', look, s, { ...IDLE_POSE, t }, Math.max(2, s * 0.06));
      ctx.restore();
    }
  }

  // ───────────── 렌더링 ─────────────

  private render(): void {
    const s = this.save;
    const pl = playerLevel(s.exp);
    const tabs: [Tab, string, string][] = [['shop', '🏪', '상점'], ['bag', '🎒', '가방'], ['battle', '⚔️', '전투'], ['cats', '🐱', '고양이'], ['map', '🗺️', '지도']];
    const freeReady = s.freeDay !== today();
    let body = '';
    if (this.tab === 'battle') body = this.battleView();
    else if (this.tab === 'cats') body = this.catsView();
    else if (this.tab === 'bag') body = this.bagView();
    else if (this.tab === 'shop') body = this.shopView();
    else body = this.mapView();
    this.root.innerHTML = `
      <header class="topbar">
        <div class="profile">
          <canvas class="avatar" data-face="${HERO_ID}"></canvas>
          <div class="pinfo">
            <b><small>Lv.</small>${pl.level} <span>집사</span></b>
            <div class="xpbar"><i style="width:${(pl.cur / pl.need) * 100}%"></i></div>
          </div>
        </div>
        <div class="res">
          <span title="코인">🪙 ${fmt(s.coins)}</span>
          <span title="참치캔">🥫 ${fmt(s.tuna)}</span>
          <span title="털실">🧶 ${fmt(s.yarn)}</span>
        </div>
      </header>
      <main class="view tab-${this.tab}">${body}</main>
      <nav class="tabs5">
        ${tabs.map(([id, icon, label]) => `
          <button data-act="tab" data-arg="${id}" class="${this.tab === id ? 'on' : ''} ${id === 'battle' ? 'center' : ''}">
            <span class="ti">${icon}</span><span class="tl">${label}</span>
            ${id === 'shop' && freeReady ? '<i class="dot"></i>' : ''}
            ${id === 'cats' && this.anyGrowable() ? '<i class="dot"></i>' : ''}
          </button>`).join('')}
      </nav>`;
    this.paintPortraits(this.root);
    this.root.querySelectorAll<HTMLCanvasElement>('canvas[data-anim]').forEach((c) => this.drawAnim(c, performance.now() / 1000));
  }

  private anyGrowable(): boolean {
    return CATS.some((c) => this.save.cats[c.id] && canStarUp(this.save, c.id).ok);
  }

  private paintPortraits(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLCanvasElement>('canvas[data-look]').forEach((c) => {
      const id = c.dataset.look!;
      const art = id === '?' ? null : getArt(id, 'face');
      if (art) {
        const ctx = this.fit(c);
        if (!ctx) return;
        const w = c.clientWidth;
        const h = c.clientHeight;
        const sc = Math.max(w / art.naturalWidth, h / art.naturalHeight);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, w * 0.14);
        ctx.clip();
        ctx.drawImage(art, (w - art.naturalWidth * sc) / 2, (h - art.naturalHeight * sc) / 2, art.naturalWidth * sc, art.naturalHeight * sc);
        ctx.restore();
        return;
      }
      drawCatPortrait(c, id === '?' ? SILHOUETTE : CAT_BY_ID[id].look);
    });
    // 동그란 얼굴 (사진이 있으면 얼굴 중심으로 자름)
    scope.querySelectorAll<HTMLCanvasElement>('canvas[data-face]').forEach((c) => {
      const id = c.dataset.face!;
      const art = getArt(id, 'face');
      if (art) {
        const ctx = this.fit(c);
        if (!ctx) return;
        const r = c.clientWidth / 2;
        drawFaceArtCircle(ctx, id, art, r, r, r);
      } else {
        drawCatPortrait(c, CAT_BY_ID[id].look);
      }
    });
  }

  // ── 전투 탭
  private battleView(): string {
    const s = this.save;
    const st = this.stage;
    const unlocked = isUnlocked(s, st);
    const best = s.stages[st.id] ?? 0;
    const nap = napPending(s);
    const freeReady = s.freeDay !== today();
    const isBoss = !!st.boss;
    const chest = (n: number, label: string) => `
      <div class="chest ${best >= n ? 'got' : ''}">
        <div class="box">${best >= n ? '✔' : '🎁'}</div>
        <small>${stars(n, n)}</small>
        <small class="muted">${label}</small>
      </div>`;
    const team = [HERO_ID, ...s.deck];
    return `
      <section class="stage-head">
        <div class="area">${AREA_NAME[st.area]} · ${best ? stars(best, 3) : '미클리어'}</div>
        <h1>St.${st.no} - ${esc(st.name.replace('[보스] ', ''))}${isBoss ? ' <span class="skull">💀</span>' : ''}</h1>
        <div class="pill">적 강함 x${st.mul.toFixed(1)} · ${fmtTime(st.duration)} 버티기${isBoss ? ' + 보스' : ''}</div>
      </section>
      <section class="diorama">
        <canvas data-anim="stage" data-stage="${st.id}"></canvas>
        <button class="nav-arrow left" data-act="stage-prev" ${st.no === 1 ? 'disabled' : ''}>◀</button>
        <button class="nav-arrow right" data-act="stage-next" ${st.no === STAGES.length ? 'disabled' : ''}>▶</button>
        ${unlocked ? '' : '<div class="lock-cover">🔒<small>이전 스테이지를 클리어하면 열려요</small></div>'}
        <div class="side left">
          <button class="side-btn" data-act="nap"><span>💤</span><small>낮잠 보상</small>${nap.coins > 0 ? `<em>${fmt(nap.coins)}</em>` : ''}</button>
          <button class="side-btn" data-act="tab" data-arg="shop"><span>🎁</span><small>무료 상자</small>${freeReady ? '<i class="dot"></i>' : ''}</button>
        </div>
        <div class="side right">
          <button class="side-btn" data-act="deck"><span>🧩</span><small>편성</small></button>
          <button class="side-btn" data-act="tab" data-arg="map"><span>🗺️</span><small>지도</small></button>
          <button class="side-btn" data-act="settings"><span>⚙️</span><small>설정</small></button>
        </div>
      </section>
      <section class="chests">
        ${chest(1, `🪙${st.reward.coins}`)}
        <div class="chest-line"></div>
        ${chest(2, '🥫20 · 장비')}
        <div class="chest-line"></div>
        ${chest(3, '🥫20 · 장비+1')}
      </section>
      <button class="start-btn" data-act="start" data-arg="${st.id}" ${unlocked ? '' : 'disabled'}>
        <span>START</span><small>팀 전투력 ${fmt(teamPower(s))}</small>
      </button>
      <button class="team-strip" data-act="deck">
        ${team.map((id) => `<canvas class="mini-face" data-face="${id}"></canvas>`).join('')}
        ${Array.from({ length: DECK_SIZE - s.deck.length }, () => '<span class="mini-empty">+</span>').join('')}
      </button>`;
  }

  // ── 고양이 탭
  private catsView(): string {
    const s = this.save;
    const def = CATS[this.catIdx];
    const o = s.cats[def.id];
    const owned = CATS.filter((c) => s.cats[c.id]).length;
    const coll = collectionBonus(s);
    const row = CATS.map((c, i) => {
      const oc = s.cats[c.id];
      return `<button class="pchip ${i === this.catIdx ? 'sel' : ''} ${oc ? '' : 'locked'}" data-act="cat-pick" data-arg="${c.id}" style="--rc:${RARITY_COLOR[c.rarity]}">
        ${oc ? `<canvas data-face="${c.id}"></canvas>` : '<span class="q">?</span>'}
        ${oc ? `<em>${oc.level}</em>` : ''}${oc && (s.deck.includes(c.id) || c.hero) ? '<b class="in">출전</b>' : ''}
        ${oc && canStarUp(s, c.id).ok ? '<i class="dot"></i>' : ''}
      </button>`;
    }).join('');
    let main: string;
    if (!o) {
      main = `
        <div class="cat-title"><div>${rarityBadge(def.rarity)}</div><h2>???</h2><div class="lv">아직 만나지 못한 고양이</div></div>
        <canvas class="bigcat" data-anim="cat" data-id="${def.id}"></canvas>
        <div class="cat-actions"><button class="btn gold" data-act="tab" data-arg="shop">📦 상자 뽑기에서 만나기</button></div>`;
    } else {
      const st = catStats(def, o);
      const cap = levelCap(o.stars);
      const lvCost = levelUpCost(def, o.level);
      const need = o.stars < MAX_STARS ? STAR_COST[o.stars] : 0;
      const inDeck = def.hero || s.deck.includes(def.id);
      main = `
        <div class="cat-title">
          <div>${rarityBadge(def.rarity)} <span class="breed">${esc(def.breed)}</span></div>
          <h2>${def.name}</h2>
          <div class="lv">Lv.${o.level}<small>/${cap}</small> ${stars(o.stars)}</div>
        </div>
        <canvas class="bigcat" data-anim="cat" data-id="${def.id}"></canvas>
        <div class="side left">
          ${getArt(def.id, 'face') ? `<button class="side-btn" data-act="album" data-arg="${def.id}"><span>📷</span><small>앨범</small></button>` : ''}
        </div>
        <div class="side right">
          <button class="side-btn" data-act="skills" data-arg="${def.id}"><span>${def.weapon.icon}</span><small>스킬</small></button>
          <button class="side-btn ${inDeck ? 'on' : ''}" data-act="deck-toggle" data-arg="${def.id}"><span>${inDeck ? '⚔️' : '💤'}</span><small>${inDeck ? '출전 중' : '대기'}</small></button>
        </div>
        <div class="skill-badge"><span class="ic">${def.weapon.icon}</span>${esc(def.skillName)}<small>⚔️ ${st.atk} · 🛡 +${st.hp}</small></div>
        <div class="cat-actions">
          <button class="btn ${canLevelUp(s, def.id).ok ? '' : 'off'}" data-act="levelup" data-arg="${def.id}">레벨 업<small>${o.level >= cap ? '상한 도달' : `🪙 ${fmt(lvCost)}`}</small></button>
          <button class="btn gold ${canStarUp(s, def.id).ok ? '' : 'off'}" data-act="starup" data-arg="${def.id}">★ 성급 업<small>${o.stars >= MAX_STARS ? 'MAX' : `조각 ${o.shards}/${need}`}</small></button>
        </div>`;
    }
    return `
      <section class="showcase" style="--rc:${RARITY_COLOR[def.rarity]}">
        <button class="nav-arrow left" data-act="cat-prev">◀</button>
        <button class="nav-arrow right" data-act="cat-next">▶</button>
        ${main}
      </section>
      <div class="collect-banner"><span>도감 보너스 · 모든 고양이 공격력</span><b>${fmtStat(coll)}</b><small>${owned}/${CATS.length}</small></div>
      <div class="prow">${row}</div>`;
  }

  // ── 가방 탭
  private itemCard(it: Item, extra = ''): string {
    const eq = isEquipped(this.save, it);
    return `<button class="item r-${it.rarity}" data-act="item" data-arg="${it.uid}" ${extra}>
      <span class="ico">${SLOT_INFO[it.slot].icon}</span>
      <span class="ilv">Lv.${it.level}</span>
      <span class="irar">${it.rarity}</span>
      ${eq ? '<span class="eq">E</span>' : ''}
    </button>`;
  }

  private bagView(): string {
    const s = this.save;
    const b = bonuses(s);
    const slots = SLOTS.map((slot) => {
      const it = s.items.find((i) => i.uid === s.equip[slot]);
      if (!it) return `<button class="item empty" data-act="slot" data-arg="${slot}"><span class="ico">${SLOT_INFO[slot].icon}</span><span class="ilv">${SLOT_INFO[slot].name}</span></button>`;
      return this.itemCard(it);
    }).join('');
    const statLine = ([
      ['공격력', b.atk + b.collection], ['체력', b.hp], ['공속', b.speed], ['피해감소', b.reduce], ['경험치', b.xp], ['코인', b.coin],
    ] as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => `<span>${k} <b>${fmtStat(v)}</b></span>`).join('');
    let inv = '';
    if (this.bagTab === 'equip') {
      const list = s.items
        .filter((i) => this.bagFilter === 'all' || i.slot === this.bagFilter)
        .sort((a, c) => RARITY_LIST.indexOf(a.rarity) - RARITY_LIST.indexOf(c.rarity) || c.level - a.level || SLOTS.indexOf(a.slot) - SLOTS.indexOf(c.slot));
      inv = `
        <div class="inv-head">
          <div class="filters">
            <button class="${this.bagFilter === 'all' ? 'on' : ''}" data-act="bag-filter" data-arg="all">ALL</button>
            ${SLOTS.map((sl) => `<button class="${this.bagFilter === sl ? 'on' : ''}" data-act="bag-filter" data-arg="${sl}">${SLOT_INFO[sl].icon}</button>`).join('')}
          </div>
          <button class="btn small gold" data-act="merge">일괄 합성</button>
        </div>
        <div class="inv-grid">${list.map((it) => this.itemCard(it)).join('') || '<p class="muted empty-msg">장비가 없어요. 스테이지를 클리어하거나 상점에서 얻어요.</p>'}</div>`;
    } else {
      const mats = [
        ['🧶', '털실', s.yarn],
        ['🥫', '참치캔', s.tuna],
        ['🪙', '코인', s.coins],
        ...CATS.filter((c) => s.cats[c.id] && s.cats[c.id].shards > 0).map((c) => [c.weapon.icon, `${c.name} 조각`, s.cats[c.id].shards]),
      ] as [string, string, number][];
      inv = `<div class="inv-grid mats">${mats.map(([ic, name, n]) => `
        <div class="item mat"><span class="ico">${ic}</span><span class="ilv">${fmt(n)}</span><span class="mname">${esc(name)}</span></div>`).join('')}</div>
        <p class="muted">🧶 털실은 장비 강화 재료예요. 장비 분해, 스테이지 보상, 낮잠 보상으로 얻어요.</p>`;
    }
    return `
      <section class="equip-panel">
        <canvas class="bigcat small" data-anim="cat" data-id="${HERO_ID}"></canvas>
        <div class="power"><small>전투력</small>${fmt(teamPower(s))}</div>
        <div class="eslots">${slots}</div>
        <div class="statline">${statLine || '<span>장비를 장착하면 모든 고양이가 강해져요</span>'}</div>
      </section>
      <section class="inventory">
        ${inv}
      </section>
      <nav class="subtabs">
        <button class="${this.bagTab === 'equip' ? 'on' : ''}" data-act="bag-tab" data-arg="equip">장비 가방 <small>${s.items.length}</small></button>
        <button class="${this.bagTab === 'mat' ? 'on' : ''}" data-act="bag-tab" data-arg="mat">재료 가방</button>
      </nav>`;
  }

  // ── 상점 탭
  private shopView(): string {
    const s = this.save;
    const freeReady = s.freeDay !== today();
    const rates = RARITY_LIST.map((r) => `<span><i style="background:${RARITY_COLOR[r]}"></i>${r} ${Math.round(RATES[r] * 100)}%</span>`).join('');
    return `
      <section class="shop-card free ${freeReady ? '' : 'done'}">
        <div class="sc-ico">🎁</div>
        <div class="sc-body"><b>오늘의 무료 상자</b><small>매일 고양이 뽑기 1회 + 장비 1개</small></div>
        <button class="btn ${freeReady ? 'gold' : 'off'}" data-act="free">${freeReady ? '받기' : '내일 또!'}</button>
      </section>
      <section class="shop-card big">
        <div class="box"><div class="box-lid"></div><div class="box-body">📦<span>FRAGILE · 냥</span></div><div class="ears"><i></i><i></i></div></div>
        <b class="sc-title">골판지 상자 뽑기</b>
        <small class="muted">새 고양이를 만나요. 이미 있는 고양이는 성급 조각 +10</small>
        <div class="rates">${rates}</div>
        <div class="pull-buttons">
          <button class="btn" data-act="pull" data-arg="1">1회<br><small>🥫 ${PULL_COST}</small></button>
          <button class="btn gold" data-act="pull" data-arg="10">10회<br><small>🥫 ${PULL10_COST} · SR 이상 확정</small></button>
        </div>
      </section>
      <section class="shop-card big gear">
        <div class="gear-ico">${SLOTS.map((sl) => `<span>${SLOT_INFO[sl].icon}</span>`).join('')}</div>
        <b class="sc-title">집사 장비 상자</b>
        <small class="muted">목걸이·모자·장난감·방석·밥그릇·방울 중 하나. 스테이지를 깰수록 좋은 장비가 잘 나와요</small>
        <div class="pull-buttons">
          <button class="btn" data-act="pull-item" data-arg="1">1개<br><small>🥫 ${ITEM_BOX_COST}</small></button>
          <button class="btn gold" data-act="pull-item" data-arg="10">10개<br><small>🥫 ${ITEM_BOX10_COST} · SR 이상 확정</small></button>
        </div>
      </section>`;
  }

  // ── 지도 탭
  private mapView(): string {
    const s = this.save;
    let lastArea = '';
    return `<h2 class="map-title">지도 <small>스테이지를 골라 출전해요</small></h2>` + STAGES.map((st) => {
      const unlocked = isUnlocked(s, st);
      const best = s.stages[st.id] ?? 0;
      const header = st.area !== lastArea ? `<h3 class="area">${AREA_NAME[st.area]}</h3>` : '';
      lastArea = st.area;
      return `${header}
        <button class="stage ${unlocked ? '' : 'locked'} ${st.boss ? 'boss' : ''} ${st.id === s.selectedStage ? 'sel' : ''}" data-act="select-stage" data-arg="${st.id}">
          <div class="no">${st.no}</div>
          <div class="info">
            <b>${esc(st.name)}</b>
            <small>${fmtTime(st.duration)} 버티기 · 적 강함 x${st.mul.toFixed(1)}</small>
          </div>
          ${unlocked ? (best ? stars(best, 3) : '<span class="newtag">NEW</span>') : '<span class="lock">🔒</span>'}
        </button>`;
    }).join('');
  }

  // ───────────── 모달 ─────────────

  private openModal(html: string, cls = ''): void {
    this.modal.innerHTML = `<div class="sheet ${cls}">${html}</div>`;
    this.modal.hidden = false;
    this.paintPortraits(this.modal);
  }

  private closeModal(): void {
    this.modal.hidden = true;
    this.modal.innerHTML = '';
  }

  private openDeck(): void {
    const s = this.save;
    const slots = Array.from({ length: DECK_SIZE }, (_, i) => {
      const id = s.deck[i];
      if (!id) return `<div class="slot empty">빈 자리</div>`;
      const d = CAT_BY_ID[id];
      return `<button class="slot" data-act="deck-toggle" data-arg="${id}"><canvas class="portrait" data-look="${id}"></canvas><b>${d.name}</b><small>${d.weapon.icon} ${esc(d.skillName)}</small></button>`;
    }).join('');
    const owned = CATS.filter((c) => !c.hero && s.cats[c.id]);
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>편성 <small>팀 전투력 ${fmt(teamPower(s))}</small></h2>
      <div class="deck">
        <div class="slot hero"><canvas class="portrait" data-look="${HERO_ID}"></canvas><b>치즈</b><small>리더 · 처음부터 전투</small></div>
        ${slots}
      </div>
      <div class="row"><p class="muted">편성한 고양이는 전투 중 레벨업 카드로 깨어나 합류해요.</p><button class="btn small" data-act="deck-auto">자동 편성</button></div>
      <div class="grid">${owned.map((d) => {
        const o = s.cats[d.id];
        return `<button class="card ${s.deck.includes(d.id) ? 'in-deck' : ''}" data-act="deck-toggle" data-arg="${d.id}" style="--rc:${RARITY_COLOR[d.rarity]}">
          ${rarityBadge(d.rarity)}${s.deck.includes(d.id) ? '<span class="check">✔</span>' : ''}
          <canvas class="portrait" data-look="${d.id}"></canvas><b>${d.name}</b><small>Lv.${o.level} ${stars(o.stars)}</small>
          <small class="muted">${d.weapon.icon} ${esc(d.skillName)}</small></button>`;
      }).join('')}</div>`);
  }

  private openSkills(id: string): void {
    const def = CAT_BY_ID[id];
    const o = this.save.cats[id];
    const w = def.weapon;
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>${w.icon} ${esc(def.skillName)} <small>${def.name}</small></h2>
      <p class="muted">전투 중 레벨업 카드로 Lv.1 → Lv.5까지 성장해요. 고양이 레벨과 성급(★)은 위력을 올려요.</p>
      <ul class="skill">${w.desc.map((d, i) => `<li class="${i === 0 ? 'cur' : ''}">Lv.${i + 1} ${esc(d)}</li>`).join('')}</ul>
      ${def.hero && o ? `<h3>📣 꾹꾹이 응원 <small>★${o.stars}</small></h3><ul class="skill"><li class="cur">${esc(rallyDesc(o.stars))}</li></ul>` : ''}
      <p class="muted">${esc(def.bio)}</p>`);
  }

  private openAlbum(id: string): void {
    const def = CAT_BY_ID[id];
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>📷 ${def.name}의 앨범</h2>
      <canvas class="album-photo" data-look="${id}"></canvas>
      <p class="muted center">${esc(def.bio)}</p>`, 'album');
  }

  private openSettings(): void {
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>⚙️ 설정</h2>
      <p class="muted">진행 상황은 이 브라우저에 자동 저장돼요.</p>
      <p class="muted">낮잠 보상: 시간당 🪙${napRate(this.save)} (최대 ${NAP_MAX_HOURS}시간 쌓임)</p>
      <button class="btn ${this.resetArmed ? 'danger' : 'off'}" data-act="reset">${this.resetArmed ? '정말 초기화할까요? 한 번 더 누르면 삭제돼요' : '진행 상황 초기화'}</button>`);
  }

  private openItem(uid: number): void {
    const s = this.save;
    const it = s.items.find((i) => i.uid === uid);
    if (!it) { this.closeModal(); return; }
    const info = SLOT_INFO[it.slot];
    const max = ITEM_MAX_LV[it.rarity];
    const cur = itemStat(it);
    const next = it.level < max ? itemStat({ ...it, level: it.level + 1 }) : cur;
    const cost = itemUpCost(it);
    const eq = isEquipped(s, it);
    const same = s.items.filter((i) => i.slot === it.slot).sort((a, b) => RARITY_LIST.indexOf(a.rarity) - RARITY_LIST.indexOf(b.rarity) || b.level - a.level);
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <div class="bench">
        <div class="bench-item r-${it.rarity}"><span class="ico">${info.icon}</span><span class="irar">${it.rarity}</span></div>
        <b class="iname">${esc(itemName(it))}</b>
        <small>${info.name} ${rarityBadge(it.rarity)}${eq ? ' · 장착 중' : ''}</small>
      </div>
      <div class="upgrade">
        <div class="uprow"><span>Lv.${it.level}</span><span class="arrow">➜</span><span class="g">${it.level < max ? `Lv.${it.level + 1}` : 'MAX'}</span></div>
        <div class="uplabel">기본 능력치</div>
        <div class="uprow"><span>${info.statName} ${fmtStat(cur)}</span><span class="arrow">➜</span><span class="g">${fmtStat(next)}</span></div>
      </div>
      <div class="costs">
        <span class="${s.yarn >= cost.yarn ? '' : 'lack'}">🧶 ${s.yarn}/${cost.yarn}</span>
        <span class="${s.coins >= cost.coins ? '' : 'lack'}">🪙 ${fmt(s.coins)}/${fmt(cost.coins)}</span>
      </div>
      <div class="row center gap">
        <button class="btn blue" data-act="item-up" data-arg="${it.uid}">Lv.UP</button>
        <button class="btn gold" data-act="item-up5" data-arg="${it.uid}">5회 Lv.UP</button>
      </div>
      <div class="row center gap">
        <button class="btn ${eq ? 'off' : ''}" data-act="item-equip" data-arg="${it.uid}">${eq ? '장착 해제' : '장착하기'}</button>
        <button class="btn small danger" data-act="item-break" data-arg="${it.uid}">분해 (🧶+${dismantleValue(it)})</button>
      </div>
      <div class="same-row">${same.map((x) => this.itemCard(x, x.uid === it.uid ? 'data-sel="1"' : '')).join('')}</div>`, 'workbench');
  }

  private openPullResult(res: PullResult[], items: Item[]): void {
    const cards = res.map((r, i) => `
      <button class="pull-card" data-act="goto-cat" data-arg="${r.def.id}" style="--rc:${RARITY_COLOR[r.def.rarity]};animation-delay:${i * 0.08}s">
        ${rarityBadge(r.def.rarity)}
        <canvas class="portrait" data-look="${r.def.id}"></canvas>
        <b>${r.def.name}</b>
        <small>${r.isNew ? '<em>NEW!</em>' : `조각 +${r.shards}`}</small>
      </button>`).join('');
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>상자에서 나온 고양이들!</h2>
      <div class="pull-grid ${res.length === 1 ? 'single' : ''}">${cards}</div>
      ${items.length ? `<h3>함께 받은 장비</h3><div class="inv-grid">${items.map((it) => this.itemCard(it)).join('')}</div>` : ''}
      <div class="row center"><button class="btn" data-act="close">확인</button></div>`);
  }

  private openItemsResult(items: Item[], title: string): void {
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>${title}</h2>
      <div class="inv-grid pop">${items.map((it, i) => this.itemCard(it, `style="animation-delay:${i * 0.06}s"`)).join('')}</div>
      <p class="muted center">장비를 누르면 강화·장착할 수 있어요</p>
      <div class="row center"><button class="btn" data-act="close">확인</button></div>`);
  }
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}
