// 세로형 전투 화면 렌더링 — 모든 그래픽은 코드로 그린다 (외부 에셋 없음)
import { drawCatBackToon, drawCatFaceToon, drawCatLookToon, drawToon, ellipse as vellipse, heart, IDLE_POSE, shadeHex } from './catdraw';
import { drawFaceArtCircle, getArt } from './art';
import { sound } from './audio';
import { RARITY_COLOR, type CatLook } from './data/cats';
import { CONFIG } from './data/config';
import { ENEMIES, type EnemyDef, type EnemyKind } from './data/enemies';
import type { Area, StageDef } from './data/stages';
import { GENERIC } from './data/weapons';
import { fmtDmg, type Card, type Decal, type Enemy, type Game, type Member } from './game';
import { CHOICE_BUTTONS, HUD_BUTTONS, PAUSE_BUTTONS, buttonKey, type Rect } from './ui';

type Ctx = CanvasRenderingContext2D;
const W = CONFIG.width;
const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export interface RewardView { coins: number; tuna: number; yarn: number; exp: number; heroShards: number; firstClear: boolean; newStars: number; items: { slot: string; rarity: string }[]; discovered: number; }

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', outline = true): void {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = Math.max(3, size / 4.5);
    ctx.strokeStyle = 'rgba(40,20,40,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function vcircle(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  vellipse(ctx, x, y, r, r, fill);
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ellipse(ctx, x, y, r, r, fill);
}

function drawGirl(ctx: Ctx, cx: number, cy: number, mood: number, t: number): void {
  // mood: 1=행복, 0=울음
  const bob = Math.sin(t * 2) * 1.5;
  cy += bob;
  // 머리카락(뒤)
  circle(ctx, cx - 22, cy + 6, 10, '#6b3b2a');
  circle(ctx, cx + 22, cy + 6, 10, '#6b3b2a');
  circle(ctx, cx, cy, 22, '#6b3b2a');
  // 얼굴
  circle(ctx, cx, cy + 4, 18, '#ffe2cf');
  // 앞머리
  ctx.fillStyle = '#6b3b2a';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 20, 11, 0, Math.PI, 0);
  ctx.fill();
  // 리본
  ctx.fillStyle = '#ff5f9e';
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy - 18); ctx.lineTo(cx + 4, cy - 26); ctx.lineTo(cx + 4, cy - 10); ctx.closePath();
  ctx.moveTo(cx + 14, cy - 18); ctx.lineTo(cx + 26, cy - 28); ctx.lineTo(cx + 24, cy - 10); ctx.closePath();
  ctx.fill();
  circle(ctx, cx + 14, cy - 18, 3.5, '#ff2f7e');
  // 볼터치
  ellipse(ctx, cx - 11, cy + 10, 4, 2.5, 'rgba(255,120,150,0.55)');
  ellipse(ctx, cx + 11, cy + 10, 4, 2.5, 'rgba(255,120,150,0.55)');
  // 눈 / 입
  ctx.strokeStyle = '#3a2020';
  ctx.fillStyle = '#3a2020';
  ctx.lineWidth = 2;
  if (mood > 0.6) {
    ctx.beginPath(); ctx.arc(cx - 7, cy + 4, 3, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 7, cy + 4, 3, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 11, 4, 0, Math.PI); ctx.stroke();
  } else if (mood > 0.25) {
    circle(ctx, cx - 7, cy + 3, 2.5, '#3a2020');
    circle(ctx, cx + 7, cy + 3, 2.5, '#3a2020');
    ctx.beginPath(); ctx.moveTo(cx - 4, cy + 13); ctx.quadraticCurveTo(cx, cy + 10, cx + 4, cy + 13); ctx.stroke();
    // 땀
    ellipse(ctx, cx + 18, cy - 2, 2.5, 4, '#8fd3ff');
  } else {
    ctx.beginPath(); ctx.moveTo(cx - 10, cy + 2); ctx.lineTo(cx - 4, cy + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, cy + 2); ctx.lineTo(cx + 4, cy + 5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 15, 4, Math.PI, 0); ctx.stroke();
    const tear = (t * 40) % 14;
    ellipse(ctx, cx - 8, cy + 8 + tear, 2, 3, '#8fd3ff');
    ellipse(ctx, cx + 8, cy + 8 + tear, 2, 3, '#8fd3ff');
  }
}


/** 데미지 숫자: 굵은 기울임 + 두꺼운 외곽선 */
function numText(ctx: Ctx, s: string, size: number, color: string): void {
  ctx.font = `italic 900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size / 3.2);
  ctx.strokeStyle = '#2a1018';
  ctx.strokeText(s, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(s, 0, 0);
}

function wrap(ctx: Ctx, s: string, maxW: number, size: number): string[] {
  ctx.font = `bold ${size}px ${FONT}`;
  const lines: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur.trim());
      cur = ch;
    } else cur += ch;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/** 얼굴 그림(사진)이 있으면 원 안에 그리고, 없으면 코드로 그린 얼굴 */
function iconFace(ctx: Ctx, id: string, cx: number, cy: number, r: number, fallback: () => void): void {
  const art = getArt(id, 'face');
  if (art) drawFaceArtCircle(ctx, id, art, cx, cy, r);
  else fallback();
}

function drawFaceAt(ctx: Ctx, look: CatLook, x: number, y: number, R: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  drawCatFaceToon(ctx, `hud${Math.round(R)}`, { ...look, accessory: look.accessory === 'heart' ? undefined : look.accessory }, R, t, Math.max(1, R * 0.08));
  ctx.restore();
}


// ───────────────────────── 배경 (위에서 내려다본 방 바닥) ─────────────────────────

const FLOORS: Record<Area, { a: string; b: string; tile: boolean; line: string; wall: string }> = {
  entrance: { a: '#d8d2c8', b: '#cbc4b8', tile: true, line: 'rgba(120,100,80,0.18)', wall: '#cdeedd' },
  living: { a: '#d9a874', b: '#cf9c66', tile: false, line: 'rgba(110,60,20,0.22)', wall: '#ffd6e4' },
  kitchen: { a: '#f4efe4', b: '#e6dcc6', tile: true, line: 'rgba(150,120,80,0.2)', wall: '#ffe9ad' },
  attic: { a: '#8f6a48', b: '#836041', tile: false, line: 'rgba(40,20,5,0.3)', wall: '#bfa27c' },
};

// 바닥은 스테이지마다 한 번만 자세히 그려두고(오프스크린) 매 프레임 그 그림을 찍는다
const floorCache = new Map<string, HTMLCanvasElement>();

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

const OUT = '#3b2228';

function outlined(ctx: Ctx, draw: () => void, w = 2): void {
  draw();
  ctx.lineWidth = w;
  ctx.strokeStyle = OUT;
  ctx.stroke();
}

function propYarn(ctx: Ctx, x: number, y: number, r: number, col: string, rnd: () => number): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.8, y + r * 0.4);
  ctx.bezierCurveTo(x + r * 3, y + r * 2 * rnd(), x + r * 2, y + r * 4, x + r * 5 * rnd(), y + r * 4.5);
  ctx.stroke();
  outlined(ctx, () => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); vellipse(ctx, x, y, r, r, col); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); });
  ctx.strokeStyle = '#ffffff99';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x, y, r * 0.7, i * 2 + 0.3, i * 2 + 1.6); ctx.stroke(); }
}

function propMouseToy(ctx: Ctx, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#d07090';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-22, -8, -30, 2); ctx.stroke();
  outlined(ctx, () => { vellipse(ctx, 0, 0, 13, 8, '#a9a3b8'); ctx.beginPath(); ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2); });
  outlined(ctx, () => { vellipse(ctx, 8, -6, 4, 4, '#f4a7b9'); ctx.beginPath(); ctx.arc(8, -6, 4, 0, Math.PI * 2); }, 1.5);
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.arc(11, -1, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function propSock(ctx: Ctx, x: number, y: number, rot: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  outlined(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(-8, -22); ctx.lineTo(8, -22); ctx.lineTo(8, 4); ctx.quadraticCurveTo(8, 14, 20, 14); ctx.quadraticCurveTo(26, 22, 14, 24);
    ctx.lineTo(-2, 24); ctx.quadraticCurveTo(-8, 22, -8, 12); ctx.closePath();
    const g = ctx.createLinearGradient(-8, -22, 20, 24); g.addColorStop(0, shadeHex(col, 0.25)); g.addColorStop(1, shadeHex(col, -0.15));
    ctx.fillStyle = g; ctx.fill();
  });
  ctx.fillStyle = '#ffffffaa';
  ctx.fillRect(-8, -22, 16, 5);
  ctx.restore();
}

function propFeather(ctx: Ctx, x: number, y: number, rot: number, col: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  outlined(ctx, () => { vellipse(ctx, 0, 0, 5, 16, col); ctx.beginPath(); ctx.ellipse(0, 0, 5, 16, 0, 0, Math.PI * 2); }, 1.5);
  ctx.strokeStyle = '#ffffffaa';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 20); ctx.stroke();
  ctx.restore();
}

function buildFloor(area: Area, h: number, k: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * k);
  c.height = Math.ceil(h * k);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const f = FLOORS[area];
  const rnd = rng(area.length * 977 + 13);
  ctx.fillStyle = f.a;
  ctx.fillRect(0, 0, W, h);
  if (f.tile) {
    for (let y = 0; y < h; y += 60) for (let x = 0; x < W; x += 60) {
      const alt = ((x + y) / 60) % 2 === 0;
      const g = ctx.createLinearGradient(x, y, x + 60, y + 60);
      const base = alt ? f.a : f.b;
      g.addColorStop(0, shadeHex(base, 0.08 + rnd() * 0.05));
      g.addColorStop(1, shadeHex(base, -0.05 - rnd() * 0.04));
      ctx.fillStyle = g;
      ctx.fillRect(x + 1, y + 1, 58, 58);
    }
    ctx.strokeStyle = 'rgba(90,70,50,0.25)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else {
    // 나무 마루: 판자별 색 차이 + 나뭇결 + 옹이
    for (let x = 0; x < W; x += 54) {
      for (let y = -((x / 54) % 3) * 70; y < h; y += 210) {
        const g = ctx.createLinearGradient(x, 0, x + 54, 0);
        const v = (rnd() - 0.5) * 0.12;
        g.addColorStop(0, shadeHex(f.a, v + 0.06));
        g.addColorStop(1, shadeHex(f.a, v - 0.06));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, 54, 210);
        ctx.strokeStyle = 'rgba(80,40,10,0.13)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 4; i++) {
          const gx = x + 8 + rnd() * 38;
          ctx.beginPath();
          ctx.moveTo(gx, y);
          ctx.bezierCurveTo(gx + (rnd() - 0.5) * 14, y + 70, gx + (rnd() - 0.5) * 14, y + 140, gx + (rnd() - 0.5) * 6, y + 210);
          ctx.stroke();
        }
        if (rnd() < 0.35) {
          const kx = x + 12 + rnd() * 30;
          const ky = y + 30 + rnd() * 150;
          ctx.fillStyle = 'rgba(80,40,10,0.25)';
          ctx.beginPath(); ctx.ellipse(kx, ky, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(80,40,10,0.15)';
          ctx.beginPath(); ctx.ellipse(kx, ky, 6, 11, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.strokeStyle = f.line;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 54, 210);
      }
    }
  }
  // 미세한 먼지·질감
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${0.03 + rnd() * 0.05})` : `rgba(255,255,255,${0.03 + rnd() * 0.06})`;
    ctx.fillRect(rnd() * W, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // 구역별 큰 소품
  ctx.save();
  if (area === 'living') {
    // 러그
    outlined(ctx, () => { vellipse(ctx, W / 2, 440, 220, 155, '#f6a8bc'); ctx.beginPath(); ctx.ellipse(W / 2, 440, 220, 155, 0, 0, Math.PI * 2); }, 3);
    for (const [rx, ry, col] of [[180, 125, '#ffd0dc'], [140, 96, '#f08aa4'], [95, 64, '#ffd0dc']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.ellipse(W / 2, 440, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = '#f6a8bc';
    ctx.lineWidth = 2;
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 220, 440 + Math.sin(a) * 155); ctx.lineTo(W / 2 + Math.cos(a) * 232, 440 + Math.sin(a) * 166); ctx.stroke();
    }
  } else if (area === 'entrance') {
    outlined(ctx, () => { roundRect(ctx, 140, 410, 260, 160, 14); const g = ctx.createLinearGradient(0, 410, 0, 570); g.addColorStop(0, '#a9d4bc'); g.addColorStop(1, '#7fb49a'); ctx.fillStyle = g; ctx.fill(); roundRect(ctx, 140, 410, 260, 160, 14); }, 3);
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 4;
    for (let x = 160; x < 390; x += 16) { ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x, 560); ctx.stroke(); }
    ctx.font = `bold 22px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffffcc'; ctx.fillText('어서오냥', W / 2, 498);
    for (const [sx, sy, rot] of [[60, 300, -0.2], [100, 312, 0.15]] as const) {
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot);
      outlined(ctx, () => { vellipse(ctx, 0, 0, 20, 38, '#ff8fa8'); ctx.beginPath(); ctx.ellipse(0, 0, 20, 38, 0, 0, Math.PI * 2); }, 2.5);
      vellipse(ctx, 0, -8, 13, 22, '#ffd0dc');
      ctx.restore();
    }
  } else if (area === 'kitchen') {
    outlined(ctx, () => { vellipse(ctx, 440, 330, 46, 46, '#ffffff'); ctx.beginPath(); ctx.arc(440, 330, 46, 0, Math.PI * 2); }, 3);
    vellipse(ctx, 440, 330, 34, 34, '#ffd27a');
    for (let i = 0; i < 14; i++) vellipse(ctx, 440 + (rnd() - 0.5) * 50, 330 + (rnd() - 0.5) * 50, 4, 3, '#b8743a');
    for (let i = 0; i < 9; i++) vellipse(ctx, 380 + rnd() * 120, 380 + rnd() * 80, 4, 3, '#b8743a');
    for (const side of [0, W - 36]) {
      outlined(ctx, () => { roundRect(ctx, side, 120, 36, 620, 6); const g = ctx.createLinearGradient(side, 0, side + 36, 0); g.addColorStop(0, '#d9c39f'); g.addColorStop(1, '#b89f78'); ctx.fillStyle = g; ctx.fill(); roundRect(ctx, side, 120, 36, 620, 6); }, 3);
      for (let y = 180; y < 720; y += 120) vellipse(ctx, side + 18, y, 4, 4, '#8a7050');
    }
  } else {
    for (const [x, y] of [[44, 230], [478, 380], [36, 580]] as const) {
      outlined(ctx, () => { roundRect(ctx, x - 32, y - 32, 64, 64, 4); const g = ctx.createLinearGradient(x - 32, y - 32, x + 32, y + 32); g.addColorStop(0, '#d39b62'); g.addColorStop(1, '#9c6a3a'); ctx.fillStyle = g; ctx.fill(); roundRect(ctx, x - 32, y - 32, 64, 64, 4); }, 3);
      ctx.fillStyle = '#e8c79a'; ctx.fillRect(x - 32, y - 5, 64, 10);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    for (const [cx, cy, sx, sy] of [[0, 100, 1, 1], [W, 100, -1, 1]] as const) {
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 110 * Math.cos(i * 0.3), cy + sy * 110 * Math.sin(i * 0.3)); ctx.stroke(); }
      for (let r2 = 25; r2 < 110; r2 += 22) { ctx.beginPath(); ctx.arc(cx, cy, r2, sx > 0 ? 0 : Math.PI / 2, sx > 0 ? Math.PI / 2 : Math.PI); ctx.stroke(); }
    }
  }
  ctx.restore();
  // 흩어진 장난감·털·부스러기
  const toyCols = ['#ff7eb6', '#7ec8ff', '#ffd84d', '#9be38a'];
  for (let i = 0; i < 3; i++) propYarn(ctx, 40 + rnd() * (W - 80), 200 + rnd() * 460, 9 + rnd() * 4, toyCols[i % 4], rnd);
  for (let i = 0; i < 2; i++) propMouseToy(ctx, 50 + rnd() * (W - 100), 180 + rnd() * 480, rnd() * 6);
  propSock(ctx, 60 + rnd() * (W - 120), 220 + rnd() * 400, rnd() * 6, toyCols[Math.floor(rnd() * 4)]);
  for (let i = 0; i < 3; i++) propFeather(ctx, 40 + rnd() * (W - 80), 160 + rnd() * 500, rnd() * 6, toyCols[Math.floor(rnd() * 4)]);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 18; i++) {
    const hx = rnd() * W;
    const hy = 140 + rnd() * 560;
    for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + (rnd() - 0.5) * 10, hy + 4, hx + (rnd() - 0.5) * 14, hy + (rnd() - 0.5) * 10); ctx.stroke(); }
  }
  // 바닥 긁힌 자국
  ctx.strokeStyle = 'rgba(60,30,20,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const sx = 30 + rnd() * (W - 60);
    const sy = 150 + rnd() * 500;
    for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(sx + j * 6, sy); ctx.lineTo(sx + j * 6 + 10, sy + 26); ctx.stroke(); }
  }
  // 창문 햇살
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x0 = 120 + i * 120;
    const g = ctx.createLinearGradient(x0, 100, x0 + 160, h * 0.75);
    g.addColorStop(0, 'rgba(255,240,200,0.12)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, 90); ctx.lineTo(x0 + 70, 90); ctx.lineTo(x0 + 250, h * 0.8); ctx.lineTo(x0 + 140, h * 0.8); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(W / 2, h * 0.45, h * 0.25, W / 2, h * 0.45, h * 0.75);
  vg.addColorStop(0, 'rgba(30,10,20,0)');
  vg.addColorStop(1, 'rgba(30,10,20,0.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, h);
  // 위쪽 벽 (벽지 + 걸레받이 + 구멍)
  const wg = ctx.createLinearGradient(0, 0, 0, CONFIG.fieldTop);
  wg.addColorStop(0, shadeHex(f.wall, -0.1));
  wg.addColorStop(1, f.wall);
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, W, CONFIG.fieldTop - 18);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 12; x < W; x += 26) for (let y = 10; y < CONFIG.fieldTop - 24; y += 22) { ctx.beginPath(); ctx.arc(x + ((y / 22) % 2) * 13, y, 3, 0, Math.PI * 2); ctx.fill(); }
  const bg = ctx.createLinearGradient(0, CONFIG.fieldTop - 24, 0, CONFIG.fieldTop - 10);
  bg.addColorStop(0, '#fffaf2'); bg.addColorStop(1, '#d8c8b4');
  ctx.fillStyle = bg;
  ctx.fillRect(0, CONFIG.fieldTop - 24, W, 14);
  ctx.fillStyle = 'rgba(40,20,20,0.25)';
  ctx.fillRect(0, CONFIG.fieldTop - 10, W, 6);
  for (const hx of [90, 270, 450]) {
    ctx.fillStyle = '#d8c8b4';
    ctx.beginPath(); ctx.ellipse(hx, CONFIG.fieldTop - 10, 42, 30, 0, Math.PI, 0); ctx.fill();
    const hg = ctx.createRadialGradient(hx, CONFIG.fieldTop - 8, 4, hx, CONFIG.fieldTop - 8, 36);
    hg.addColorStop(0, '#0a0508'); hg.addColorStop(1, '#3a2228');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(hx, CONFIG.fieldTop - 10, 36, 25, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(hx, CONFIG.fieldTop - 10, 36, 25, 0, Math.PI, 0); ctx.stroke();
  }
  // 바리케이드 뒤 집 안
  const g = ctx.createLinearGradient(0, CONFIG.barricadeY, 0, h);
  g.addColorStop(0, '#fff1e0'); g.addColorStop(1, '#ecd0b4');
  ctx.fillStyle = g;
  ctx.fillRect(0, CONFIG.barricadeY + 20, W, h - CONFIG.barricadeY - 20);
  ctx.strokeStyle = 'rgba(150,100,60,0.15)';
  ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 45) { ctx.beginPath(); ctx.moveTo(x, CONFIG.barricadeY + 20); ctx.lineTo(x, h); ctx.stroke(); }
  return c;
}

function drawField(ctx: Ctx, area: Area, t: number): void {
  const tr = ctx.getTransform();
  const k = Math.min(3, Math.max(1, Math.round(Math.hypot(tr.a, tr.b) * 2) / 2));
  const key = `${area}:${CONFIG.height}:${CONFIG.barricadeY}:${k}`;
  let c = floorCache.get(key);
  if (!c) { c = buildFloor(area, CONFIG.height, k); floorCache.set(key, c); }
  ctx.drawImage(c, 0, 0, W, CONFIG.height);
  // 구멍 속 눈빛 (깜빡임)
  for (const hx of [90, 270, 450]) {
    const blink = Math.sin(t * 2 + hx) > 0.9 ? 0.2 : 1;
    ellipse(ctx, hx - 9, CONFIG.fieldTop - 20, 3.5, 3.5 * blink, '#ffdf5e');
    ellipse(ctx, hx + 9, CONFIG.fieldTop - 20, 3.5, 3.5 * blink, '#ffdf5e');
  }
}

function drawDecals(ctx: Ctx, decals: Decal[]): void {
  for (const d of decals) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (12 - d.t) / 3);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = d.r * (0.7 + 0.35 * Math.sin(d.seed + i * 2.3));
      const px = d.x + Math.cos(a) * rr;
      const py = d.y + Math.sin(a) * rr * 0.75;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = d.seed + i * 2.1;
      circle(ctx, d.x + Math.cos(a) * d.r * 1.4, d.y + Math.sin(a) * d.r, d.r * 0.18, d.color);
    }
    ctx.restore();
  }
}

function drawBarricade(ctx: Ctx, game: Game, t: number): void {
  const ratio = game.hp / game.maxHp;
  const y = CONFIG.barricadeY - 6;
  const items = ['cushion', 'box', 'books', 'cushion', 'box', 'cushion', 'books', 'box', 'cushion'];
  const w = W / items.length;
  ctx.save();
  if (game.hitFlash > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
  // 바리케이드 그림자
  ctx.fillStyle = 'rgba(40,20,20,0.3)';
  ctx.fillRect(0, y + 44, W, 14);
  items.forEach((kind, i) => {
    const x = i * w;
    const jitter = Math.sin(i * 7.3) * 4;
    if (kind === 'cushion') {
      const col = ['#ff9fb7', '#a6d8ff', '#ffe08a'][i % 3];
      roundRect(ctx, x + 1, y - 6 + jitter, w - 2, 58, 20);
      const g = ctx.createLinearGradient(0, y - 6 + jitter, 0, y + 52 + jitter);
      g.addColorStop(0, shadeHex(col, 0.35)); g.addColorStop(0.5, col); g.addColorStop(1, shadeHex(col, -0.25));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.setLineDash([4, 4]);
      roundRect(ctx, x + 7, y + 1 + jitter, w - 14, 44, 14);
      ctx.strokeStyle = shadeHex(col, -0.35); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
      vellipse(ctx, x + w / 2, y + 23 + jitter, 6, 6, col);
      ctx.fillStyle = '#ffffffaa';
      ctx.beginPath(); ctx.ellipse(x + 16, y + 4 + jitter, 10, 4, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (kind === 'box') {
      const top = y - 16 + jitter;
      roundRect(ctx, x + 2, top, w - 4, 68, 3);
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#d9a46a'); g.addColorStop(1, '#a8743f');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#e6b882';
      ctx.fillRect(x + 4, top + 2, w - 8, 12);
      ctx.fillStyle = 'rgba(255,240,200,0.8)';
      ctx.fillRect(x + w / 2 - 5, top, 10, 68);
      ctx.strokeStyle = 'rgba(90,50,20,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 4, top + 14); ctx.lineTo(x + w - 4, top + 14); ctx.stroke();
      ctx.fillStyle = 'rgba(90,50,20,0.55)';
      ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('냥', x + w / 2 + 14, top + 46);
      ctx.beginPath(); ctx.arc(x + w / 2 - 15, top + 42, 4, 0, Math.PI * 2); ctx.fill();
      for (const [dx, dy] of [[-4, -5], [0, -7], [4, -5]]) { ctx.beginPath(); ctx.arc(x + w / 2 - 15 + dx, top + 42 + dy, 1.8, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ['#6aa0ff', '#ff7a7a', '#7ad99a'].forEach((c, j) => {
        const by = y + 34 - j * 17 + jitter;
        roundRect(ctx, x + 3 + j * 2, by, w - 8 - j * 3, 17, 3);
        const g = ctx.createLinearGradient(0, by, 0, by + 17);
        g.addColorStop(0, shadeHex(c, 0.3)); g.addColorStop(1, shadeHex(c, -0.2));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff6e0';
        ctx.fillRect(x + w - 12 - j * 3, by + 2, 4, 13);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + 8 + j * 2, by + 6, 20, 3);
      });
    }
  });
  if (game.squad.some((m) => m.level > 0 && m.weapon.kind === 'guard')) {
    for (const px of [W * 0.25, W * 0.5, W * 0.75]) {
      roundRect(ctx, px - 11, y - 34, 22, 84, 5);
      ctx.fillStyle = '#3b2228'; ctx.fill();
      roundRect(ctx, px - 9, y - 32, 18, 80, 4);
      ctx.fillStyle = '#e2c38f'; ctx.fill();
      ctx.strokeStyle = '#b8935a';
      ctx.lineWidth = 1.5;
      for (let yy = y - 28; yy < y + 46; yy += 5) { ctx.beginPath(); ctx.moveTo(px - 9, yy); ctx.lineTo(px + 9, yy + 2); ctx.stroke(); }
      ellipse(ctx, px, y - 36, 14, 6, '#3b2228');
      ellipse(ctx, px, y - 37, 12, 4.5, '#9fd8a0');
    }
  }
  // 손상 표시
  if (ratio < 0.6) {
    ctx.strokeStyle = 'rgba(60,30,20,0.55)';
    ctx.lineWidth = 2;
    const n = Math.round((0.6 - ratio) * 20);
    for (let i = 0; i < n; i++) {
      const x = (i * 97) % W + 10;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 8, y + 18); ctx.lineTo(x + 2, y + 30); ctx.stroke();
    }
  }
  if (game.hitFlash > 0) { ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(0, y - 14, W, 66); }
  ctx.restore();
  void t;
}

// ───────────────────────── 적 (위에서 본 모습, 아래로 이동) ─────────────────────────

// 적 그림을 애니메이션 프레임별로 한 번만 만화 스타일로 그려두고 재사용한다
const enemySprites = new Map<string, { c: HTMLCanvasElement; box: { x: number; y: number; w: number; h: number } }>();

function enemySprite(ctx: Ctx, d: EnemyDef, frame: number, tint = false) {
  const tr = ctx.getTransform();
  const k = Math.min(4, Math.max(1, Math.round(Math.hypot(tr.a, tr.b) * 2) / 2));
  const key = `${d.id}:${frame}:${k}:${tint ? 1 : 0}`;
  let sp = enemySprites.get(key);
  if (sp) return sp;
  const s = d.size;
  const box = { x: -s * 2.4, y: -s * 2.5, w: s * 4.8, h: s * 5.1 };
  const c = document.createElement('canvas');
  c.width = Math.ceil(box.w * k + 8);
  c.height = Math.ceil(box.h * k + 8);
  const cc = c.getContext('2d')!;
  cc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  const period = (Math.PI * 2) / Math.max(1, d.speed / 4);
  const t = frame >= 6 ? 0 : (frame / 6) * period;
  drawToon(cc, 'enemy-build', box, (g) => drawEnemyBody(g, d, t, frame < 6), { width: Math.max(1.1, s * 0.09), outline: '#2b1a22' });
  if (tint) {
    // 맞았을 때: 붉게 빛나는 버전
    cc.setTransform(1, 0, 0, 1, 0, 0);
    cc.globalCompositeOperation = 'source-atop';
    cc.fillStyle = 'rgba(255,70,60,0.62)';
    cc.fillRect(0, 0, c.width, c.height);
    cc.globalCompositeOperation = 'lighter';
    cc.fillStyle = 'rgba(255,200,120,0.18)';
    cc.fillRect(0, 0, c.width, c.height);
    cc.globalCompositeOperation = 'source-over';
  }
  sp = { c, box: { x: box.x, y: box.y, w: c.width / k, h: c.height / k } };
  enemySprites.set(key, sp);
  return sp;
}

function drawEnemyBody(ctx: Ctx, d: EnemyDef, t: number, moving: boolean): void {
  const s = d.size;
  const leg = moving ? Math.sin(t * (d.speed / 4)) : 0;

  switch (d.id) {
    case 'mouse':
    case 'ratking': {
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = s * 0.13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.9);
      ctx.quadraticCurveTo(Math.sin(t * 5) * s * 0.8, -s * 1.6, Math.sin(t * 5 + 1) * s * 0.4, -s * 2.1);
      ctx.stroke();
      for (const dx of [-1, 1]) {
        vellipse(ctx, dx * s * 0.55, -s * 0.3 + leg * dx * 3, s * 0.18, s * 0.12, d.accent);
        vellipse(ctx, dx * s * 0.5, s * 0.45 - leg * dx * 3, s * 0.16, s * 0.11, d.accent);
      }
      vellipse(ctx, 0, 0, s * 0.68, s * 0.95, d.color);
      vellipse(ctx, -s * 0.45, s * 0.45, s * 0.34, s * 0.34, d.color);
      vellipse(ctx, s * 0.45, s * 0.45, s * 0.34, s * 0.34, d.color);
      vellipse(ctx, -s * 0.45, s * 0.45, s * 0.22, s * 0.22, d.accent);
      vellipse(ctx, s * 0.45, s * 0.45, s * 0.22, s * 0.22, d.accent);
      vellipse(ctx, 0, s * 0.8, s * 0.42, s * 0.48, d.color);
      vellipse(ctx, -s * 0.17, s * 0.85, s * 0.09, s * 0.11, '#1e1420');
      vellipse(ctx, s * 0.17, s * 0.85, s * 0.09, s * 0.11, '#1e1420');
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-s * 0.14, s * 0.81, s * 0.035, 0, Math.PI * 2); ctx.arc(s * 0.2, s * 0.81, s * 0.035, 0, Math.PI * 2); ctx.fill();
      vellipse(ctx, 0, s * 1.22, s * 0.1, s * 0.08, '#ff6f91');
      ctx.strokeStyle = '#5558';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 1.15); ctx.lineTo(-s * 0.6, s * 1.25);
      ctx.moveTo(s * 0.12, s * 1.15); ctx.lineTo(s * 0.6, s * 1.25);
      ctx.stroke();
      if (d.id === 'ratking') {
        ctx.fillStyle = '#ffd84d';
        const cy = s * 0.42;
        ctx.beginPath();
        ctx.moveTo(-s * 0.35, cy); ctx.lineTo(-s * 0.4, cy - s * 0.35); ctx.lineTo(-s * 0.18, cy - s * 0.15);
        ctx.lineTo(0, cy - s * 0.45); ctx.lineTo(s * 0.18, cy - s * 0.15); ctx.lineTo(s * 0.4, cy - s * 0.35);
        ctx.lineTo(s * 0.35, cy); ctx.closePath(); ctx.fill();
        vcircle(ctx, 0, cy - s * 0.12, s * 0.06, '#e8384f');
        ctx.strokeStyle = '#1e1420';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, s * 0.68); ctx.lineTo(-s * 0.08, s * 0.76);
        ctx.moveTo(s * 0.3, s * 0.68); ctx.lineTo(s * 0.08, s * 0.76);
        ctx.stroke();
      }
      break;
    }
    case 'roach': {
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        for (const dx of [-1, 1]) {
          const ph = leg * (i % 2 ? 1 : -1) * dx * 4;
          ctx.beginPath(); ctx.moveTo(dx * s * 0.4, i * s * 0.4); ctx.lineTo(dx * s * 1.0, i * s * 0.55 + ph); ctx.stroke();
        }
      }
      vellipse(ctx, 0, 0, s * 0.62, s * 1.05, d.color);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, s * 0.5); ctx.stroke();
      vellipse(ctx, 0, s * 0.85, s * 0.36, s * 0.3, d.accent);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(-s * 0.25, -s * 0.35, s * 0.12, s * 0.45, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 1.05); ctx.quadraticCurveTo(-s * 0.9, s * 1.6, -s * (0.8 + Math.sin(t * 9) * 0.2), s * 2.2);
      ctx.moveTo(s * 0.15, s * 1.05); ctx.quadraticCurveTo(s * 0.9, s * 1.6, s * (0.8 + Math.cos(t * 9) * 0.2), s * 2.2);
      ctx.stroke();
      break;
    }
    case 'ant': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        for (const dx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(0, i * s * 0.25); ctx.lineTo(dx * s * 1.0, i * s * 0.5 + leg * dx * 2); ctx.stroke();
        }
      }
      vcircle(ctx, 0, -s * 0.75, s * 0.58, d.color);
      vcircle(ctx, 0, 0, s * 0.36, d.color);
      vcircle(ctx, 0, s * 0.68, s * 0.46, d.color);
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 1.0); ctx.lineTo(-s * 0.6, s * 1.6);
      ctx.moveTo(s * 0.2, s * 1.0); ctx.lineTo(s * 0.6, s * 1.6);
      ctx.stroke();
      vcircle(ctx, 0, -s * 0.85, s * 0.17, d.accent);
      break;
    }
    case 'mosquito': {
      const flap = Math.sin(t * 50) * 0.35;
      ctx.fillStyle = 'rgba(220,240,255,0.65)';
      ctx.beginPath(); ctx.ellipse(-s * 0.8, -s * 0.1, s * 0.85, s * 0.32, -0.3 + flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.8, -s * 0.1, s * 0.85, s * 0.32, 0.3 - flap, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1;
      for (const dx of [-1, 1]) for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(0, -s * 0.2 + i * s * 0.2); ctx.lineTo(dx * s * 1.1, -s * 0.6 + i * s * 0.7); ctx.stroke();
      }
      vellipse(ctx, 0, -s * 0.5, s * 0.22, s * 0.75, d.color);
      ctx.strokeStyle = d.accent; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.9 + i * s * 0.25); ctx.lineTo(s * 0.2, -s * 0.9 + i * s * 0.25); ctx.stroke(); }
      vcircle(ctx, 0, s * 0.35, s * 0.3, d.color);
      vcircle(ctx, -s * 0.12, s * 0.42, s * 0.1, '#e05b5b');
      vcircle(ctx, s * 0.12, s * 0.42, s * 0.1, '#e05b5b');
      ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, s * 0.6); ctx.lineTo(0, s * 1.5); ctx.stroke();
      break;
    }
    case 'spider': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 4; i++) {
        for (const dx of [-1, 1]) {
          const a = (-0.6 + i * 0.42) + (moving ? Math.sin(t * 10 + i) * 0.12 : 0);
          const kx = Math.cos(a) * s * 1.0 * dx;
          const ky = Math.sin(a) * s * 1.0;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(kx, ky - s * 0.3);
          ctx.lineTo(kx * 1.6, ky * 1.5 + s * 0.2);
          ctx.stroke();
        }
      }
      vcircle(ctx, 0, -s * 0.55, s * 0.75, d.color);
      vcircle(ctx, 0, -s * 0.6, s * 0.3, d.accent);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.85, s * 0.18, s * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
      vcircle(ctx, 0, s * 0.35, s * 0.48, d.color);
      for (const [ex, ey] of [[-0.18, 0.55], [0.18, 0.55], [-0.3, 0.42], [0.3, 0.42]] as const) vcircle(ctx, s * ex, s * ey, s * 0.08, '#ff5f6d');
      break;
    }
  }
}


function drawEnemy(ctx: Ctx, e: Enemy): void {
  const d = e.def;
  const s = d.size;
  const t = e.animT;
  const moving = !e.attacking && e.stunT <= 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  ellipse(ctx, d.flying ? 6 : 0, d.flying ? s * 1.4 : s * 0.4, s * 0.9, s * 0.45, 'rgba(40,20,10,0.22)');
  if (e.dead) {
    const k = e.deathT / 0.45;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.scale(1 + k * 0.4, 1 - k * 0.5);
  }
  if (e.attacking && !e.dead) ctx.translate(0, Math.sin(t * 18) * 2);
  const frame = moving ? Math.floor(((t * (d.speed / 4)) / (Math.PI * 2)) * 6) % 6 : 6;
  const spr = enemySprite(ctx, d, frame, e.hitFlash > 0 && !e.dead);
  ctx.drawImage(spr.c, spr.box.x, spr.box.y, spr.box.w, spr.box.h);
  ctx.restore();

  if (!e.dead) {
    if (e.stunT > 0) for (let i = 0; i < 3; i++) {
      const a = e.animT * 5 + (i * Math.PI * 2) / 3;
      text(ctx, '★', e.x + Math.cos(a) * s * 0.9, e.y - s * 1.2 + Math.sin(a) * 4, 10, '#ffe14d', 'center', false);
    }
    if (e.slowT > 0) {
      heart(ctx, e.x + Math.sin(e.animT * 4) * s * 0.6, e.y - s * 1.5, 9);
    }
    if (e.hp < e.maxHp && !e.def.boss) {
      const w = Math.max(20, s * 1.8);
      ctx.fillStyle = 'rgba(30,15,30,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - s * 1.35 - 5, w, 4);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(e.x - w / 2, e.y - s * 1.35 - 5, (w * e.hp) / e.maxHp, 4);
    }
  }
}

// ───────────────────────── 고양이 부대 ─────────────────────────

function drawSquad(ctx: Ctx, game: Game, t: number): void {
  const order = [...game.squad].sort((a, b) => a.y - b.y);
  for (const m of order) {
    const sleeping = m.level === 0;
    const s = m.slot === 0 ? 40 : 33;
    ellipse(ctx, m.x, m.y + 2, s * 1.0, s * 0.3, 'rgba(60,30,10,0.2)');
    if (m.wakeFx > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, m.wakeFx);
      const g = ctx.createRadialGradient(m.x, m.y - s, 4, m.x, m.y - s, s * 2.4);
      g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(m.x - s * 2.5, m.y - s * 3.5, s * 5, s * 5);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(m.x, m.y);
    if (sleeping) ctx.globalAlpha = 0.7;
    const art = getArt(m.def.id, 'back');
    if (art) {
      const h = s * 3.4;
      const w = (art.naturalWidth / art.naturalHeight) * h;
      ctx.drawImage(art, -w / 2, -h + s * 0.15 - m.swing * 4, w, h);
    } else {
      // 공격할 때 살짝 찌그러졌다 펴지는 탄성
      ctx.scale(1 + m.swing * 0.1, 1 - m.swing * 0.08);
      drawCatBackToon(ctx, `sq${m.slot}`, m.def.look, s, t + m.slot, { sleep: sleeping, swing: m.swing });
    }
    ctx.restore();
    if (!sleeping && m.swing > 0.6) {
      const fy = m.y - s * 2.6;
      ctx.save();
      ctx.globalAlpha = (m.swing - 0.6) * 2.5;
      const g = ctx.createRadialGradient(m.x + s * 0.3, fy, 2, m.x + s * 0.3, fy, s * 0.9);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.4, m.weapon.color); g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x + s * 0.3, fy, s * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (!sleeping && m.weapon.fx === 'notes') {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        text(ctx, i % 2 ? '♪' : '♫', m.x - 20 + i * 20 + Math.sin(t * 3 + i) * 6, m.y - s * 2.6 - k * 50, 16, ['#ff8fb4', '#ffd84d', '#9fd8ff'][i], 'center');
        ctx.restore();
      }
    }
    if (sleeping) {
      const k = (t * 0.6 + m.slot * 0.3) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      text(ctx, 'z', m.x + 14 + k * 10, m.y - s * 2.2 - k * 22, 12 + k * 6, '#ffffff');
      ctx.restore();
    } else if (m.slot !== 0) {
      text(ctx, `Lv.${m.level}`, m.x, m.y + 12, 12, '#fff7d0');
    }
  }
  for (const m of game.squad) {
    if (!m.speech) continue;
    const s = m.slot === 0 ? 40 : 33;
    ctx.save();
    ctx.globalAlpha = Math.min(1, m.speech.t * 3);
    ctx.font = `bold 13px ${FONT}`;
    const tw = ctx.measureText(m.speech.text).width + 20;
    const bx = Math.max(6, Math.min(W - tw - 6, m.x - tw / 2));
    const by = m.y - s * 3.3 - 30;
    roundRect(ctx, bx, by, tw, 28, 8);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    ctx.strokeStyle = '#3b2228';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fffdf8';
    ctx.beginPath(); ctx.moveTo(m.x - 6, by + 27); ctx.lineTo(m.x + 6, by + 27); ctx.lineTo(m.x, by + 36); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(m.x - 6, by + 28); ctx.lineTo(m.x, by + 36); ctx.lineTo(m.x + 6, by + 28); ctx.stroke();
    text(ctx, m.speech.text, bx + tw / 2, by + 14, 13, '#3b2228', 'center', false);
    ctx.restore();
  }
  if (game.rallyT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 10);
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(0, CONFIG.barricadeY + 40, W, CONFIG.height - CONFIG.barricadeY);
    ctx.restore();
  }
}

// ───────────────────────── 투사체 / 효과 ─────────────────────────

function drawShots(ctx: Ctx, game: Game): void {
  for (const s of game.shots) {
    if (s.kind === 'roll') {
      // 캣휠
      const R = s.radius;
      ctx.save();
      ctx.translate(s.x, s.y);
      ellipse(ctx, 0, R * 0.95, R * 0.9, R * 0.22, 'rgba(60,30,10,0.25)');
      ctx.lineWidth = R * 0.2;
      ctx.strokeStyle = '#3b2228';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = R * 0.14;
      ctx.strokeStyle = '#d9a46a';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.35;
      circle(ctx, 0, 0, R * 0.9, '#fff3e0');
      ctx.globalAlpha = 1;
      ctx.rotate(-s.spin * 0.6);
      ctx.strokeStyle = '#a8743f';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a2 = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a2) * R * 0.9, Math.sin(a2) * R * 0.9); ctx.stroke(); }
      ctx.strokeStyle = '#f4a24c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a2 = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.arc(0, 0, R, a2, a2 + 0.15); ctx.stroke(); }
      circle(ctx, 0, 0, R * 0.22, '#3b2228');
      circle(ctx, 0, 0, R * 0.17, '#ffcf5a');
      ctx.restore();
      continue;
    }
    if (s.kind === 'web') {
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 30); ctx.lineTo(s.x, s.y); ctx.stroke();
      circle(ctx, s.x, s.y, s.radius, '#ffffff');
      continue;
    }
    if (s.trail && s.trail.length) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const pts = [...s.trail, { x: s.x, y: s.y }];
      for (let i = 1; i < pts.length; i++) {
        const kk = i / pts.length;
        ctx.strokeStyle = s.color;
        ctx.globalAlpha = 0.5 * kk;
        ctx.lineWidth = s.radius * 1.6 * kk;
        ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
      }
      const gl = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2.6);
      gl.addColorStop(0, 'rgba(255,255,230,0.55)'); gl.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    const a = Math.atan2(s.vy, s.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a);
    ctx.globalAlpha = 0.3;
    ellipse(ctx, -s.radius * 1.8, 0, s.radius * 2.2, s.radius * 0.6, s.color);
    ctx.globalAlpha = 1;
    if (s.style === 'paw') {
      // 젤리 발바닥
      ctx.rotate(Math.PI / 2);
      const r = s.radius * 1.5;
      ellipse(ctx, 0, r * 0.25, r * 0.62, r * 0.5, '#3b2228');
      ellipse(ctx, 0, r * 0.25, r * 0.52, r * 0.4, '#ffd9c2');
      ellipse(ctx, 0, r * 0.3, r * 0.3, r * 0.22, '#ff8fab');
      for (const [dx, dy] of [[-0.48, -0.3], [-0.17, -0.6], [0.17, -0.6], [0.48, -0.3]] as const) {
        ellipse(ctx, dx * r, dy * r, r * 0.2, r * 0.24, '#3b2228');
        ellipse(ctx, dx * r, dy * r, r * 0.15, r * 0.18, '#ff8fab');
      }
    } else if (s.style === 'yarn') {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-s.radius, 0); ctx.quadraticCurveTo(-s.radius * 3, s.radius * Math.sin(s.spin), -s.radius * 5, 0); ctx.stroke();
      circle(ctx, 0, 0, s.radius + 1.5, '#3b2228');
      circle(ctx, 0, 0, s.radius, s.color);
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, s.radius * 0.75, s.spin + i * 2.1, s.spin + i * 2.1 + 1.4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-s.radius * 0.7, -s.radius * 0.5); ctx.lineTo(s.radius * 0.7, s.radius * 0.5); ctx.stroke();
    } else {
      // 할퀴기 (///)
      ctx.globalAlpha = 0.45;
      circle(ctx, 0, 0, s.radius * 1.5, s.color);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (const dy of [-1, 0, 1]) {
        ctx.beginPath(); ctx.moveTo(-s.radius * 0.9, dy * s.radius * 0.75 - s.radius * 0.5); ctx.lineTo(s.radius * 0.9, dy * s.radius * 0.75 + s.radius * 0.5); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function pawPrint(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ellipse(ctx, x, y + r * 0.2, r * 0.55, r * 0.45, color);
  for (const [dx, dy] of [[-0.55, -0.35], [-0.2, -0.65], [0.2, -0.65], [0.55, -0.35]] as const) ellipse(ctx, x + dx * r, y + dy * r, r * 0.2, r * 0.24, color);
}

function drawFields(ctx: Ctx, game: Game, t: number): void {
  for (const f of game.fields) {
    const a = Math.min(1, f.t * 4, (f.life - f.t) * 2);
    ctx.save();
    ctx.globalAlpha = a * 0.22;
    circle(ctx, f.x, f.y, f.r, '#ff9fd0');
    ctx.globalAlpha = a * 0.7;
    ctx.strokeStyle = '#ffd0ec';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, t, t + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 낚싯줄 + 깃털
    const bob = Math.sin(t * 6) * 8;
    const fx = f.x + Math.sin(t * 2.3) * 10;
    const fy = f.y + bob;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#4a3a40';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.sx, f.sy); ctx.quadraticCurveTo((f.sx + fx) / 2 + 30, Math.min(f.sy, fy) - 80, fx, fy - 18); ctx.stroke();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(t * 8) * 0.4);
    for (const [col, ang] of [['#ff6fae', -0.5], ['#ffd84d', 0], ['#6fd0ff', 0.5]] as const) {
      ctx.save();
      ctx.rotate(ang);
      ellipse(ctx, 0, 0, 5, 16, '#3b2228');
      ellipse(ctx, 0, 0, 4, 14.5, col);
      ctx.restore();
    }
    circle(ctx, 0, -14, 5, '#3b2228');
    circle(ctx, 0, -14, 4, '#fff');
    ctx.restore();
  }
  for (const s of game.slams) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ff5a5a';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.6 + s.delay * 0.8), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawFx(ctx: Ctx, game: Game): void {
  for (const f of game.fx) {
    const k = f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    switch (f.kind) {
      case 'beam': {
        // 레이저 포인터
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(f.x - f.r / 2, 0, f.r, f.y);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ff6b81';
        ctx.fillRect(f.x - 4, 0, 8, f.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(f.x - 1.5, 0, 3, f.y);
        const dy = f.y * (1 - k);
        const g = ctx.createRadialGradient(f.x, dy, 1, f.x, dy, 18);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ff2d55'); g.addColorStop(1, 'rgba(255,45,85,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, dy, 18, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'slam':
        pawPrint(ctx, f.x, f.y, f.r * 0.9, 'rgba(120,80,45,0.75)');
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.8 + k * 0.6), 0, Math.PI * 2); ctx.stroke();
        break;
      case 'quake':
        ctx.strokeStyle = '#ffe9b0';
        ctx.lineWidth = 10 * (1 - k) + 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, W * 0.7 * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6), 0, Math.PI, 0); ctx.stroke();
        break;
      case 'snipe': {
        // 방울공
        const kk = Math.min(1, (f.t / f.life) * 3);
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2!, f.y2!); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        const bx = f.x + (f.x2! - f.x) * kk;
        const by = f.y + (f.y2! - f.y) * kk - Math.sin(kk * Math.PI) * 40;
        circle(ctx, bx, by, 9, '#3b2228');
        circle(ctx, bx, by, 7.5, '#ffd84d');
        ctx.fillStyle = '#3b2228';
        ctx.fillRect(bx - 4, by + 1, 8, 1.5);
        circle(ctx, bx, by + 4, 1.6, '#3b2228');
        circle(ctx, bx - 2.5, by - 3, 2, '#fff8');
        if (kk >= 1) { ctx.globalAlpha = 1 - k; circle(ctx, f.x2!, f.y2!, 10 + k * 18, 'rgba(255,240,150,0.5)'); }
        break;
      }
      case 'dash': {
        // 우다다 할퀴기: 줄을 따라 큰 발톱 자국
        ctx.globalAlpha = (1 - k) * 0.25;
        ctx.fillStyle = '#3a2e2a';
        ctx.fillRect(f.x - f.r / 2, f.y2!, f.r, f.y - f.y2!);
        ctx.globalAlpha = 1 - k;
        ctx.lineCap = 'round';
        const reach = (f.y - f.y2!) * Math.min(1, k * 2.5);
        for (const dx of [-0.32, 0, 0.32]) {
          ctx.strokeStyle = '#3b2228';
          ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(f.x + dx * f.r - 8, f.y); ctx.quadraticCurveTo(f.x + dx * f.r + 12, f.y - reach / 2, f.x + dx * f.r - 4, f.y - reach); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(f.x + dx * f.r - 8, f.y); ctx.quadraticCurveTo(f.x + dx * f.r + 12, f.y - reach / 2, f.x + dx * f.r - 4, f.y - reach); ctx.stroke();
        }
        break;
      }
      case 'spark': {
        ctx.globalCompositeOperation = 'lighter';
        const rr = f.r * (0.5 + k);
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + f.x;
          ctx.strokeStyle = f.color;
          ctx.lineWidth = 3 * (1 - k) + 1;
          ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * rr * 0.3, f.y + Math.sin(a) * rr * 0.3); ctx.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); ctx.stroke();
        }
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 0.8);
        g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.8, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'boom': {
        // 겹겹의 불꽃 + 연기
        const grow = 0.45 + Math.min(1, k * 2.2) * 0.75;
        ctx.globalAlpha = 1;
        if (k > 0.35) {
          ctx.globalAlpha = (1 - k) * 0.7;
          for (let i = 0; i < 6; i++) {
            const a = i * 1.1 + f.x * 0.1;
            ellipse(ctx, f.x + Math.cos(a) * f.r * 0.7 * grow, f.y + Math.sin(a) * f.r * 0.55 * grow - k * 10, f.r * 0.45 * grow, f.r * 0.4 * grow, 'rgba(90,80,90,0.55)');
          }
        }
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, 1 - k * 1.3);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + f.y * 0.05;
          const d = f.r * 0.45 * grow;
          const g = ctx.createRadialGradient(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 0, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, f.r * 0.55 * grow);
          g.addColorStop(0, 'rgba(255,220,120,0.95)'); g.addColorStop(0.5, 'rgba(255,120,40,0.7)'); g.addColorStop(1, 'rgba(200,40,20,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, f.r * 0.55 * grow, 0, Math.PI * 2); ctx.fill();
        }
        const core = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 0.6 * grow);
        core.addColorStop(0, 'rgba(255,255,240,1)'); core.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.6 * grow, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'poof': {
        // 뿅! 먼지구름
        const grow = 0.6 + k * 0.9;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + f.y;
          ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(225,215,230,0.85)';
          ctx.beginPath();
          ctx.arc(f.x + Math.cos(a) * f.r * 0.6 * grow, f.y + Math.sin(a) * f.r * 0.45 * grow - k * 8, f.r * 0.42 * (1 - k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        if (k < 0.6) {
          ctx.fillStyle = '#ffe14d';
          for (let i = 0; i < 3; i++) {
            const a = i * 2.1 + f.x;
            text(ctx, '✦', f.x + Math.cos(a) * f.r * 1.3 * grow, f.y + Math.sin(a) * f.r * grow, 10, '#ffe14d', 'center', false);
          }
        }
        break;
      }
      case 'heal':
        for (let i = 0; i < 10; i++) text(ctx, '+', (i + 0.5) * (W / 10), f.y - k * 30 - (i % 2) * 8, 18, f.color, 'center', false);
        break;
      case 'thorns':
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.4; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * f.r * 1.5, f.y + Math.sin(a) * f.r * 1.5); ctx.stroke(); }
        break;
    }
    ctx.restore();
  }
}

// ───────────────────────── HUD ─────────────────────────

function drawButtonBase(ctx: Ctx, r: Rect, enabled: boolean, base: string, radius = 14): void {
  roundRect(ctx, r.x, r.y + 4, r.w, r.h, radius);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fillStyle = enabled ? base : '#8a8090';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = enabled ? '#fff8' : '#fff3';
  ctx.stroke();
}

function fmtTime(sec: number): string {
  const s = Math.ceil(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function drawHud(ctx: Ctx, game: Game, t: number, pressed: string | null): void {
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(30,15,30,0.85)'); g.addColorStop(1, 'rgba(30,15,30,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 64);
  roundRect(ctx, 60, 14, 78, 32, 16); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  text(ctx, game.time >= game.stage.duration ? 'BOSS' : fmtTime(game.timeLeft), 99, 30, 17, game.timeLeft < 15 ? '#ff8a8a' : '#fff');
  text(ctx, `St.${game.stage.no} · ${game.stage.name}`, 306, 30, 17, '#fff');
  // 진행 바
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 56, W - 20, 6);
  ctx.fillStyle = '#ffcf5a';
  ctx.fillRect(10, 56, (W - 20) * game.progress, 6);

  for (const b of HUD_BUTTONS) {
    const r = b.rect;
    ctx.save();
    if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
    if (b.id.type === 'pause') {
      drawButtonBase(ctx, r, true, '#9b7bd6');
      text(ctx, 'Ⅱ', r.x + r.w / 2, r.y + r.h / 2, 18, '#fff');
    } else if (b.id.type === 'speed') {
      drawButtonBase(ctx, r, true, game.speed > 1 ? '#ff9f43' : '#9b7bd6');
      text(ctx, `x${game.speed}`, r.x + r.w / 2, r.y + r.h / 2, 15, '#fff');
    } else if (b.id.type === 'rally') {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const ready = game.canRally();
      circle(ctx, cx, cy + 3, r.w / 2, 'rgba(0,0,0,0.3)');
      circle(ctx, cx, cy, r.w / 2, ready ? '#ffcf5a' : '#8a8090');
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r.w / 2 - 3, 0, Math.PI * 2); ctx.clip();
      iconFace(ctx, game.hero.def.id, cx, cy, r.w / 2 - 3, () => drawFaceAt(ctx, game.hero.def.look, cx, cy + 4, 20, t));
      if (game.rallyCd > 0) {
        ctx.fillStyle = 'rgba(30,15,30,0.6)';
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r.w / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (game.rallyCd / game.heroRally.cd));
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ready ? `rgba(255,255,220,${0.6 + 0.4 * Math.sin(t * 6)})` : '#fff4';
      ctx.beginPath(); ctx.arc(cx, cy, r.w / 2, 0, Math.PI * 2); ctx.stroke();
      text(ctx, game.rallyCd > 0 ? `${Math.ceil(game.rallyCd)}` : '응원!', cx, r.y + r.h + 4, 13, '#fff');
    }
    ctx.restore();
  }

  // 레벨 / 경험치
  roundRect(ctx, 10, 72, 170, 46, 10);
  ctx.fillStyle = 'rgba(140,40,60,0.85)';
  ctx.fill();
  ctx.save();
  roundRect(ctx, 12, 74, 44, 42, 8); ctx.clip();
  ctx.fillStyle = '#ffe1c2'; ctx.fillRect(12, 74, 44, 42);
  iconFace(ctx, game.hero.def.id, 34, 95, 22, () => drawFaceAt(ctx, game.hero.def.look, 34, 100, 15, t));
  ctx.restore();
  text(ctx, `Lv.${game.level}`, 62, 88, 15, '#fff', 'left');
  text(ctx, `${Math.floor(game.xp)}/${game.xpNeed}`, 172, 88, 12, '#ffe0e8', 'right');
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(62, 102, 110, 8);
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(62, 102, (110 * game.xp) / game.xpNeed, 8);

  // 왼쪽: 깨어난 고양이 스킬 목록
  const active = game.squad.filter((m) => m.level > 0);
  active.forEach((m, i) => drawSkillChip(ctx, m, 12, 130 + i * 58, t));
  const gens = (Object.keys(game.generic) as (keyof typeof game.generic)[]).filter((k) => k !== 'snack' && game.generic[k] > 0);
  gens.forEach((k, i) => {
    const y = 130 + (active.length + i) * 58;
    circle(ctx, 36, y + 22, 22, 'rgba(30,15,30,0.7)');
    text(ctx, GENERIC[k].icon, 36, y + 22, 20, '#fff', 'center', false);
    text(ctx, `${game.generic[k]}`, 52, y + 38, 12, '#ffe98a');
  });

  // 보스 체력
  const boss = game.enemies.find((e) => e.def.boss && !e.dead);
  if (boss) {
    roundRect(ctx, 120, 126, 300, 18, 9); ctx.fillStyle = 'rgba(30,15,30,0.75)'; ctx.fill();
    roundRect(ctx, 122, 128, 296 * (boss.hp / boss.maxHp), 14, 7); ctx.fillStyle = '#ff5a6e'; ctx.fill();
    text(ctx, `👑 ${boss.def.name}`, W / 2, 135, 12, '#fff');
  }

  // 하단 바리케이드 체력
  const ratio = Math.max(0, game.hp / game.maxHp);
  roundRect(ctx, 62, CONFIG.height - 38, 420, 24, 12); ctx.fillStyle = 'rgba(40,20,40,0.7)'; ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, 64, CONFIG.height - 36, 416 * ratio, 20, 10);
    ctx.fillStyle = ratio > 0.5 ? '#6fd67a' : ratio > 0.25 ? '#ffc94d' : '#ff6b6b';
    ctx.fill();
  }
  text(ctx, `🛡 ${Math.ceil(game.hp)} / ${game.maxHp}`, W / 2, CONFIG.height - 26, 13, '#fff');
  ctx.save();
  ctx.beginPath(); ctx.arc(34, CONFIG.height - 28, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#bfe6ff'; ctx.fill();
  ctx.clip();
  ctx.translate(34, CONFIG.height - 24);
  ctx.scale(0.7, 0.7);
  drawGirl(ctx, 0, 0, ratio, t);
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(34, CONFIG.height - 28, 24, 0, Math.PI * 2); ctx.stroke();

  if (game.banner && game.banner.t > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.banner.t * 2);
    const bw = Math.min(W - 30, 60 + game.banner.text.length * 18);
    roundRect(ctx, W / 2 - bw / 2, 180, bw, 48, 24);
    ctx.fillStyle = 'rgba(255,95,158,0.92)';
    ctx.fill();
    text(ctx, game.banner.text, W / 2, 204, 19, '#fff');
    ctx.restore();
  }
}

function drawSkillChip(ctx: Ctx, m: Member, x: number, y: number, t: number): void {
  const col = RARITY_COLOR[m.def.rarity];
  circle(ctx, x + 24, y + 22, 24, col);
  ctx.save();
  ctx.beginPath(); ctx.arc(x + 24, y + 22, 21, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#3d2a40'; ctx.fillRect(x, y, 48, 48);
  iconFace(ctx, m.def.id, x + 24, y + 22, 21, () => drawFaceAt(ctx, m.def.look, x + 24, y + 28, 14, t));
  ctx.restore();
  circle(ctx, x + 42, y + 38, 10, '#2a1a22');
  text(ctx, `${m.level}`, x + 42, y + 38, 12, '#ffe98a', 'center', false);
}

// ───────────────────────── 스킬 선택 / 오버레이 ─────────────────────────

function cardInfo(game: Game, c: Card) {
  if (c.type === 'cat') {
    const m = game.squad[c.slot];
    return { title: m.def.skillName, sub: m.def.name, desc: m.weapon.desc[c.next - 1], badge: c.next === 1 ? 'NEW' : `Lv.${c.next}`, color: RARITY_COLOR[m.def.rarity], look: m.def.look as CatLook | null, icon: m.weapon.icon };
  }
  const g = GENERIC[c.id];
  return { title: g.name, sub: c.id === 'snack' ? '회복' : `${game.generic[c.id] + 1}단계`, desc: g.desc, badge: '강화', color: '#7ad99a', look: null as CatLook | null, icon: g.icon };
}

function drawChoice(ctx: Ctx, game: Game, t: number, pressed: string | null): void {
  const off = (CONFIG.height - 960) / 2;
  ctx.fillStyle = 'rgba(25,12,25,0.78)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, 'rgba(160,100,20,0)'); band.addColorStop(0.5, 'rgba(200,140,40,0.95)'); band.addColorStop(1, 'rgba(160,100,20,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 128 + off, W, 46);
  ctx.fillStyle = '#ffdc7a';
  ctx.fillRect(0, 128 + off, W, 2); ctx.fillRect(0, 172 + off, W, 2);
  text(ctx, '스킬 선택', W / 2, 151 + off, 26, '#fff');
  if (game.pendingLevels > 1) text(ctx, `남은 선택 ${game.pendingLevels}`, W / 2, 112 + off, 14, '#ffe98a');

  const pa = game.pickAnim;
  const cards = pa ? [] : game.choice ?? [];
  cards.forEach((c, i) => {
    const r = CHOICE_BUTTONS[i].rect;
    ctx.save();
    if (pressed === `card:${i}`) ctx.translate(0, 4);
    drawCard(ctx, game, c, r, t, 1);
    ctx.restore();
  });

  if (pa) {
    // 고른 카드가 가운데로 커지는 연출
    const k = 1 - pa.t / 0.7;
    const from = CHOICE_BUTTONS[pa.index].rect;
    const ease = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
    const sc = 1 + 0.35 * ease;
    const cx = from.x + from.w / 2 + (W / 2 - from.x - from.w / 2) * ease;
    const cy = from.y + from.h / 2;
    ctx.save();
    ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 260);
    glow.addColorStop(0, 'rgba(255,230,150,0.55)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-260, -260, 520, 520);
    drawCard(ctx, game, pa.card, { x: -from.w / 2, y: -from.h / 2, w: from.w, h: from.h }, t, 1);
    ctx.restore();
    return;
  }

  const rb = CHOICE_BUTTONS[3].rect;
  text(ctx, `이번 전투 갱신 횟수: ${game.rerolls}/${CONFIG.rerolls}`, W / 2, rb.y - 16, 13, '#d9c9d6');
  ctx.save();
  if (pressed === 'reroll') ctx.translate(0, 3);
  drawButtonBase(ctx, rb, game.rerolls > 0, '#3d8fe0', 31);
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 6;
  for (const dx of [26, 44]) { ctx.beginPath(); ctx.moveTo(rb.x + dx, rb.y + rb.h - 6); ctx.lineTo(rb.x + dx + 18, rb.y + 6); ctx.stroke(); }
  for (const dx of [rb.w - 62, rb.w - 44]) { ctx.beginPath(); ctx.moveTo(rb.x + dx, rb.y + rb.h - 6); ctx.lineTo(rb.x + dx + 18, rb.y + 6); ctx.stroke(); }
  text(ctx, '🔄 스킬 갱신', rb.x + rb.w / 2, rb.y + rb.h / 2, 21, '#fff');
  ctx.restore();
}

function drawCard(ctx: Ctx, game: Game, c: Card, r: Rect, t: number, _glow: number): void {
  const info = cardInfo(game, c);
  // 카드 위로 튀어나오는 캐릭터
  if (info.look) {
    ctx.save();
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y - 10, 10, r.x + r.w / 2, r.y - 10, 110);
    g.addColorStop(0, info.color + 'aa'); g.addColorStop(1, info.color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 30, r.y - 130, r.w + 60, 200);
    const art = c.type === 'cat' ? getArt(game.squad[c.slot].def.id, 'card') : null;
    if (art) {
      const h = 150;
      const w = (art.naturalWidth / art.naturalHeight) * h;
      ctx.drawImage(art, r.x + r.w / 2 - w / 2, r.y + 40 - h, w, h);
    } else {
      ctx.translate(r.x + r.w / 2 - 14, r.y + 40);
      ctx.scale(2.9, 2.9);
      drawCatLookToon(ctx, 'card', info.look, 20, { ...IDLE_POSE, t, attacking: true, swing: 0 }, 1.1);
    }
    ctx.restore();
  } else {
    text(ctx, info.icon, r.x + r.w / 2, r.y - 30, 72, '#fff', 'center', false);
  }
  // 카드 본체 (왼쪽 위가 잘린 종이 카드)
  const cut = 54;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + cut);
    ctx.lineTo(r.x + cut, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(0, 6); shape(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.restore();
  shape();
  ctx.fillStyle = '#fbf6ef';
  ctx.fill();
  ctx.save();
  shape(); ctx.clip();
  const top = ctx.createLinearGradient(0, r.y, 0, r.y + 96);
  top.addColorStop(0, info.color); top.addColorStop(1, '#fbf6ef');
  ctx.fillStyle = top;
  ctx.fillRect(r.x, r.y, r.w, 96);
  ctx.restore();
  // 스킬 아이콘
  const ix = r.x + r.w - 42;
  const iy = r.y + 48;
  circle(ctx, ix, iy, 34, '#2a1a22');
  const ig = ctx.createRadialGradient(ix - 8, iy - 10, 4, ix, iy, 32);
  ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, info.color);
  circle(ctx, ix, iy, 30, '#000');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(ix, iy, 30, 0, Math.PI * 2); ctx.fill();
  text(ctx, info.icon, ix, iy + 1, 30, '#fff', 'center', false);
  if (c.type === 'cat' && c.next > 1) {
    circle(ctx, ix + 24, iy + 24, 12, '#1d3b22');
    text(ctx, `${c.next}`, ix + 24, iy + 24, 14, '#ffffff', 'center', false);
  }
  // 배지
  if (info.badge === 'NEW' || info.badge === '강화') {
    const bx = r.x - 6;
    const by = r.y + 84;
    ctx.fillStyle = info.badge === 'NEW' ? '#ffcf3a' : '#7ad99a';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 70, by); ctx.lineTo(bx + 84, by + 13); ctx.lineTo(bx + 70, by + 26); ctx.lineTo(bx, by + 26); ctx.closePath(); ctx.fill();
    text(ctx, info.badge, bx + 36, by + 13, 16, info.badge === 'NEW' ? '#7a3a00' : '#1d3b22', 'center', false);
  }
  // 이름 띠
  ctx.fillStyle = '#5a2c1c';
  ctx.fillRect(r.x, r.y + 112, r.w, 50);
  ctx.fillStyle = '#7a4430';
  ctx.fillRect(r.x, r.y + 112, r.w, 3);
  text(ctx, info.title, r.x + r.w / 2, r.y + 131, 17, '#fff', 'center', false);
  text(ctx, info.sub, r.x + r.w / 2, r.y + 151, 11, '#ffd9a8', 'center', false);
  const lines = wrap(ctx, info.desc, r.w - 18, 14);
  lines.slice(0, 5).forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + 186 + i * 21, 14, '#4a3a40', 'center', false));
}

function drawPause(ctx: Ctx, pressed: string | null): void {
  ctx.fillStyle = 'rgba(25,12,25,0.7)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  text(ctx, '일시정지', W / 2, 340 + (CONFIG.height - 960) / 2, 44, '#fff');
  for (const b of PAUSE_BUTTONS) {
    const r = b.rect;
    ctx.save();
    if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
    const on = sound.sfxOn || sound.musicOn;
    const [col, label] = b.id.type === 'quit' ? ['#c06080', '포기하고 나가기'] : b.id.type === 'sound' ? ['#6aa0e0', on ? '🔊 소리 끄기' : '🔇 소리 켜기'] : ['#8fcf7a', '계속하기'];
    drawButtonBase(ctx, r, true, col);
    text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, 20, '#fff');
    ctx.restore();
  }
}

function drawResult(ctx: Ctx, game: Game, t: number, reward: RewardView | null): void {
  ctx.fillStyle = 'rgba(25,12,25,0.72)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  ctx.save();
  ctx.translate(0, (CONFIG.height - 960) / 2);
  const res = game.result!;
  if (res.victory) {
    text(ctx, '승리! 🎉', W / 2, 250, 56, '#ffe98a');
    for (let i = 0; i < 3; i++) {
      const on = i < res.stars;
      text(ctx, '★', W / 2 - 80 + i * 80, 330, on ? 60 : 48, on ? '#ffd84d' : '#6b5a66');
    }
  } else {
    text(ctx, '패배...', W / 2, 280, 56, '#ff8a8a');
    text(ctx, '고양이를 키우거나 편성을 바꿔서 다시 도전!', W / 2, 345, 17, '#fff');
  }
  text(ctx, `처치 ${res.kills} · 레벨 ${game.level} · ${Math.round(res.progress * 100)}% 진행`, W / 2, 400, 16, '#ffd6e4');
  if (reward) {
    roundRect(ctx, 50, 425, W - 100, 118, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    text(ctx, reward.firstClear ? '첫 클리어 보상' : '보상', W / 2, 452, 15, '#ffe98a');
    const parts = [`🪙 ${reward.coins}`];
    if (reward.tuna > 0) parts.push(`🥫 ${reward.tuna}`);
    if (reward.yarn > 0) parts.push(`🧶 ${reward.yarn}`);
    text(ctx, parts.join('   '), W / 2, 497, 22, '#fff');
    const extra = [`집사 경험치 +${reward.exp}`];
    if (reward.heroShards > 0) extra.push(`치즈 조각 +${reward.heroShards}`);
    if (reward.items.length) extra.push(`장비 ${reward.items.length}개 획득!`);
    if (reward.discovered > 0) extra.push(`첫 발견 ${reward.discovered}종 🥫+${reward.discovered * 10}`);
    text(ctx, extra.join(' · '), W / 2, 527, 13, '#ffe0ec');
  }
  // 고양이별 피해 통계
  const rows = game.squad.filter((m) => m.dealt > 0).sort((a, b) => b.dealt - a.dealt);
  if (rows.length) {
    const top = 562;
    roundRect(ctx, 40, top, W - 80, 30 + rows.length * 30, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    text(ctx, '스킬', 70, top + 15, 12, '#ffe98a', 'left', false);
    text(ctx, '총 피해', 360, top + 15, 12, '#ffe98a', 'right', false);
    text(ctx, '평균 DPS', W - 60, top + 15, 12, '#ffe98a', 'right', false);
    const maxD = rows[0].dealt;
    rows.forEach((m, i) => {
      const y = top + 44 + i * 30;
      ctx.fillStyle = 'rgba(255,207,90,0.18)';
      ctx.fillRect(64, y - 11, (W - 128) * (m.dealt / maxD), 22);
      text(ctx, `${m.weapon.icon} ${m.def.name} · ${m.def.skillName}`, 70, y, 13, '#fff', 'left', false);
      text(ctx, fmtDmg(m.dealt), 360, y, 14, '#fff', 'right', false);
      text(ctx, `${Math.round(m.dealt / Math.max(1, res.time))}`, W - 60, y, 14, '#fff', 'right', false);
    });
  }
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
  text(ctx, '터치해서 로비로', W / 2, rows.length ? 562 + 44 + rows.length * 30 + 30 : 600, 22, '#fff');
  ctx.restore();
  ctx.restore();
}

export function render(ctx: Ctx, game: Game, t: number, pressed: string | null, reward: RewardView | null): void {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * game.shake * 2, (Math.random() - 0.5) * 8 * game.shake * 2);
  drawField(ctx, game.stage.area, t);
  drawDecals(ctx, game.decals);
  drawFields(ctx, game, t);
  const sorted = [...game.enemies].sort((a, b) => (a.def.flying ? 1 : 0) - (b.def.flying ? 1 : 0) || a.y - b.y);
  for (const e of sorted) drawEnemy(ctx, e);
  drawBarricade(ctx, game, t);
  drawSquad(ctx, game, t);
  drawShots(ctx, game);
  drawFx(ctx, game);
  for (const p of game.particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    circle(ctx, p.x, p.y, p.r, p.color);
  }
  ctx.globalAlpha = 1;
  for (const f of game.floats) {
    const age = 0.8 - f.t;
    const pop = age < 0.12 ? 1 + ((0.12 - age) / 0.12) * 0.9 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.t * 2.5);
    ctx.translate(f.x, f.y);
    ctx.scale(pop, pop);
    numText(ctx, f.text, f.size, f.color);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHud(ctx, game, t, pressed);
  if (game.phase !== 'playing') drawResult(ctx, game, t, reward);
  else if (game.choice || game.pickAnim) drawChoice(ctx, game, t, pressed);
  else if (game.paused) drawPause(ctx, pressed);
}

/** 로비용 스테이지 미리보기: 그 스테이지 바닥과 몰려오는 적들 */
export function drawStagePreview(ctx: Ctx, stage: StageDef, w: number, h: number, t: number, locked: boolean): void {
  const sc = w / W;
  const viewH = h / sc;
  ctx.save();
  ctx.scale(sc, sc);
  ctx.translate(0, -30);
  drawField(ctx, stage.area, t);
  let seed = stage.no * 7919 + 13;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const kinds = [...new Set([...Object.keys(stage.early), ...Object.keys(stage.late)])] as EnemyKind[];
  const list: { d: EnemyDef; x: number; y: number; ph: number }[] = [];
  for (let i = 0; i < 16 + stage.no * 2; i++) {
    const d = ENEMIES[kinds[Math.floor(rnd() * kinds.length)]];
    const sp = d.speed * 0.25;
    const y0 = 110 + rnd() * (viewH - 60);
    list.push({ d, x: 30 + rnd() * (W - 60), y: 110 + ((y0 - 110 + t * sp) % (viewH - 40)), ph: rnd() * 6 });
  }
  if (stage.boss) list.push({ d: ENEMIES[stage.boss.kind], x: W / 2, y: 110 + viewH * 0.38, ph: 0 });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    const frame = Math.floor(t * 6 + e.ph) % 6;
    const spr = enemySprite(ctx, e.d, frame);
    ellipse(ctx, e.x, e.y + e.d.size * 0.4, e.d.size * 0.9, e.d.size * 0.4, 'rgba(40,20,10,0.22)');
    ctx.drawImage(spr.c, e.x + spr.box.x, e.y + spr.box.y, spr.box.w, spr.box.h);
  }
  ctx.restore();
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(20,10,20,0)');
  g.addColorStop(1, 'rgba(20,10,20,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (locked) {
    ctx.fillStyle = 'rgba(20,10,20,0.6)';
    ctx.fillRect(0, 0, w, h);
  }
}
