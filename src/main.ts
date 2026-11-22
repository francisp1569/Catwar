import './style.css';
import { artProgress, loadArt, loadWorldArt } from './art';
import { sound } from './audio';
import { CONFIG, applyLayout } from './data/config';
import { STAGES, endlessStage, getStage } from './data/stages';
import { Game, buildSquad } from './game';
import { Menu } from './menu';
import { bonuses } from './meta/items';
import { applyResult, isUnlocked } from './meta/rewards';
import { loadSave, writeSave, type SaveData } from './meta/save';
import { chipAt, prewarmEnemies, render, setSpriteScale, type RewardView } from './render';
import { ENEMIES } from './data/enemies';
import { ART_V } from './art';
import { ch2Cuts, story } from './story';
import { adLeft, adUse, showRewarded } from './ads';
import { cloud, cloudEnabled, cloudFlush, cloudInit, cloudPush, track } from './cloud';
import * as gacha from './meta/gacha';
import * as items from './meta/items';
import * as progression from './meta/progression';
import { playerLevel } from './meta/items';
import { bump } from './meta/daily';
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
  const best = Math.max(0, ...Object.keys(save.stages).filter((k) => !k.endsWith('h')).map((k) => Number(k.slice(1)) || 0));
  const stage = stageId === 'inf' ? endlessStage(best) : getStage(stageId);
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
  if (!stage.endless) save.selectedStage = stage.id.replace(/h$/, '');
  game = new Game(stage, buildSquad(save.cats), bonuses(save), save.seen);
  game.tutorial = !save.tutorialDone;
  game.aimHint = !!save.tutorialDone && !save.aimLearned;
  track('stage_start', { stage: stage.id, lv: playerLevel(save.exp).level });
  reward = null;
  adPending = false;
  reviveAsked = false;
  clearAdUi();
  menu.hide();
  canvas.hidden = false;
  resize();
  graceT = 4;
  avgDt = 1 / 60;
  slowT = 0;
  // 이번 판에 나올 적 그림을 미리 구워 둔다
  const kinds = new Set<string>([...Object.keys(stage.early), ...Object.keys(stage.late), ...stage.bursts.map((b) => b.kind)]);
  if (stage.boss) { kinds.add(stage.boss.kind); if (stage.boss.with) kinds.add(stage.boss.with); }
  for (const k of [...kinds]) { const sm = ENEMIES[k as keyof typeof ENEMIES]?.summon; if (sm) kinds.add(sm.kind); }
  prewarmEnemies(ctx, [...kinds].map((k) => ENEMIES[k as keyof typeof ENEMIES]).filter(Boolean));
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
    const ok = a === 'yes' && (await showRewarded('revive'));
    track('ad', { kind: 'revive', asked: a === 'yes', ok, stage: g.stage.id });
    if (ok) bump(save, 'ad');
    if (ok && game === g) {
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
    track('ad', { kind: 'double', ok, stage: g.stage.id });
    el.remove();
    if (!ok || game !== g) return;
    adUse(save, 'double');
    bump(save, 'ad');
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
/**
 * 화면 선명도 상한: 처음엔 최대 2배, 프레임이 버벅이면 스스로 낮춘다 (1.25까지).
 * 폰 화면은 픽셀이 아주 많아서(아이폰 3배) 그대로 그리면 GPU가 힘들어한다.
 */
let dprCap = 2;
let avgDt = 1 / 60;
let slowT = 0;
let fastT = 0;
/** 전투 시작 직후(그림 준비 등)는 원래 잠깐 느리니 판단하지 않는다 */
let graceT = 4;
function adaptQuality(dt: number): void {
  if (dt > 0.25) return; // 탭 전환 등으로 생긴 큰 간격은 무시
  if (graceT > 0) { graceT -= dt; return; }
  avgDt += (dt - avgDt) * 0.05; // 순간 튐이 아니라 평균으로 판단
  if (avgDt > 1 / 36) { slowT += dt; fastT = 0; } else { fastT += dt; slowT = Math.max(0, slowT - dt); }
  if (slowT > 3 && dprCap > 1.5) {
    dprCap -= 0.25;
    slowT = 0;
    graceT = 2;
    resize();
  } else if (fastT > 15 && dprCap < 2) {
    dprCap = Math.min(2, dprCap + 0.25);
    fastT = 0;
    graceT = 2;
    resize();
  }
}

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  scale = Math.min(w / CONFIG.width, h / CONFIG.height);
  setSpriteScale(dpr * scale);
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
    if (slot !== null) { g.useUlt(slot); return; }
    // 그 밖의 전장 = 대장 조준 (누르고 끌면 따라온다)
    if (y > CONFIG.fieldTop - 40 && y < CONFIG.barricadeY + 10) {
      aiming = e.pointerId;
      g.setAim(x, y, true);
    }
  }
});
let aiming: number | null = null;
canvas.addEventListener('pointermove', (e) => {
  if (aiming !== e.pointerId || !game || game.phase !== 'playing' || game.choice || game.paused) return;
  const p = toLogical(e);
  game.setAim(p.x, p.y, true);
});
const release = (e?: PointerEvent): void => {
  pressed = null;
  if (e && aiming === e.pointerId) { aiming = null; game?.releaseAim(); }
};
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
  // 어떤 오류가 나도 다음 프레임은 꼭 예약한다 (오류 한 번에 게임 전체가 멈추지 않게)
  requestAnimationFrame(frame);
  try {
    frameBody(now);
  } catch (err) {
    reportError(err);
  }
}

/** 최근 오류 기록 (설정 화면에서 복사해 보낼 수 있게) */
function reportError(err: unknown): void {
  const e = err as Error;
  const line = `${new Date().toISOString()} ${e?.message ?? String(err)} | ${(e?.stack ?? '').split('\n').slice(0, 3).join(' / ')}`;
  console.error(err);
  try {
    const list: string[] = JSON.parse(localStorage.getItem('catwar.errors') ?? '[]');
    if (list[list.length - 1]?.slice(25) === line.slice(25)) return;
    list.push(line);
    localStorage.setItem('catwar.errors', JSON.stringify(list.slice(-20)));
  } catch { /* noop */ }
}
window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message));
window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason));

function frameBody(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  elapsed += Math.min(dt, 0.1);
  const g = game;
  if (g) {
    if (g.phase === 'playing' && !g.paused) adaptQuality(dt);
    g.update(dt);
    for (const ev of g.events) sound.play(ev);
    g.events.length = 0;
    if (g.phase === 'defeat' && !reward && !adPending && !reviveAsked && !g.tutorial) { reviveAsked = true; offerRevive(g); }
    if (g.phase !== 'playing' && !reward && !adPending) {
      reward = applyResult(save, g.stage, g.result!);
      if (g.aimUsed) save.aimLearned = true;
      bump(save, 'battle');
      if (g.result!.victory) bump(save, 'win');
      bump(save, 'kill', g.result!.kills);
      bump(save, 'ult', g.ultUses);
      track('stage_end', { stage: g.stage.id, win: g.result!.victory, stars: g.result!.stars, prog: Math.round(g.result!.progress * 100) / 100, time: Math.round(g.time), lv: g.level, revived: g.revived, minHp: Math.round(g.minHpRatio * 100) / 100 });
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
  </div>
  <p class="ld-links"><a href="about.html">게임 소개</a> · <a href="privacy.html">개인정보처리방침</a></p>`;
document.body.appendChild(loading);
const titleImg = new Image();
titleImg.onload = () => { (loading.querySelector('.ld-art') as HTMLElement).style.backgroundImage = `url(${titleImg.src})`; loading.classList.add('has-art'); };
titleImg.src = `art/world/story/title.jpg?v=${ART_V}`;
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
  else setTimeout(() => menu.maybeDaily(), 500);
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
document.addEventListener('visibilitychange', () => { if (document.hidden) sound.sleep(); else sound.wake(); });
window.addEventListener('pageshow', () => sound.wake());
window.addEventListener('focus', () => sound.wake());
// 클라우드 저장: 저장할 때마다 서버로 (설정이 비어 있으면 아무것도 안 함)
saveMod.setOnWrite((d) => cloudPush(d));
window.addEventListener('pagehide', () => cloudFlush());
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudFlush(); });
// 로딩하는 동안 게스트 로그인 + 서버 저장 확인 (최대 5초만 기다림)
const cloudReady = Promise.race([
  cloudInit(save).then((remote) => {
    const sv = remote ?? save;
    track('session', { hero: sv.heroId ?? 'cheese', lv: playerLevel(sv.exp).level, cleared: Object.keys(sv.stages ?? {}).length, cats: Object.keys(sv.cats ?? {}).length, mobile: /Mobi|Android|iPhone/i.test(navigator.userAgent), standalone: matchMedia('(display-mode: standalone)').matches });
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
  loading.querySelectorAll('.ld-links a').forEach((a) => a.addEventListener('pointerdown', (e) => e.stopPropagation()));
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
    /** 성능 측정용: 지금 화면을 n번 그리는 데 걸린 시간(ms) */
    bench(n = 30) {
      if (!game) return -1;
      const t0 = performance.now();
      for (let i = 0; i < n; i++) {
        ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
        render(ctx, game, elapsed, null, reward);
      }
      ctx.getImageData(0, 0, 1, 1); // 그리기를 실제로 끝내게 한다
      return (performance.now() - t0) / n;
    },
    cloud,
    meta: { gacha, items, progression, rewards, save: saveMod, stages: stagesMod, cats: CAT_BY_ID },
  },
});
