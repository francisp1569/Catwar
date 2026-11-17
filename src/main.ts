import './style.css';
import { artProgress, loadArt, loadWorldArt } from './art';
import { sound } from './audio';
import { CONFIG, applyLayout } from './data/config';
import { STAGES, getStage } from './data/stages';
import { Game, buildSquad } from './game';
import { Menu } from './menu';
import { bonuses } from './meta/items';
import { applyResult, isUnlocked } from './meta/rewards';
import { loadSave, writeSave, type SaveData } from './meta/save';
import { chipAt, render, type RewardView } from './render';
import { ch2Cuts, story } from './story';
import { adLeft, adUse, showRewarded } from './ads';
import { cloud, cloudEnabled, cloudFlush, cloudInit, cloudPush } from './cloud';
import * as gacha from './meta/gacha';
import * as items from './meta/items';
import * as progression from './meta/progression';
import * as rewards from './meta/rewards';
import * as saveMod from './meta/save';
import * as stagesMod from './data/stages';
import { CAT_BY_ID, HERO_ID, setHero } from './data/cats';
import { openHeroPicker } from './heroPick';
import { CHOICE_BUTTONS, HUD_BUTTONS, PAUSE_BUTTONS, RESULT_BUTTONS, buttonKey, hit, layoutButtons, type Button } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let save: SaveData = loadSave();
setHero(save.heroId ?? 'cheese', save.heroName);
let game: Game | null = null;
let reward: RewardView | null = null;

const menu = new Menu(save, startBattle);

function startBattle(stageId: string): void {
  const stage = getStage(stageId);
  if (!stage) return;
  // 2장에 처음 들어가면 짧은 컷씬
  if (stage.no >= 11 && !save.ch2Seen) {
    canvas.hidden = true;
    game = null;
    story.play(() => { save.ch2Seen = true; writeSave(save); startBattle(stageId); }, ch2Cuts());
    return;
  }
  applyLayout(window.innerWidth, window.innerHeight);
  layoutButtons(CONFIG.height);
  save.selectedStage = stage.id.replace(/h$/, '');
  game = new Game(stage, buildSquad(save.cats), bonuses(save), save.seen);
  game.tutorial = !save.tutorialDone;
  reward = null;
  adPending = false;
  reviveAsked = false;
  clearAdUi();
  menu.hide();
  canvas.hidden = false;
  resize();
  sound.music('battle');
}

/** 승리 → 다음 스테이지, 패배 → 같은 스테이지 다시 */
/** 첫 승리 뒤 한 번은 로비로 돌아가 이메일 저장을 권한다 */
function wantsCloudAsk(g: Game): boolean {
  const lv = reward && (reward as { levelUp?: [number, number] | null }).levelUp;
  return !lv && !!g.result?.victory && cloudEnabled() && cloud.status === 'on' && !cloud.email && !save.cloudAsked;
}

function afterResult(g: Game): void {
  clearAdUi();
  // 첫 승리 뒤엔 로비로: 이메일 저장 권유 + 입양 안내
  if (wantsCloudAsk(g) || (g.result?.victory && save.guide === undefined)) { endBattle(); return; }
  const lv = reward && (reward as { levelUp?: [number, number] | null }).levelUp;
  const target = (g.result?.victory && g.nextId ? getStage(g.nextId) : null) ?? g.stage;
  pressed = null;
  startBattle(target.id);
  if (lv) setTimeout(() => sound.play('levelup'), 200);
}

// ───────────── 보상형 광고: 패배 시 부활, 승리 시 보상 2배 ─────────────
let adPending = false;
let reviveAsked = false;

function clearAdUi(): void {
  document.querySelectorAll('.adoffer').forEach((n) => n.remove());
}

/** 바리케이드가 무너졌을 때: 광고 보고 부활할지 묻는다 (한 판에 한 번) */
function offerRevive(g: Game): void {
  adPending = true;
  const el = document.createElement('div');
  el.className = 'adoffer revive';
  el.innerHTML = `<div class="ao-card">
      <h2>💥 바리케이드가 무너졌어요!</h2>
      <p>광고를 끝까지 보면 <b>바리케이드 60% 회복</b>,<br>가까이 온 적은 멀리 날려 보내요.</p>
      <div class="row center gap">
        <button class="btn off" data-ao="no">포기하기</button>
        <button class="btn gold" data-ao="yes">📺 광고 보고 부활</button>
      </div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', async (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-ao]')?.dataset.ao;
    if (!a) return;
    sound.play('click');
    el.remove();
    if (a === 'yes' && (await showRewarded('revive')) && game === g) {
      adUse(save, 'revive');
      g.revive();
    }
    adPending = false;
  });
}

/** 승리 결과 화면: 광고 보고 보상 2배 (하루 몇 번) */
function offerDouble(g: Game, r: { coins: number; tuna: number; yarn: number }): void {
  if (!(r.coins || r.tuna || r.yarn) || adLeft(save, 'double') <= 0) return;
  const el = document.createElement('button');
  el.className = 'adoffer double btn gold';
  el.innerHTML = `📺 광고 보고 보상 2배 <small>오늘 ${adLeft(save, 'double')}회 남음</small>`;
  // 결과 화면 버튼 바로 위에 놓는다
  const y = offY + (RESULT_BUTTONS[0].rect.y - 74) * scale;
  Object.assign(el.style, { top: `${y}px`, transform: `translateX(-50%) scale(${Math.min(1.2, scale)})` });
  document.body.appendChild(el);
  el.addEventListener('click', async () => {
    sound.play('click');
    el.disabled = true;
    const ok = await showRewarded('double');
    el.remove();
    if (!ok || game !== g) return;
    adUse(save, 'double');
    save.coins += r.coins;
    save.tuna += r.tuna;
    save.yarn += r.yarn;
    r.coins *= 2; r.tuna *= 2; r.yarn *= 2;
    writeSave(save);
    sound.play('levelup');
  });
}

function endBattle(): void {
  clearAdUi();
  const lv = reward && (reward as { levelUp?: [number, number] | null }).levelUp;
  const lt = reward ? (reward as { levelTuna?: number }).levelTuna ?? 0 : 0;
  game = null;
  canvas.hidden = true;
  menu.show(save);
  sound.music('lobby');
  // 로비로 돌아오는 터치가 모달 바깥 클릭으로 이어져 바로 닫히지 않게 조금 뒤에 띄운다
  const won = Object.keys(save.stages).length > 0;
  if (won) menu.startGuide();
  if (lv) setTimeout(() => menu.celebrateLevel(lv[1], lt), 400);
  else if (won) setTimeout(() => menu.askCloudAfterWin(), 400);
}

// ───────────── 화면 스케일 (세로 540x960을 화면에 맞춤) ─────────────
let scale = 1;
let offX = 0;
let offY = 0;
let dpr = 1;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  scale = Math.min(w / CONFIG.width, h / CONFIG.height);
  offX = (w - CONFIG.width * scale) / 2;
  offY = (h - CONFIG.height * scale) / 2;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

function toLogical(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left - offX) / scale, y: (e.clientY - rect.top - offY) / scale };
}

// ───────────── 입력 ─────────────
let pressed: string | null = null;

function cycleSpeed(g: Game): void {
  g.speed = g.speed === 1 ? 1.5 : g.speed === 1.5 ? 2 : 1;
}

function press(g: Game, b: Button): void {
  switch (b.id.type) {
    case 'pause': g.paused = !g.paused; break;
    case 'speed': cycleSpeed(g); break;
    case 'rally': g.useRally(); break;
    case 'card': g.pick(b.id.index); break;
    case 'reroll': g.reroll(); break;
    case 'resume': g.paused = false; break;
    case 'quit': endBattle(); break;
    case 'sound': { const on = !(sound.sfxOn || sound.musicOn); sound.setSfx(on); sound.setMusic(on); break; }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const g = game;
  if (!g) return;
  if (g.phase !== 'playing') {
    if (!reward) return;
    const p = toLogical(e);
    for (const b of RESULT_BUTTONS) {
      if (!hit(b.rect, p.x, p.y)) continue;
      pressed = buttonKey(b.id);
      if (b.id.type === 'lobby') endBattle();
      else afterResult(g);
      return;
    }
    return;
  }
  if (g.pickAnim) return;
  const { x, y } = toLogical(e);
  let list: Button[];
  if (g.choice) list = CHOICE_BUTTONS.filter((b) => b.id.type !== 'card' || b.id.index < g.choice!.length);
  else if (g.paused) list = PAUSE_BUTTONS;
  else list = HUD_BUTTONS;
  for (const b of list) {
    if (hit(b.rect, x, y)) {
      pressed = buttonKey(b.id);
      press(g, b);
      return;
    }
  }
  // 왼쪽 고양이 얼굴 = 필살기
  if (!g.choice && !g.paused) {
    const slot = chipAt(g, x, y);
    if (slot !== null) g.useUlt(slot);
  }
});
const release = (): void => { pressed = null; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const g = game;
  if (!g) return;
  if (g.phase !== 'playing') {
    if (!reward) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') afterResult(g);
    else if (e.key === 'Escape') endBattle();
    return;
  }
  if (g.pickAnim) return;
  if (g.choice) {
    const n = Number(e.key);
    if (n >= 1 && n <= g.choice.length) g.pick(n - 1);
    else if (e.key === 'r' || e.key === 'R') g.reroll();
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= 6) { const act = g.squad.filter((m) => m.level > 0)[n - 1]; if (act) g.useUlt(act.slot); return; }
  if (e.key === 'q' || e.key === 'Q' || e.key === ' ') g.useRally();
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') g.paused = !g.paused;
  else if (e.key === 'f' || e.key === 'F') cycleSpeed(g);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && game.phase === 'playing') game.paused = true;
});

// ───────────── 루프 ─────────────
let last = performance.now();
let elapsed = 0;
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  elapsed += Math.min(dt, 0.1);
  const g = game;
  if (g) {
    g.update(dt);
    for (const ev of g.events) sound.play(ev);
    g.events.length = 0;
    if (g.phase === 'defeat' && !reward && !adPending && !reviveAsked && !g.tutorial) { reviveAsked = true; offerRevive(g); }
    if (g.phase !== 'playing' && !reward && !adPending) {
      reward = applyResult(save, g.stage, g.result!);
      if (g.result!.victory) offerDouble(g, reward as unknown as { coins: number; tuna: number; yarn: number });
      if (g.tutorial && g.tutStep >= 1) save.tutorialDone = true;
      // 승리하면 로비에서도 다음 스테이지가 선택되어 있게
      if (g.result!.victory) {
        const next = STAGES.find((s) => s.no === g.stage.no + 1);
        if (next) {
          save.selectedStage = next.id;
          // 같은 모드(보통/어려움)의 다음 판이 열려 있으면 결과 화면에서 바로 이어 하기
          const cand = getStage(next.id + (g.stage.hard ? 'h' : ''))!;
          g.nextId = isUnlocked(save, cand) ? cand.id : null;
        }
      }
      writeSave(save);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b1d2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CONFIG.width, CONFIG.height);
    ctx.clip();
    render(ctx, g, elapsed, pressed, reward);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.hidden = true;
menu.show(save);

// ───────────── 로딩 화면 → 터치해서 시작 ─────────────
const loading = document.createElement('div');
loading.id = 'loading';
loading.innerHTML = `
  <div class="ld-art"></div>
  <div class="ld-logo"><b>냥냥 방위대</b><small>CATWAR</small></div>
  <div class="ld-bottom">
    <div class="ld-bar"><i></i></div>
    <p class="ld-msg">고양이들이 출동 준비 중…</p>
  </div>`;
document.body.appendChild(loading);
const titleImg = new Image();
titleImg.onload = () => { (loading.querySelector('.ld-art') as HTMLElement).style.backgroundImage = `url(${titleImg.src})`; loading.classList.add('has-art'); };
titleImg.src = 'art/world/story/title.jpg';
const bar = loading.querySelector('.ld-bar i') as HTMLElement;
let loaded = false;
const tickLoad = (): void => {
  const k = artProgress.total ? artProgress.done / artProgress.total : 0;
  bar.style.width = `${Math.round((loaded ? 1 : Math.min(0.97, k)) * 100)}%`;
  if (!loaded) requestAnimationFrame(tickLoad);
};
requestAnimationFrame(tickLoad);

function enterGame(): void {
  loading.classList.add('out');
  setTimeout(() => loading.remove(), 500);
  sound.music('lobby');
  // 처음 켜면: 대장 고양이 고르기 → 스토리 컷씬 → (아직 아무 판도 안 깼으면) 바로 1스테이지
  const playIntro = (): void => {
    story.play(() => {
      save.introSeen = true;
      writeSave(save);
      if (!Object.keys(save.stages).length) startBattle('s1');
    });
  };
  if (!save.introSeen && !save.heroId && !Object.keys(save.stages).length) {
    if (cloudEnabled() && cloud.status === 'on') openWelcome(pickHero);
    else pickHero();
  } else if (!save.introSeen) playIntro();
}

/** 맨 처음: 새로 시작할지, 다른 기기에서 하던 저장을 불러올지 */
function openWelcome(onNew: () => void): void {
  const el = document.createElement('div');
  el.id = 'welcome';
  el.innerHTML = `
    <div class="wl-card">
      <h2>냥냥 방위대에 온 걸 환영해요!</h2>
      <p>진행은 자동으로 저장돼요.<br><b>첫 판을 깬 뒤</b> 이메일을 연결하면<br>폰을 바꿔도 이어 할 수 있어요.</p>
      <button class="btn gold" data-w="new">🐾 처음부터 시작할래요</button>
      <button class="btn" data-w="load">📥 다른 기기에서 하던 저장이 있어요</button>
      <small class="muted">비밀번호 없이 이메일로 받은 숫자 코드만 있으면 돼요.</small>
    </div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (e) => {
    const w = (e.target as HTMLElement).closest<HTMLElement>('[data-w]')?.dataset.w;
    if (!w) return;
    sound.play('click');
    el.remove();
    if (w === 'new') onNew();
    else {
      // 불러오기 창을 닫으면(취소) 다시 이 화면으로
      menu.show(save);
      menu.openCloud('login');
      const back = (): void => { if (!document.querySelector('#modal:not([hidden])')) { obs.disconnect(); if (!save.heroId) openWelcome(onNew); } };
      const obs = new MutationObserver(back);
      obs.observe(document.getElementById('modal')!, { attributes: true, attributeFilter: ['hidden'] });
    }
  });
}

function pickHero(): void {
  const playIntro = (): void => {
    story.play(() => {
      save.introSeen = true;
      writeSave(save);
      if (!Object.keys(save.stages).length) startBattle('s1');
    });
  };
  {
    openHeroPicker({
      onPick: (id, name) => {
        saveMod.chooseHero(save, id, name);
        setHero(id, name);
        writeSave(save);
        menu.show(save);
        playIntro();
      },
    });
  }
}
// 브라우저 정책: 첫 터치/키 입력 때 소리를 켠다
// 브라우저마다 '사용자 동작'으로 인정하는 이벤트가 달라서 여러 개에 건다 (구형 iOS는 touchend/click만 인정)
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) document.addEventListener(ev, () => sound.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) sound.wake(); });
window.addEventListener('pageshow', () => sound.wake());
window.addEventListener('focus', () => sound.wake());
// 클라우드 저장: 저장할 때마다 서버로 (설정이 비어 있으면 아무것도 안 함)
saveMod.setOnWrite((d) => cloudPush(d));
window.addEventListener('pagehide', () => cloudFlush());
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudFlush(); });
// 로딩하는 동안 게스트 로그인 + 서버 저장 확인 (최대 5초만 기다림)
const cloudReady = Promise.race([
  cloudInit(save).then((remote) => {
    if (remote) {
      // 서버 저장이 더 최근: 이 기기 저장을 바꾼다
      save = remote;
      saveMod.replaceLocalSave(save);
      setHero(save.heroId ?? 'cheese', save.heroName);
      menu.show(save);
    }
  }),
  new Promise<void>((ok) => setTimeout(ok, 5000)),
]);

void Promise.all([loadArt(), loadWorldArt(), cloudReady]).then(() => {
  loaded = true;
  bar.style.width = '100%';
  menu.refresh();
  (loading.querySelector('.ld-msg') as HTMLElement).textContent = '화면을 터치해서 시작!';
  loading.classList.add('ready');
  // 터치(소리 켜기에도 필요) 한 번으로 시작
  loading.addEventListener('pointerdown', enterGame, { once: true });
});

// 디버그/테스트용 훅
Object.assign(window as object, {
  __catwar: {
    get game() { return game; },
    get save() { return save; },
    setSave(s: SaveData) { save = s; setHero(save.heroId ?? 'cheese', save.heroName); writeSave(save); menu.show(save); },
    start: startBattle,
    sound,
    hero: () => HERO_ID,
    cloud,
    meta: { gacha, items, progression, rewards, save: saveMod, stages: stagesMod, cats: CAT_BY_ID },
  },
});
