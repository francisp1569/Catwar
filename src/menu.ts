// 로비 (DOM): 하단 5탭 — 상점 · 가방 · 전투 · 고양이 · 지도
import { drawFaceArtCircle, drawFaceArtSquare, getArt, getWorld, iconHtml } from './art';
import { sound } from './audio';
import { story } from './story';
import { openHeroPicker } from './heroPick';
import { adLeft, adUse, showRewarded } from './ads';
import { cloud, cloudEnabled, linkEmailStart, linkEmailVerify, loginEmailStart, loginEmailVerify } from './cloud';
import { drawCatLookToon, drawCatPortrait, IDLE_POSE } from './catdraw';
import { CATS, CAT_BY_ID, HERO_ID, RARITY_COLOR, originalName, setHero, type CatDef, type CatLook } from './data/cats';
import { SLOTS, SLOT_INFO, ITEM_MAX_LV, type Slot } from './data/items';
import { AREA_NAME, CHAPTERS, STAGES, getStage, type StageDef } from './data/stages';
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
import { exportSave, importSave, replaceLocalSave, resetSave, writeSave, type Item, type SaveData } from './meta/save';
import { drawStagePreview } from './render';

// 그림 아이콘 (없으면 이모지)
const COIN = (): string => iconHtml('coin', '🪙');
const TUNA = (): string => iconHtml('tuna', '🥫');
const YARN = (): string => iconHtml('yarn', '🧶');
const CHEST = (): string => iconHtml('chest', '🎁');
const wIcon = (c: CatDef): string => iconHtml(`w-${c.id}`, c.weapon.icon);
const EQ_DEFAULT: Record<Slot, string> = { collar: 'eq-collar-R', hat: 'eq-hat-R', toy: 'eq-toy-R', cushion: 'eq-cushion', bowl: 'eq-bowl', bell: 'eq-bell-R' };
const EQ_RARITY: Partial<Record<string, string>> = {
  'collar-N': 'eq-collar-N', 'collar-R': 'eq-collar-R', 'collar-SR': 'eq-collar-SR', 'collar-SSR': 'eq-collar-SSR',
  'hat-N': 'eq-hat-N', 'hat-R': 'eq-hat-R', 'hat-SR': 'eq-hat-SR', 'hat-SSR': 'eq-hat-SSR',
  'toy-N': 'eq-toy-N', 'toy-R': 'eq-toy-R', 'toy-SR': 'eq-toy-SR', 'toy-SSR': 'eq-toy-SSR',
  'cushion-N': 'eq-cushion-N', 'cushion-R': 'eq-cushion', 'cushion-SR': 'eq-cushion-SR', 'cushion-SSR': 'eq-cushion-SSR',
  'bowl-N': 'eq-bowl-N', 'bowl-R': 'eq-bowl-R', 'bowl-SR': 'eq-bowl-SR', 'bowl-SSR': 'eq-bowl',
  'bell-N': 'eq-bell-N', 'bell-R': 'eq-bell-R', 'bell-SR': 'eq-bell-SR', 'bell-SSR': 'eq-bell-SSR',
};
const eqIcon = (slot: Slot, rarity?: string): string => iconHtml((rarity && EQ_RARITY[`${slot}-${rarity}`]) || EQ_DEFAULT[slot], SLOT_INFO[slot].icon);


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

const STAMP_DESC = '대장이 되면 자기 스킬과 함께 쓰는 전용 공격. 약 3초마다 적이 가장 몰린 곳에 거대한 금빛 발바닥을 찍어 범위 피해 + 잠깐 기절 + 밀쳐내기. 전투 중 레벨·각성·폭주로 강해짐.';

function chapterOf(no: number): string {
  return [...CHAPTERS].reverse().find((c) => no >= c.from)!.name.split(' · ')[0];
}

function teamPower(save: SaveData): number {
  const b = bonuses(save);
  // 치즈 + 가장 강한 고양이 5마리 (전투에서 최대 6마리까지 합류)
  const others = Object.keys(save.cats).filter((id) => id !== HERO_ID && CAT_BY_ID[id]).map((id) => power(CAT_BY_ID[id], save)).sort((a, b) => b - a).slice(0, 5);
  const base = power(CAT_BY_ID[HERO_ID], save) + others.reduce((a, b) => a + b, 0);
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

  /** 전투 후 집사 레벨업 연출 */
  celebrateLevel(level: number, tuna: number): void {
    sound.play('levelup');
    this.openModal(`
      <div class="lvup">
        <div class="lvup-band">집사 레벨 업!</div>
        <div class="lvup-num">${level}</div>
        <small class="muted">획득 보상</small>
        <div class="lvup-reward">${TUNA()} ${tuna}</div>
        <button class="btn gold" data-act="close">확인</button>
      </div>`, 'celebrate');
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

  /** 이메일 저장 창 바로 열기 (첫 화면의 '불러오기' 등) */
  openCloud(mode: 'link' | 'login'): void {
    const b = document.createElement('button');
    b.dataset.act = mode === 'link' ? 'cloud-link' : 'cloud-login';
    void this.onClick({ target: b } as unknown as MouseEvent);
  }

  /** 첫 승리 뒤 한 번: 진행을 이메일로 지켜 두라고 권한다 */
  askCloudAfterWin(): void {
    if (!cloudEnabled() || cloud.email || this.save.cloudAsked) return;
    this.save.cloudAsked = true;
    this.commit();
    this.openModal(`
      <h2>🎉 첫 승리 축하해요!</h2>
      <p>지금 진행은 <b>이 브라우저</b>에만 묶여 있어요.<br>브라우저 기록을 지우거나 폰을 바꾸면 사라질 수 있어요.</p>
      <p class="muted">이메일을 연결해 두면 어느 기기에서든 숫자 코드로 이어 할 수 있어요. (비밀번호 없음)</p>
      <div class="row center gap">
        <button class="btn off" data-act="cloud-later">나중에</button>
        <button class="btn gold" data-act="cloud-link">📧 이메일로 저장 지키기</button>
      </div>`);
  }

  hide(): void {
    this.root.hidden = true;
    this.closeModal();
    document.querySelectorAll('.guide-ring, .guide-tip').forEach((n) => n.remove());
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
    const base = STAGES.find((s) => s.id === this.save.selectedStage) ?? STAGES[0];
    return (this.save.hardMode && getStage(`${base.id}h`)) || base;
  }

  // ───────────── 이벤트 ─────────────

  private async onClick(e: MouseEvent): Promise<void> {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el) {
      if (e.target === this.modal) this.closeModal();
      return;
    }
    const act = el.dataset.act!;
    const arg = el.dataset.arg ?? '';
    const s = this.save;
    sound.play('click');
    this.guideStep(act, arg);
    switch (act) {
      case 'toggle-sfx': sound.setSfx(!sound.sfxOn); this.openSettings(); break;
      case 'toggle-music': sound.setMusic(!sound.musicOn); this.openSettings(); break;
      case 'tab': this.tab = arg as Tab; this.closeModal(); this.render(); break;
      case 'start': {
        const st = getStage(arg)!;
        if (!isUnlocked(s, st)) { this.toast(st.hard ? '보통을 깨고, 이전 판 어려움도 깨야 열려요' : '이전 스테이지를 먼저 클리어해요'); break; }
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
      case 'mode': s.hardMode = arg === 'hard'; this.commit(); break;
      case 'cat-prev': this.catIdx = (this.catIdx + CATS.length - 1) % CATS.length; this.render(); break;
      case 'cat-next': this.catIdx = (this.catIdx + 1) % CATS.length; this.render(); break;
      case 'cat-pick': this.catIdx = CATS.findIndex((c) => c.id === arg); this.render(); break;
      case 'goto-cat': this.catIdx = CATS.findIndex((c) => c.id === arg); this.tab = 'cats'; this.closeModal(); this.render(); break;
      case 'levelup': {
        const r = canLevelUp(s, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        levelUp(s, arg);
        sound.play('card');
        this.commit();
        break;
      }
      case 'starup': {
        const r = canStarUp(s, arg);
        if (!r.ok) { this.toast(r.reason); break; }
        starUp(s, arg);
        sound.play('levelup');
        sound.play('meow');
        this.commit();
        this.toast(`${CAT_BY_ID[arg].name} 성급 상승! ✨`);
        break;
      }
      case 'skills': this.openSkills(arg); break;
      case 'album': this.openAlbum(arg); break;
      case 'rename':
        this.openModal(`
          <button class="x" data-act="close">✕</button>
          <h2>✏️ 대장 이름 짓기</h2>
          <p class="muted">우리 집 고양이 이름을 붙여 주세요. 스토리와 전투에서 이 이름으로 불려요. (최대 8글자, 비우면 원래 이름)</p>
          <input class="hp-name rename-input" maxlength="8" placeholder="${esc(originalName(HERO_ID))}" value="${esc(s.heroName ?? '')}">
          <div class="row center"><button class="btn gold" data-act="rename-ok">저장</button></div>`);
        (this.modal.querySelector('.rename-input') as HTMLInputElement).focus();
        break;
      case 'rename-ok': {
        const v = (this.modal.querySelector('.rename-input') as HTMLInputElement).value.trim().slice(0, 8);
        s.heroName = v || undefined;
        s.heroId = HERO_ID;
        setHero(HERO_ID, v);
        this.closeModal();
        this.commit();
        this.toast(`이제부터 「${CAT_BY_ID[HERO_ID].name}」라고 불러요!`);
        break;
      }
      case 'pull': this.doPull(arg === '10' ? 10 : 1); break;
      case 'ad-cat':
      case 'ad-item': {
        const kind = act === 'ad-cat' ? 'cat' : 'item';
        if (adLeft(s, kind) <= 0) { this.toast('오늘은 다 받았어요. 내일 또 와요!'); break; }
        if (!(await showRewarded(kind))) break;
        adUse(s, kind);
        // 광고 보상 = 그 뽑기 1회 비용만큼 참치를 주고 바로 뽑는다
        if (kind === 'cat') { s.tuna += PULL_COST; this.doPull(1); } else { s.tuna += ITEM_BOX_COST; this.doPullItems(1); }
        break;
      }
      case 'pull-item': this.doPullItems(arg === '10' ? 10 : 1); break;
      case 'free': {
        const r = claimFree(s);
        if (!r) { this.toast('오늘은 이미 받았어요. 내일 또 와요!'); break; }
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
      case 'story': this.closeModal(); story.play(() => {}); break;
      case 'hero':
        this.closeModal();
        openHeroPicker({
          title: '대장 고양이 바꾸기',
          ids: CATS.filter((c) => s.cats[c.id]).map((c) => c.id),
          current: HERO_ID,
          currentName: s.heroName ?? '',
          onPick: (id, name) => {
            s.heroId = id;
            s.heroName = name || undefined;
            setHero(id, name);
            this.commit();
            this.toast(`이제 ${CAT_BY_ID[id].name}가 대장이에요!`);
          },
          onCancel: () => {},
        });
        break;
      case 'save-export': {
        const code = exportSave(this.save);
        this.openModal(`
          <button class="x" data-act="settings">✕</button>
          <h2>💾 저장 코드</h2>
          <p class="muted">이 코드를 다른 기기의 「저장 코드 불러오기」에 붙여 넣으면 진행이 그대로 옮겨져요.</p>
          <textarea class="save-code" readonly>${code}</textarea>`);
        const ta = this.modal.querySelector('textarea') as HTMLTextAreaElement;
        ta.select();
        navigator.clipboard?.writeText(code).then(() => this.toast('저장 코드를 복사했어요'), () => {});
        break;
      }
      case 'save-import':
        this.openModal(`
          <button class="x" data-act="settings">✕</button>
          <h2>📥 저장 코드 불러오기</h2>
          <p class="muted">지금 이 기기의 진행은 덮어써져요.</p>
          <textarea class="save-code" placeholder="CATWAR1:로 시작하는 코드를 붙여 넣어요"></textarea>
          <div class="row center"><button class="btn gold" data-act="save-import-go">불러오기</button></div>`);
        break;
      case 'cloud-link':
      case 'cloud-login': {
        const login = act === 'cloud-login';
        this.openModal(`
          <button class="x" data-act="settings">✕</button>
          <h2>${login ? '📥 다른 기기 저장 불러오기' : '📧 이메일로 저장 지키기'}</h2>
          <p class="muted">${login ? '저장을 지켜 둔 이메일을 넣으면 숫자 코드를 보내 드려요. 지금 이 기기의 진행은 그 저장으로 바뀌어요.' : '이메일을 연결해 두면 브라우저 기록을 지워도, 다른 기기에서도 이어 할 수 있어요. 메일로 온 숫자 코드를 넣거나, 메일 속 링크를 누른 뒤 게임을 다시 열어 주세요.'}</p>
          <input class="hp-name cloud-email" type="email" placeholder="이메일 주소" autocomplete="email">
          <div class="row center"><button class="btn gold" data-act="${login ? 'cloud-login-send' : 'cloud-link-send'}">코드 받기</button></div>
          <div class="cloud-code" hidden>
            <input class="hp-name cloud-otp" inputmode="numeric" maxlength="10" placeholder="메일로 온 숫자 코드">
            <div class="row center"><button class="btn gold" data-act="${login ? 'cloud-login-ok' : 'cloud-link-ok'}">확인</button></div>
          </div>`);
        break;
      }
      case 'cloud-link-send':
      case 'cloud-login-send': {
        const email = (this.modal.querySelector('.cloud-email') as HTMLInputElement).value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { this.toast('이메일 주소를 확인해 주세요'); break; }
        const err = act === 'cloud-link-send' ? await linkEmailStart(email) : await loginEmailStart(email);
        if (err) { this.toast(`보내지 못했어요: ${err}`); break; }
        (this.modal.querySelector('.cloud-code') as HTMLElement).hidden = false;
        this.toast('메일로 코드를 보냈어요 (스팸함도 확인해 주세요)');
        break;
      }
      case 'cloud-link-ok': {
        const email = (this.modal.querySelector('.cloud-email') as HTMLInputElement).value.trim();
        const code = (this.modal.querySelector('.cloud-otp') as HTMLInputElement).value.replace(/\D/g, '');
        const err = await linkEmailVerify(email, code);
        if (err) { this.toast(`코드가 맞지 않아요: ${err}`); break; }
        this.toast('이메일로 저장을 지켰어요!');
        this.commit();
        this.openSettings();
        break;
      }
      case 'cloud-login-ok': {
        const email = (this.modal.querySelector('.cloud-email') as HTMLInputElement).value.trim();
        const code = (this.modal.querySelector('.cloud-otp') as HTMLInputElement).value.replace(/\D/g, '');
        const r = await loginEmailVerify(email, code);
        if (r.error) { this.toast(`불러오지 못했어요: ${r.error}`); break; }
        if (!r.save) { this.toast('그 계정에 저장된 진행이 없어요'); break; }
        replaceLocalSave(r.save);
        this.toast('불러왔어요! 다시 시작합니다');
        setTimeout(() => location.reload(), 600);
        break;
      }
      case 'save-import-go': {
        const v = (this.modal.querySelector('textarea') as HTMLTextAreaElement).value;
        if (!importSave(v)) { this.toast('코드가 올바르지 않아요'); break; }
        this.toast('불러왔어요! 다시 시작합니다');
        setTimeout(() => location.reload(), 600);
        break;
      }
      case 'reset':
        if (!this.resetArmed) { this.resetArmed = true; this.openSettings(); break; }
        this.save = resetSave();
        this.resetArmed = false;
        this.closeModal();
        this.commit();
        this.toast('처음부터 다시 시작해요');
        break;
      case 'close': this.closeModal(); break;
      case 'copy-errors': {
        const txt = `${navigator.userAgent}\n${errorLog().join('\n')}`;
        try { await navigator.clipboard.writeText(txt); this.toast('오류 기록을 복사했어요. 그대로 보내 주세요!'); } catch { this.toast('복사하지 못했어요'); }
        break;
      }
      case 'cloud-later':
        this.closeModal();
        this.toast('설정 ⚙️ 에서 언제든 연결할 수 있어요');
        break;
    }
  }

  private doPull(n: 1 | 10): void {
    const res = pull(this.save, n);
    if (!res) { this.toast('참치캔이 부족해요 🥫'); return; }
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
      const st = getStage(c.dataset.stage ?? '') ?? STAGES[0];
      drawStagePreview(ctx, st, w, h, t, !isUnlocked(this.save, st));
    } else if (c.dataset.anim === 'cat') {
      const id = c.dataset.id!;
      const owned = !!this.save.cats[id];
      const full = owned ? getArt(id, 'full') : null;
      if (full) {
        // 일러스트가 있으면 전신 그림을 크게 (숨쉬듯 살짝 움직임)
        const sc = Math.min((h * 1.02) / full.naturalHeight, (w * 0.95) / full.naturalWidth);
        const dw = full.naturalWidth * sc;
        const dh = full.naturalHeight * sc;
        const breathe = 1 + Math.sin(t * 2) * 0.008;
        ctx.save();
        ctx.translate(w / 2, h);
        ctx.scale(breathe, breathe);
        const g = ctx.createRadialGradient(0, -dh * 0.5, 10, 0, -dh * 0.5, dh * 0.7);
        g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-w, -h, w * 2, h);
        ctx.beginPath();
        ctx.roundRect(-dw / 2, -dh, dw, dh, 16);
        ctx.clip();
        ctx.drawImage(full, -dw / 2, -dh, dw, dh);
        ctx.restore();
        return;
      }
      // 아직 못 만난 고양이: 새 그림의 실루엣(그림자) + 물음표
      const front = owned ? null : getWorld(`front-${id}`);
      if (front) {
        const sil = silhouette(front);
        const sc = Math.min((h * 0.9) / sil.height, (w * 0.8) / sil.width);
        const dw = sil.width * sc;
        const dh = sil.height * sc;
        ctx.save();
        ctx.translate(w / 2, h * 0.97 + Math.sin(t * 2) * 2);
        ellipse(ctx, 0, 0, dw * 0.4, dh * 0.04, 'rgba(60,20,40,0.18)');
        ctx.drawImage(sil, -dw / 2, -dh, dw, dh);
        ctx.font = `bold ${Math.round(dh * 0.22)}px Jua, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#3b2a3f';
        ctx.fillStyle = '#ffffff';
        ctx.strokeText('?', 0, -dh * 0.62);
        ctx.fillText('?', 0, -dh * 0.62);
        ctx.restore();
        return;
      }
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
    const tabs: [Tab, string, string][] = [['shop', iconHtml('tab-shop', '🏪', 'tab-img'), '상점'], ['bag', iconHtml('tab-bag', '🎒', 'tab-img'), '가방'], ['battle', iconHtml('tab-battle', '⚔️', 'tab-img'), '전투'], ['cats', iconHtml('tab-cats', '🐱', 'tab-img'), '고양이'], ['map', iconHtml('tab-map', '🗺️', 'tab-img'), '지도']];
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
          <span title="코인">${COIN()} ${fmt(s.coins)}</span>
          <span title="참치캔">${TUNA()} ${fmt(s.tuna)}</span>
          <span title="털실">${YARN()} ${fmt(s.yarn)}</span>
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
    requestAnimationFrame(() => this.drawGuide());
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
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, w * 0.14);
        ctx.clip();
        drawFaceArtSquare(ctx, id, art, (w - Math.max(w, h)) / 2, (h - Math.max(w, h)) / 2, Math.max(w, h));
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
        <div class="box">${best >= n ? '✔' : CHEST()}</div>
        <small>${stars(n, n)}</small>
        <small class="muted">${label}</small>
      </div>`;
    const team = [HERO_ID, ...CATS.filter((c) => !c.hero && s.cats[c.id]).map((c) => c.id)];
    return `
      <section class="stage-head ${st.hard ? 'hard' : ''}">
        <div class="mode-toggle">
          <button class="${st.hard ? '' : 'on'}" data-act="mode" data-arg="normal">보통</button>
          <button class="${st.hard ? 'on' : ''}" data-act="mode" data-arg="hard">🔥 어려움</button>
        </div>
        <div class="area">${chapterOf(st.no)} · ${AREA_NAME[st.area]} · ${best ? stars(best, 3) : '미클리어'}</div>
        <div class="stage-title">
          <button class="stage-arrow" data-act="stage-prev" ${st.no === 1 ? 'disabled' : ''}>◀</button>
          <h1>St.${st.no} - ${esc(st.name.replace('[보스] ', ''))}${isBoss ? ' <span class="skull">💀</span>' : ''}</h1>
          <button class="stage-arrow" data-act="stage-next" ${st.no === STAGES.length ? 'disabled' : ''}>▶</button>
        </div>
        <div class="pill">적 강함 x${st.mul.toFixed(1)} · ${fmtTime(st.duration)} 버티기${isBoss ? ' + 보스' : ''}</div>
      </section>
      <section class="diorama">
        <canvas data-anim="stage" data-stage="${st.id}"></canvas>
        ${unlocked ? '' : `<div class="lock-cover">🔒<small>${st.hard ? '보통을 깨고 이전 판 어려움도 깨면 열려요' : '이전 스테이지를 클리어하면 열려요'}</small></div>`}
        <div class="side left">
          <button class="side-btn" data-act="nap"><span>${iconHtml('btn-nap', '💤')}</span><small>낮잠 보상</small>${nap.coins > 0 ? `<em>${fmt(nap.coins)}</em>` : ''}</button>
          <button class="side-btn" data-act="tab" data-arg="shop"><span>${iconHtml('btn-gift', '🎁')}</span><small>무료 상자</small>${freeReady ? '<i class="dot"></i>' : ''}</button>
        </div>
        <div class="side right">
          <button class="side-btn" data-act="tab" data-arg="cats"><span>${iconHtml('tab-cats', '🐱')}</span><small>고양이</small></button>
          <button class="side-btn" data-act="tab" data-arg="map"><span>${iconHtml('tab-map', '🗺️')}</span><small>지도</small></button>
          <button class="side-btn" data-act="settings"><span>${iconHtml('btn-settings', '⚙️')}</span><small>설정</small></button>
        </div>
      </section>
      <section class="chests">
        ${chest(1, `${COIN()}${st.reward.coins}`)}
        <div class="chest-line"></div>
        ${chest(2, `${TUNA()}20 · 장비`)}
        <div class="chest-line"></div>
        ${chest(3, `${TUNA()}20 · 장비+1`)}
      </section>
      <button class="start-btn" data-act="start" data-arg="${st.id}" ${unlocked ? '' : 'disabled'}>
        <span>START</span><small>팀 전투력 ${fmt(teamPower(s))}</small>
      </button>
      <button class="team-strip" data-act="tab" data-arg="cats">
        <canvas class="mini-face" data-face="${HERO_ID}"></canvas>
        <span class="team-note"><b>${esc(CAT_BY_ID[HERO_ID].name)} 출전</b><small>보유 고양이 ${team.length - 1}마리가 전투 중 랜덤 합류</small></span>
        ${team.slice(1, 5).map((id) => `<canvas class="mini-face small" data-face="${id}"></canvas>`).join('')}${team.length > 5 ? `<span class="mini-more">+${team.length - 5}</span>` : ''}
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
        ${oc ? `<em>${oc.level}</em>` : ''}${oc && c.hero ? '<b class="in">리더</b>' : ''}
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
      main = `
        <div class="cat-title">
          <div>${rarityBadge(def.rarity)} <span class="breed">${esc(def.breed)}</span></div>
          <h2>${esc(def.name)}${def.hero ? ' <button class="rename-btn" data-act="rename">✏️ 이름</button>' : ''}</h2>
          <div class="lv">Lv.${o.level}<small>/${cap}</small> ${stars(o.stars)}</div>
        </div>
        <canvas class="bigcat" data-anim="cat" data-id="${def.id}"></canvas>
        <div class="side left">
          ${getArt(def.id, 'face') || getArt(def.id, 'full') ? `<button class="side-btn" data-act="album" data-arg="${def.id}"><span>📷</span><small>앨범</small></button>` : ''}
        </div>
        <div class="side right">
          <button class="side-btn" data-act="skills" data-arg="${def.id}"><span>${wIcon(def)}</span><small>스킬</small></button>
        </div>
        <div class="skill-badge"><span class="ic">${wIcon(def)}</span>${esc(def.skillName)}<small>${iconHtml('atk', '⚔️')} ${st.atk} · ${iconHtml('def', '🛡')} +${st.hp}</small></div>
        <div class="cat-actions">
          <button class="btn ${canLevelUp(s, def.id).ok ? '' : 'off'}" data-act="levelup" data-arg="${def.id}">레벨 업<small>${o.level >= cap ? '상한 도달' : `${COIN()} ${fmt(lvCost)}`}</small></button>
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
      <span class="ico">${eqIcon(it.slot, it.rarity)}</span>
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
      if (!it) return `<button class="item empty" data-act="slot" data-arg="${slot}"><span class="ico">${eqIcon(slot)}</span><span class="ilv">${SLOT_INFO[slot].name}</span></button>`;
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
            ${SLOTS.map((sl) => `<button class="${this.bagFilter === sl ? 'on' : ''}" data-act="bag-filter" data-arg="${sl}">${eqIcon(sl)}</button>`).join('')}
          </div>
          <button class="btn small gold" data-act="merge">일괄 합성</button>
        </div>
        <div class="inv-grid">${list.map((it) => this.itemCard(it)).join('') || '<p class="muted empty-msg">장비가 없어요. 스테이지를 클리어하거나 상점에서 얻어요.</p>'}</div>`;
    } else {
      const mats = [
        [YARN(), '털실', s.yarn],
        [TUNA(), '참치캔', s.tuna],
        [COIN(), '코인', s.coins],
        ...CATS.filter((c) => s.cats[c.id] && s.cats[c.id].shards > 0).map((c) => [wIcon(c), `${c.name} 조각`, s.cats[c.id].shards]),
      ] as [string, string, number][];
      inv = `<div class="inv-grid mats">${mats.map(([ic, name, n]) => `
        <div class="item mat"><span class="ico">${ic}</span><span class="ilv">${fmt(n)}</span><span class="mname">${esc(name)}</span></div>`).join('')}</div>
        <p class="muted">${YARN()} 털실은 장비 강화 재료예요. 장비 분해, 스테이지 보상, 낮잠 보상으로 얻어요.</p>`;
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
        <div class="sc-ico">${iconHtml('chest-open', '🎁')}</div>
        <div class="sc-body"><b>오늘의 무료 상자</b><small>매일 고양이 뽑기 1회 + 장비 1개</small></div>
        <button class="btn ${freeReady ? 'gold' : 'off'}" data-act="free">${freeReady ? '받기' : '내일 또!'}</button>
      </section>
      <section class="shop-card ad">
        <div class="sc-ico">📺</div>
        <div class="sc-body"><b>광고 보고 무료 뽑기</b><small>광고를 끝까지 보면 바로 열어 드려요 (매일 초기화)</small></div>
        <div class="ad-btns">
          <button class="btn ${adLeft(s, 'cat') ? 'pink' : 'off'}" data-act="ad-cat">🐱 고양이 1회<small>${adLeft(s, 'cat')}/3</small></button>
          <button class="btn ${adLeft(s, 'item') ? 'blue' : 'off'}" data-act="ad-item">🎒 장비 1개<small>${adLeft(s, 'item')}/3</small></button>
        </div>
      </section>
      <section class="shop-card big">
        ${iconHtml('box', '<div class="box"><div class="box-lid"></div><div class="box-body">📦<span>FRAGILE · 냥</span></div><div class="ears"><i></i><i></i></div></div>', 'box-img')}
        <b class="sc-title">골판지 상자 뽑기</b>
        <small class="muted">새 고양이를 만나요. 이미 있는 고양이는 성급 조각 +10</small>
        <div class="rates">${rates}</div>
        <div class="pull-buttons">
          <button class="btn" data-act="pull" data-arg="1">1회<br><small>${TUNA()} ${PULL_COST}</small></button>
          <button class="btn gold" data-act="pull" data-arg="10">10회<br><small>${TUNA()} ${PULL10_COST} · SR 이상 확정</small></button>
        </div>
      </section>
      <section class="shop-card big gear">
        <div class="gear-ico">${SLOTS.map((sl) => `<span>${eqIcon(sl)}</span>`).join('')}</div>
        <b class="sc-title">집사 장비 상자</b>
        <small class="muted">목걸이·모자·장난감·방석·밥그릇·방울 중 하나. 스테이지를 깰수록 좋은 장비가 잘 나와요</small>
        <div class="pull-buttons">
          <button class="btn" data-act="pull-item" data-arg="1">1개<br><small>${TUNA()} ${ITEM_BOX_COST}</small></button>
          <button class="btn gold" data-act="pull-item" data-arg="10">10개<br><small>${TUNA()} ${ITEM_BOX10_COST} · SR 이상 확정</small></button>
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
      const ch = CHAPTERS.find((c) => c.from === st.no);
      const chDone = ch ? STAGES.filter((x) => x.no >= ch.from && x.no < ch.from + 10).every((x) => (s.stages[x.id] ?? 0) > 0) : false;
      const header = (ch ? `<h2 class="chapter">${ch.name}${chDone ? iconHtml(ch.from === 11 ? 'badge-ch2' : 'chest-royal', '🏅', 'badge') : ''}</h2>` : '') + (st.area !== lastArea ? `<h3 class="area">${AREA_NAME[st.area]}</h3>` : '');
      lastArea = st.area;
      const hardBest = s.stages[`${st.id}h`] ?? 0;
      return `${header}
        <button class="stage ${unlocked ? '' : 'locked'} ${st.boss ? 'boss' : ''} ${st.id === s.selectedStage ? 'sel' : ''}" data-act="select-stage" data-arg="${st.id}">
          <div class="no">${st.no}</div>
          <div class="info">
            <b>${esc(st.name)}</b>
            <small>${fmtTime(st.duration)} 버티기 · 적 강함 x${st.mul.toFixed(1)}</small>
          </div>
          ${unlocked ? (best ? stars(best, 3) : '<span class="newtag">NEW</span>') : '<span class="lock">🔒</span>'}
          ${hardBest ? `<span class="hardstars">🔥${hardBest}</span>` : ''}
        </button>`;
    }).join('');
  }

  // ───────────── 모달 ─────────────

  private openModal(html: string, cls = ''): void {
    this.modal.innerHTML = `<div class="sheet ${cls}">${html}</div>`;
    this.modal.hidden = false;
    this.paintPortraits(this.modal);
    this.drawGuide();
  }

  private closeModal(): void {
    this.modal.hidden = true;
    this.modal.innerHTML = '';
    this.drawGuide();
  }

  // ───────────── 첫 승리 뒤 로비 안내 (입양 → 성장 → 다시 전투) ─────────────

  /** 첫 승리 뒤 한 번 시작 */
  startGuide(): void {
    if (this.save.guide !== undefined) return;
    this.save.guide = 1;
    // 첫 입양 비용이 모자라면 채워 준다 (안내용 선물)
    if (this.save.tuna < PULL_COST) this.save.tuna = PULL_COST;
    writeSave(this.save);
    this.render();
  }

  private guideStep(act: string, arg: string): void {
    const g = this.save.guide;
    if (!g) return;
    let next = g;
    if (g === 1 && act === 'tab' && arg === 'shop') next = 2;
    else if (g === 2 && act === 'pull') next = 3;
    else if (g === 3 && act === 'tab' && arg === 'cats') { next = 4; this.catIdx = Math.max(0, CATS.findIndex((c) => c.id === HERO_ID)); }
    else if (g === 4 && (act === 'levelup' || act === 'tab')) next = 5;
    else if (g === 5 && act === 'tab' && arg === 'battle') next = 0;
    else if (act === 'guide-skip') next = 0;
    if (next !== g) { this.save.guide = next; writeSave(this.save); }
  }

  private drawGuide(): void {
    document.querySelectorAll('.guide-ring, .guide-tip').forEach((n) => n.remove());
    const g = this.save.guide;
    if (!g || this.root.hidden || !this.modal.hidden) return;
    const steps: Record<number, [string, string]> = {
      1: ['nav.tabs5 [data-arg="shop"]', '🐱 새 고양이 친구를 <b>입양</b>할 수 있어요!<br>아래 <b>상점</b>을 눌러 보세요'],
      2: ['[data-act="pull"][data-arg="1"]', '참치캔으로 <b>골판지 상자</b>를 열면<br>새 고양이가 나와요. <b>1회</b>를 눌러 보세요!'],
      3: ['nav.tabs5 [data-arg="cats"]', '입양한 고양이는 전투 중 <b>NEW 카드</b>로 합류해요.<br>이제 <b>고양이</b> 탭에서 키워 볼까요?'],
      4: ['[data-act="levelup"]', '코인으로 <b>레벨 업</b>! 조각이 모이면 <b>승급</b>,<br><b>가방</b>에서 장비도 꼭 끼워 주세요'],
      5: ['nav.tabs5 [data-arg="battle"]', '강해졌으면 다시 <b>전투</b>로!<br>적은 갈수록 세지니 틈틈이 키워 주세요'],
    };
    const st = steps[g];
    if (!st) return;
    const el = this.root.querySelector<HTMLElement>(st[0]);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ring = document.createElement('div');
    ring.className = 'guide-ring';
    Object.assign(ring.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    const tip = document.createElement('div');
    tip.className = 'guide-tip';
    tip.innerHTML = `${st[1]}<button data-gskip>안내 끄기</button>`;
    const below = r.top < window.innerHeight / 2;
    tip.style[below ? 'top' : 'bottom'] = below ? `${r.bottom + 16}px` : `${window.innerHeight - r.top + 16}px`;
    tip.classList.add(below ? 'below' : 'above');
    tip.querySelector('[data-gskip]')!.addEventListener('click', () => { this.guideStep('guide-skip', ''); this.drawGuide(); });
    document.body.append(ring, tip);
  }

  private openSkills(id: string): void {
    const def = CAT_BY_ID[id];
    const o = this.save.cats[id];
    const w = def.weapon;
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>${wIcon(def)} ${esc(def.skillName)} <small>${def.name}</small></h2>
      <p class="muted">${esc(w.intro)}</p>
      <p class="muted">전투 중 NEW 카드로 합류한 뒤, 아래 강화 중에서 골라 키워요. 고양이 레벨과 성급(★)은 기본 위력을 올려요.</p>
      <ul class="skill">${w.mods.map((x) => `<li class="cur">${esc(x.name)} <small>(최대 ${x.max}회)</small><br><span class="muted">${esc(x.desc)}</span></li>`).join('')}</ul>
      ${def.hero && o ? `<h3>🐾 대장의 발도장 <small>대장 전용</small></h3><ul class="skill"><li class="cur">${STAMP_DESC}</li></ul>` : ''}
      ${def.hero && o ? `<h3>📣 꾹꾹이 응원 <small>★${o.stars}</small></h3><ul class="skill"><li class="cur">${esc(rallyDesc(o.stars))}</li></ul>` : ''}
      <p class="muted">${esc(def.bio)}</p>`);
  }

  private openAlbum(id: string): void {
    const def = CAT_BY_ID[id];
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>📷 ${def.name}의 앨범</h2>
      ${getArt(id, 'full') ? `<img class="album-full" src="${getArt(id, 'full')!.src}" alt="${def.name} 일러스트">` : `<canvas class="album-photo" data-look="${id}"></canvas>`}
      <p class="muted center">${esc(def.bio)}</p>`, 'album');
  }

  private openSettings(): void {
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      <h2>⚙️ 설정</h2>
      <div class="row center gap">
        <button class="btn ${sound.sfxOn ? 'blue' : 'off'}" data-act="toggle-sfx">${sound.sfxOn ? '🔊 효과음 켜짐' : '🔇 효과음 꺼짐'}</button>
        <button class="btn ${sound.musicOn ? 'blue' : 'off'}" data-act="toggle-music">${sound.musicOn ? '🎵 배경음악 켜짐' : '🎵 배경음악 꺼짐'}</button>
      </div>
      <div class="row center gap"><button class="btn" data-act="story">📖 스토리 다시 보기</button><button class="btn" data-act="hero">👑 대장 바꾸기·이름</button></div>
      ${cloudEnabled() ? `<div class="cloud-box">
        <b>☁️ 클라우드 저장 ${cloud.status === 'on' ? '<em class="ok">켜짐</em>' : cloud.status === 'connecting' ? '<em>연결 중…</em>' : '<em class="bad">연결 안 됨</em>'}</b>
        ${cloud.status === 'error' && cloud.error ? `<small class="muted">(${esc(cloud.error.slice(0, 80))})</small>` : ''}
        <small>${cloud.email ? `📧 ${esc(cloud.email)} 계정에 저장 중 · 다른 기기에서도 이어 할 수 있어요` : '게스트로 자동 저장 중이에요. 브라우저 기록을 지우면 사라질 수 있으니 이메일로 지켜 두세요.'}</small>
        <div class="row center gap">
          ${cloud.email ? '' : '<button class="btn small gold" data-act="cloud-link">📧 이메일로 저장 지키기</button>'}
          <button class="btn small" data-act="cloud-login">📥 다른 기기 저장 불러오기</button>
        </div>
      </div>` : ''}
      <div class="row center gap"><button class="btn small" data-act="save-export">💾 저장 코드 복사</button><button class="btn small" data-act="save-import">📥 저장 코드 불러오기</button></div>
      ${errorLog().length ? `<div class="row center gap"><button class="btn small" data-act="copy-errors">🐞 오류 기록 복사 (${errorLog().length})</button></div>` : ''}
      <p class="muted">진행 상황은 이 브라우저에 자동 저장돼요.</p>
      <p class="muted">낮잠 보상: 시간당 ${COIN()}${napRate(this.save)} (최대 ${NAP_MAX_HOURS}시간 쌓임)</p>
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
        <div class="bench-item r-${it.rarity}"><span class="ico">${eqIcon(it.slot, it.rarity)}</span><span class="irar">${it.rarity}</span></div>
        <b class="iname">${esc(itemName(it))}</b>
        <small>${info.name} ${rarityBadge(it.rarity)}${eq ? ' · 장착 중' : ''}</small>
      </div>
      <div class="upgrade">
        <div class="uprow"><span>Lv.${it.level}</span><span class="arrow">➜</span><span class="g">${it.level < max ? `Lv.${it.level + 1}` : 'MAX'}</span></div>
        <div class="uplabel">기본 능력치</div>
        <div class="uprow"><span>${info.statName} ${fmtStat(cur)}</span><span class="arrow">➜</span><span class="g">${fmtStat(next)}</span></div>
      </div>
      <div class="costs">
        <span class="${s.yarn >= cost.yarn ? '' : 'lack'}">${YARN()} ${s.yarn}/${cost.yarn}</span>
        <span class="${s.coins >= cost.coins ? '' : 'lack'}">${COIN()} ${fmt(s.coins)}/${fmt(cost.coins)}</span>
      </div>
      <div class="row center gap">
        <button class="btn blue" data-act="item-up" data-arg="${it.uid}">Lv.UP</button>
        <button class="btn gold" data-act="item-up5" data-arg="${it.uid}">5회 Lv.UP</button>
      </div>
      <div class="row center gap">
        <button class="btn ${eq ? 'off' : ''}" data-act="item-equip" data-arg="${it.uid}">${eq ? '장착 해제' : '장착하기'}</button>
        <button class="btn small danger" data-act="item-break" data-arg="${it.uid}">분해 (${YARN()}+${dismantleValue(it)})</button>
      </div>
      <div class="same-row">${same.map((x) => this.itemCard(x, x.uid === it.uid ? 'data-sel="1"' : '')).join('')}</div>`, 'workbench');
  }

  private openPullResult(res: PullResult[], items: Item[]): void {
    sound.play('gacha');
    if (res.some((r) => r.isNew)) setTimeout(() => sound.play('meow'), 350);
    const cards = res.map((r, i) => `
      <button class="pull-card" data-act="goto-cat" data-arg="${r.def.id}" style="--rc:${RARITY_COLOR[r.def.rarity]};animation-delay:${i * 0.08}s">
        ${rarityBadge(r.def.rarity)}
        <canvas class="portrait" data-look="${r.def.id}"></canvas>
        <b>${r.def.name}</b>
        <small>${r.isNew ? '<em>NEW!</em>' : `조각 +${r.shards}`}</small>
      </button>`).join('');
    this.openModal(`
      <button class="x" data-act="close">✕</button>
      ${iconHtml('box-open', '', 'box-open-img')}
      <h2>상자에서 나온 고양이들!</h2>
      <div class="pull-grid ${res.length === 1 ? 'single' : ''}">${cards}</div>
      ${items.length ? `<h3>함께 받은 장비</h3><div class="inv-grid">${items.map((it) => this.itemCard(it)).join('')}</div>` : ''}
      <div class="row center"><button class="btn" data-act="close">확인</button></div>`);
  }

  private openItemsResult(items: Item[], title: string): void {
    sound.play('gacha');
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

const silCache = new Map<HTMLImageElement, HTMLCanvasElement>();
/** 그림을 한 가지 어두운 색으로 칠한 그림자 (한 번만 만든다) */
function silhouette(img: HTMLImageElement): HTMLCanvasElement {
  let c = silCache.get(img);
  if (!c) {
    c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cc = c.getContext('2d')!;
    cc.drawImage(img, 0, 0);
    cc.globalCompositeOperation = 'source-in';
    cc.fillStyle = '#4a3550';
    cc.fillRect(0, 0, c.width, c.height);
    silCache.set(img, c);
  }
  return c;
}

/** main.ts가 모아 둔 최근 오류 기록 */
function errorLog(): string[] {
  try { return JSON.parse(localStorage.getItem('catwar.errors') ?? '[]'); } catch { return []; }
}
