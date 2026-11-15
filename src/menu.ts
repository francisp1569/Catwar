// 로비 화면 (DOM): 스테이지 / 고양이 도감·성장 / 편성 / 뽑기
import { drawCatPortrait } from './catdraw';
import { CATS, CAT_BY_ID, HERO_ID, RARITY_COLOR, RARITY_ORDER, type CatDef, type CatLook } from './data/cats';
import { SKILL_INFO } from './data/skills';
import { AREA_NAME, STAGES } from './data/stages';
import { PULL10_COST, PULL_COST, RATES, pull, type PullResult } from './meta/gacha';
import {
  MAX_STARS, STAR_COST, canLevelUp, canStarUp, catStats, levelCap, levelUp, levelUpCost, starUp,
} from './meta/progression';
import { isUnlocked } from './meta/rewards';
import { DECK_SIZE, resetSave, writeSave, type SaveData } from './meta/save';

type Tab = 'stage' | 'cats' | 'deck' | 'gacha';

const SILHOUETTE: CatLook = { base: '#4a3d55', pattern: 'solid', eye: '#4a3d55' };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function power(def: CatDef, save: SaveData): number {
  const o = save.cats[def.id];
  if (!o) return 0;
  const s = catStats(def, o);
  return Math.round(s.hp / 4 + (s.atk / def.atkInterval) * 3 + o.stars * 20);
}

function stars(n: number, max = MAX_STARS): string {
  return `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(max - n)}</span></span>`;
}

function rarityBadge(def: CatDef): string {
  return `<span class="rarity" style="background:${RARITY_COLOR[def.rarity]}">${def.rarity}</span>`;
}

export class Menu {
  private tab: Tab = 'stage';
  private root: HTMLElement;
  private modal: HTMLElement;
  private toastTimer = 0;

  constructor(
    private save: SaveData,
    private onStart: (stageId: string) => void,
  ) {
    this.root = document.getElementById('menu')!;
    this.modal = document.getElementById('modal')!;
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.modal.addEventListener('click', (e) => this.onClick(e));
  }

  show(save: SaveData): void {
    this.save = save;
    this.root.hidden = false;
    this.render();
  }

  hide(): void {
    this.root.hidden = true;
    this.closeModal();
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
    this.toastTimer = window.setTimeout(() => el.classList.remove('show'), 1600);
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
    switch (act) {
      case 'tab': this.tab = arg as Tab; this.render(); break;
      case 'start': this.onStart(arg); break;
      case 'cat': this.openCat(arg); break;
      case 'levelup': {
        const r = canLevelUp(this.save, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        levelUp(this.save, arg);
        this.commit();
        this.openCat(arg);
        break;
      }
      case 'levelup10': {
        let n = 0;
        while (n < 10 && levelUp(this.save, arg)) n++;
        if (n === 0) { const r = canLevelUp(this.save, arg); if (!r.ok) this.toast(r.reason); break; }
        this.commit();
        this.openCat(arg);
        break;
      }
      case 'starup': {
        const r = canStarUp(this.save, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        starUp(this.save, arg);
        this.commit();
        this.openCat(arg);
        this.toast(`${CAT_BY_ID[arg].name} 성급 상승! 스킬 강화 ✨`);
        break;
      }
      case 'deck-toggle': this.toggleDeck(arg); break;
      case 'deck-auto': this.autoDeck(); break;
      case 'pull': this.doPull(arg === '10' ? 10 : 1); break;
      case 'close': this.closeModal(); break;
      case 'reset':
        if (confirm('정말 모든 진행 상황을 초기화할까요?')) {
          this.save = resetSave();
          this.commit();
        }
        break;
    }
  }

  private toggleDeck(id: string): void {
    const deck = this.save.deck;
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
    // 빈 슬롯이 있으면 새 고양이를 자동 편성
    for (const r of res) {
      if (r.isNew && this.save.deck.length < DECK_SIZE && !this.save.deck.includes(r.def.id)) this.save.deck.push(r.def.id);
    }
    this.commit();
    this.openPullResult(res);
  }

  // ───────────── 렌더링 ─────────────

  private render(): void {
    const s = this.save;
    const teamPower = [HERO_ID, ...s.deck].reduce((sum, id) => sum + power(CAT_BY_ID[id], s), 0);
    const tabs: [Tab, string, string][] = [['stage', '🗺️', '스테이지'], ['cats', '🐱', '고양이'], ['deck', '🧩', '편성'], ['gacha', '📦', '상자 뽑기']];
    this.root.innerHTML = `
      <header class="topbar">
        <div class="brand">CATWAR <small>냥냥 방위대</small></div>
        <div class="wallet"><span title="코인">🪙 ${s.coins.toLocaleString()}</span><span title="참치캔">🥫 ${s.tuna.toLocaleString()}</span></div>
      </header>
      <main class="view">
        ${this.tab === 'stage' ? this.stageView(teamPower) : ''}
        ${this.tab === 'cats' ? this.catsView() : ''}
        ${this.tab === 'deck' ? this.deckView(teamPower) : ''}
        ${this.tab === 'gacha' ? this.gachaView() : ''}
      </main>
      <nav class="tabs">
        ${tabs.map(([id, icon, label]) => `<button data-act="tab" data-arg="${id}" class="${this.tab === id ? 'on' : ''}"><span>${icon}</span>${label}</button>`).join('')}
      </nav>`;
    this.paintPortraits(this.root);
  }

  private paintPortraits(scope: HTMLElement): void {
    scope.querySelectorAll<HTMLCanvasElement>('canvas[data-look]').forEach((c) => {
      const id = c.dataset.look!;
      const look = id === '?' ? SILHOUETTE : CAT_BY_ID[id].look;
      drawCatPortrait(c, look);
    });
  }

  private stageView(teamPower: number): string {
    const s = this.save;
    const hero = CAT_BY_ID[HERO_ID];
    const ho = s.cats[HERO_ID];
    let lastArea = '';
    const list = STAGES.map((st) => {
      const unlocked = isUnlocked(s, st);
      const best = s.stages[st.id] ?? 0;
      const header = st.area !== lastArea ? `<h3 class="area">${AREA_NAME[st.area]}</h3>` : '';
      lastArea = st.area;
      return `${header}
        <div class="stage ${unlocked ? '' : 'locked'} ${st.name.startsWith('[보스]') ? 'boss' : ''}">
          <div class="no">${st.no}</div>
          <div class="info">
            <b>${esc(st.name)}</b>
            <small>웨이브 ${st.waves.length} · 적 강함 x${st.mul.toFixed(1)}</small>
            <small>${best ? stars(best, 3) : `첫 클리어: 🪙${st.reward.coins} 🥫${st.reward.tuna}`}</small>
          </div>
          ${unlocked ? `<button class="btn go" data-act="start" data-arg="${st.id}">출전</button>` : '<span class="lock">🔒</span>'}
        </div>`;
    }).join('');
    return `
      <section class="hero-card">
        <canvas class="portrait big" data-look="${HERO_ID}"></canvas>
        <div>
          <div class="hero-name">${hero.name} <small>${hero.breed}</small></div>
          <div>Lv.${ho.level} ${stars(ho.stars)}</div>
          <div class="muted">${esc(hero.bio)}</div>
          <div class="power">팀 전투력 <b>${teamPower.toLocaleString()}</b></div>
          <button class="btn small" data-act="cat" data-arg="${HERO_ID}">치즈 성장시키기</button>
        </div>
      </section>
      <section class="stages">${list}</section>
      <p class="footer"><button class="link" data-act="reset">진행 상황 초기화</button></p>`;
  }

  private catCard(def: CatDef, opts: { inDeck?: boolean; act?: string } = {}): string {
    const o = this.save.cats[def.id];
    if (!o) {
      return `<div class="card locked"><canvas class="portrait" data-look="?"></canvas><b>???</b><small>${def.rarity} · 미획득</small></div>`;
    }
    const canGrow = canLevelUp(this.save, def.id).ok || canStarUp(this.save, def.id).ok;
    return `
      <button class="card ${opts.inDeck ? 'in-deck' : ''}" data-act="${opts.act ?? 'cat'}" data-arg="${def.id}" style="--rc:${RARITY_COLOR[def.rarity]}">
        ${rarityBadge(def)}
        ${canGrow && !opts.act ? '<span class="dot"></span>' : ''}
        ${opts.inDeck ? '<span class="check">✔</span>' : ''}
        <canvas class="portrait" data-look="${def.id}"></canvas>
        <b>${def.name}</b>
        <small>Lv.${o.level} ${stars(o.stars)}</small>
        <small class="muted">${def.role} · ${SKILL_INFO[def.skill].icon} ${esc(def.skillName)}</small>
      </button>`;
  }

  private catsView(): string {
    const ownedCount = CATS.filter((c) => this.save.cats[c.id]).length;
    const sorted = [...CATS].sort((a, b) => {
      const oa = this.save.cats[a.id] ? 0 : 1;
      const ob = this.save.cats[b.id] ? 0 : 1;
      return oa - ob || RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
    });
    return `
      <h2>고양이 도감 <small>${ownedCount} / ${CATS.length}</small></h2>
      <p class="muted">레벨업은 🪙코인, 성급(★)은 중복으로 얻은 조각으로 올려요. 성급이 오르면 스킬이 강해지고 레벨 상한이 늘어나요.</p>
      <div class="grid">${sorted.map((d) => this.catCard(d)).join('')}</div>`;
  }

  private deckView(teamPower: number): string {
    const s = this.save;
    const slots = Array.from({ length: DECK_SIZE }, (_, i) => {
      const id = s.deck[i];
      if (!id) return `<div class="slot empty">빈 슬롯</div>`;
      const d = CAT_BY_ID[id];
      return `<button class="slot" data-act="deck-toggle" data-arg="${id}"><canvas class="portrait" data-look="${id}"></canvas><b>${d.name}</b><small>🐟${d.cost}</small></button>`;
    }).join('');
    const owned = CATS.filter((c) => !c.hero && s.cats[c.id]);
    return `
      <h2>편성 <small>팀 전투력 ${teamPower.toLocaleString()}</small></h2>
      <div class="deck">
        <div class="slot hero"><canvas class="portrait" data-look="${HERO_ID}"></canvas><b>치즈</b><small>리더 · 자동 출전</small></div>
        ${slots}
      </div>
      <div class="row"><p class="muted">고양이를 눌러 편성에 넣거나 빼요. (최대 ${DECK_SIZE}마리)</p><button class="btn small" data-act="deck-auto">자동 편성</button></div>
      <div class="grid">${owned.map((d) => this.catCard(d, { inDeck: s.deck.includes(d.id), act: 'deck-toggle' })).join('')}</div>`;
  }

  private gachaView(): string {
    const rates = RARITY_ORDER.slice().reverse().map((r) => `<span><i style="background:${RARITY_COLOR[r]}"></i>${r} ${Math.round(RATES[r] * 100)}%</span>`).join('');
    return `
      <section class="gacha">
        <div class="box">
          <div class="box-lid"></div>
          <div class="box-body">📦<span>FRAGILE · 냥</span></div>
          <div class="ears"><i></i><i></i></div>
        </div>
        <h2>골판지 상자 뽑기</h2>
        <p class="muted">상자 속에서 어떤 고양이가 나올까? 이미 있는 고양이가 나오면 성급 조각 +10!</p>
        <div class="rates">${rates}</div>
        <div class="pull-buttons">
          <button class="btn" data-act="pull" data-arg="1">1회 뽑기<br><small>🥫 ${PULL_COST}</small></button>
          <button class="btn gold" data-act="pull" data-arg="10">10회 뽑기<br><small>🥫 ${PULL10_COST} · SR 이상 1마리 확정</small></button>
        </div>
        <p class="muted">참치캔은 스테이지 첫 클리어와 별 획득으로 얻어요. 주인공 치즈는 뽑기에 나오지 않고, 스테이지 클리어마다 조각을 얻어요.</p>
      </section>`;
  }

  // ───────────── 모달 ─────────────

  private openModal(html: string): void {
    this.modal.innerHTML = `<div class="sheet">${html}</div>`;
    this.modal.hidden = false;
    this.paintPortraits(this.modal);
  }

  private closeModal(): void {
    this.modal.hidden = true;
    this.modal.innerHTML = '';
  }

  private openCat(id: string): void {
    const def = CAT_BY_ID[id];
    const o = this.save.cats[id];
    if (!def || !o) return;
    const st = catStats(def, o);
    const cap = levelCap(o.stars);
    const lvCost = levelUpCost(def, o.level);
    const starNeed = o.stars < MAX_STARS ? STAR_COST[o.stars] : 0;
    const info = SKILL_INFO[def.skill];
    const skillLines = Array.from({ length: MAX_STARS }, (_, i) => i + 1)
      .map((lv) => `<li class="${lv === o.stars ? 'cur' : lv < o.stars ? 'done' : ''}">★${lv} ${esc(info.desc(lv))}</li>`).join('');
    const canLv = canLevelUp(this.save, id);
    const canSt = canStarUp(this.save, id);
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <div class="detail-head" style="--rc:${RARITY_COLOR[def.rarity]}">
        <canvas class="portrait big" data-look="${id}"></canvas>
        <div>
          ${rarityBadge(def)} <span class="muted">${esc(def.breed)}</span>
          <h2>${def.name} <small>${def.role}</small></h2>
          <div>Lv.${o.level} / ${cap} ${stars(o.stars)}</div>
          <p class="muted">${esc(def.bio)}</p>
        </div>
      </div>
      <div class="stats">
        <span>❤️ 체력 <b>${st.hp}</b></span>
        <span>⚔️ 공격 <b>${st.atk}</b></span>
        <span>🎯 사거리 <b>${def.range > 60 ? def.range : '근접'}</b></span>
        <span>👟 속도 <b>${def.speed}</b></span>
        ${def.hero ? '<span>👑 자동 출전</span>' : `<span>🐟 비용 <b>${def.cost}</b></span><span>⏱ 재소환 <b>${def.cooldown}s</b></span>`}
      </div>
      <h3>${info.icon} ${esc(def.skillName)} <small>스킬 Lv.${o.stars}</small></h3>
      <ul class="skill">${skillLines}</ul>
      <div class="grow">
        <div>
          <b>레벨업</b>
          <small>${o.level >= cap ? '레벨 상한! 성급을 올려주세요' : `🪙 ${lvCost} (보유 ${this.save.coins})`}</small>
          <div class="row">
            <button class="btn ${canLv.ok ? '' : 'off'}" data-act="levelup" data-arg="${id}">+1</button>
            <button class="btn ${canLv.ok ? '' : 'off'}" data-act="levelup10" data-arg="${id}">+10</button>
          </div>
        </div>
        <div>
          <b>성급 올리기</b>
          <small>${o.stars >= MAX_STARS ? '최대 성급' : `조각 ${o.shards} / ${starNeed}`}</small>
          <div class="bar"><i style="width:${o.stars >= MAX_STARS ? 100 : Math.min(100, (o.shards / starNeed) * 100)}%"></i></div>
          <button class="btn gold ${canSt.ok ? '' : 'off'}" data-act="starup" data-arg="${id}">★ 성급 업</button>
        </div>
      </div>
      ${def.hero ? '<p class="muted">치즈 조각은 스테이지를 클리어할 때마다 얻어요.</p>' : ''}`);
  }

  private openPullResult(res: PullResult[]): void {
    const cards = res.map((r, i) => `
      <div class="pull-card" style="--rc:${RARITY_COLOR[r.def.rarity]};animation-delay:${i * 0.08}s">
        ${rarityBadge(r.def)}
        <canvas class="portrait" data-look="${r.def.id}"></canvas>
        <b>${r.def.name}</b>
        <small>${r.isNew ? '<em>NEW!</em>' : `조각 +${r.shards}`}</small>
      </div>`).join('');
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>상자에서 나온 고양이들!</h2>
      <div class="pull-grid ${res.length === 1 ? 'single' : ''}">${cards}</div>
      <div class="row center"><button class="btn" data-act="close">확인</button></div>`);
  }
}
