// 세로형 전투 화면 렌더링 — 모든 그래픽은 코드로 그린다 (외부 에셋 없음)
import { drawCatBackToon, drawCatFaceToon, drawCatLookToon, drawToon, ellipse as vellipse, heart, IDLE_POSE, shadeHex } from './catdraw';
import { drawBustArt, drawFaceArtCircle, getArt, getWorld } from './art';
import { sound } from './audio';
import { CAT_BY_ID, HERO_ID, RARITY_COLOR, type CatLook } from './data/cats';
import { CONFIG } from './data/config';
import { ENEMIES, type EnemyDef, type EnemyKind } from './data/enemies';
import { STAGES, type Area, type StageDef } from './data/stages';
const STAGE_COUNT = STAGES.length;
import { GENERIC } from './data/weapons';
import { ULT_CD, ULT_DUR, fmtDmg, type Card, type Decal, type Enemy, type Game, type Member } from './game';
import { CHOICE_BUTTONS, HUD_BUTTONS, PAUSE_BUTTONS, RESULT_BUTTONS, buttonKey, type Rect } from './ui';

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
  bathroom: { a: '#dff2f7', b: '#cfe6ee', tile: true, line: 'rgba(80,130,150,0.2)', wall: '#bfe6f2' },
  balcony: { a: '#d8c9b0', b: '#cbbb9f', tile: true, line: 'rgba(110,90,60,0.2)', wall: '#e8f4d8' },
  garden: { a: '#9fd27a', b: '#93c56f', tile: false, line: 'rgba(40,90,20,0.2)', wall: '#c8a878' },
};

/** 새 지역 그림이 아직 없으면 기존 배경을 색만 바꿔서 임시로 쓴다 */
const BG_FALLBACK: Partial<Record<Area, [Area, string]>> = {
  bathroom: ['kitchen', 'hue-rotate(170deg) saturate(0.9) brightness(1.05)'],
  balcony: ['living', 'hue-rotate(-25deg) saturate(1.1) brightness(1.05)'],
  garden: ['entrance', 'hue-rotate(55deg) saturate(1.4)'],
};
function bgArtFor(area: Area): { img: HTMLImageElement; filter: string; layout: BgLayout } | null {
  const own = getWorld(`bg-${area}`);
  if (own) return { img: own, filter: 'none', layout: layoutFor(area, true) };
  const fb = BG_FALLBACK[area];
  const img = fb ? getWorld(`bg-${fb[0]}`) : null;
  return img && fb ? { img, filter: fb[1], layout: BG_DEFAULT } : null;
}

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

// 배경 그림 구성 비율: 위 벽 띠 / 방 / 집 안 바닥 (그림마다 다름)
interface BgLayout { band: number; split: number; holes: number[]; eyeY: number; }
const BG_DEFAULT: BgLayout = { band: 0.12, split: 0.791, holes: [0.172, 0.5, 0.83], eyeY: 0.085 };
const BG_LAYOUT: Partial<Record<Area, BgLayout>> = {
  bathroom: { band: 0.145, split: 0.831, holes: [0.137, 0.519, 0.883], eyeY: 0.088 },
  balcony: { band: 0.145, split: 0.835, holes: [0.128, 0.5, 0.866], eyeY: 0.088 },
  garden: { band: 0.145, split: 0.836, holes: [0.156, 0.487, 0.819], eyeY: 0.088 },
};
function layoutFor(area: Area, own: boolean): BgLayout {
  return (own && BG_LAYOUT[area]) || BG_DEFAULT;
}

function drawBgArt(ctx: Ctx, img: HTMLImageElement, h: number, L: BgLayout): void {
  ctx.imageSmoothingQuality = 'high';
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const sc = W / iw;
  const band = ih * L.band;
  const split = ih * L.split;
  const roomBottom = CONFIG.barricadeY + 20;
  // 위 벽 띠 (쥐구멍): 비율 그대로
  ctx.drawImage(img, 0, 0, iw, band, 0, 0, W, band * sc);
  // 방 바닥: 화면 높이에 맞춰 위아래로 늘이거나 줄임
  ctx.drawImage(img, 0, band, iw, split - band, 0, band * sc - 0.5, W, roomBottom - band * sc + 1);
  // 집 안 바닥: 모자라면 나무 바닥을 이어 붙인다
  const avail = ih - split;
  let y = roomBottom;
  while (y < h) {
    const take = Math.min(avail, (h - y) / sc);
    ctx.drawImage(img, 0, split, iw, take, 0, y, W, take * sc);
    y += take * sc;
  }
  // 경계 그림자
  const g = ctx.createLinearGradient(0, roomBottom - 6, 0, roomBottom + 18);
  g.addColorStop(0, 'rgba(40,20,20,0)');
  g.addColorStop(1, 'rgba(40,20,20,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, roomBottom - 6, W, 24);
}

function buildFloor(area: Area, h: number, k: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.ceil(W * k);
  c.height = Math.ceil(h * k);
  const ctx = c.getContext('2d')!;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const bgArt = bgArtFor(area);
  if (bgArt) {
    ctx.filter = bgArt.filter;
    drawBgArt(ctx, bgArt.img, h, bgArt.layout);
    ctx.filter = 'none';
    return c;
  }
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
  const bga = bgArtFor(area);
  const art = bga?.img ?? null;
  const key = `${area}:${CONFIG.height}:${CONFIG.barricadeY}:${k}:${art ? art.src.length : 0}`;
  let c = floorCache.get(key);
  if (!c) { c = buildFloor(area, CONFIG.height, k); floorCache.set(key, c); }
  ctx.drawImage(c, 0, 0, W, CONFIG.height);
  // 구멍 속 눈빛 (깜빡임)
  const eyeY = art && bga ? (art.naturalHeight * bga.layout.eyeY * W) / art.naturalWidth : CONFIG.fieldTop - 20;
  for (const hx of art && bga ? bga.layout.holes.map((f) => f * W) : [90, 270, 450]) {
    const blink = Math.sin(t * 2 + hx) > 0.9 ? 0.2 : 1;
    ellipse(ctx, hx - 9, eyeY, 3.5, 3.5 * blink, '#ffdf5e');
    ellipse(ctx, hx + 9, eyeY, 3.5, 3.5 * blink, '#ffdf5e');
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
  const bar = getWorld(ratio > 0.6 ? 'barricade-0' : ratio > 0.3 ? 'barricade-1' : 'barricade-2');
  if (bar) {
    ctx.fillStyle = 'rgba(40,20,20,0.3)';
    ctx.fillRect(0, y + 44, W, 14);
    const bw = W + 16;
    const bh = (bw * bar.naturalHeight) / bar.naturalWidth;
    ctx.drawImage(bar, -8, y + 54 - bh, bw, bh);
    if (game.hitFlash > 0) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(0, y + 54 - bh, W, bh); }
    ctx.restore();
    return;
  }
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

/** tint: false/true(맞음, 붉게) 또는 'white'(쓰러지는 순간 하얗게). variant: 걷기 2번째 동작('b'), 쓰러짐('ko') */
function enemySprite(ctx: Ctx, d: EnemyDef, frame: number, tint: boolean | 'white' = false, variant: '' | 'b' | 'ko' = '') {
  const tr = ctx.getTransform();
  const k = Math.min(4, Math.max(1, Math.round(Math.hypot(tr.a, tr.b) * 2) / 2));
  const art = (variant && getWorld(`enemy-${d.id}-${variant}`)) || getWorld(`enemy-${d.id}`);
  const key = `${d.id}:${frame}:${k}:${tint === 'white' ? 2 : tint ? 1 : 0}:${art ? 1 : 0}:${variant}`;
  let sp = enemySprites.get(key);
  if (sp) return sp;
  const s = d.size;
  if (art) {
    // 일러스트 적: 프레임마다 뒤뚱뒤뚱(기울기+통통 튐)을 구워 둔다
    const h = s * (d.boss ? 3.6 : d.flying ? 3.4 : 3.3);
    const w = (h * art.naturalWidth) / art.naturalHeight;
    const pad = s * 0.6;
    const foot = s * 1.15;
    const box = { x: -w / 2 - pad, y: foot - h - pad, w: w + pad * 2, h: h + pad * 2 };
    const c = document.createElement('canvas');
    c.width = Math.ceil(box.w * k);
    c.height = Math.ceil(box.h * k);
    const cc = c.getContext('2d')!;
    cc.imageSmoothingQuality = 'high';
    cc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
    const ph = frame >= 6 ? 0 : (frame / 6) * Math.PI * 2;
    if (d.flying) {
      cc.translate(0, Math.sin(ph) * s * 0.18);
    } else {
      cc.translate(0, foot);
      cc.rotate(Math.sin(ph) * 0.09);
      cc.scale(1 + Math.abs(Math.cos(ph)) * 0.03, 1 - Math.abs(Math.cos(ph)) * 0.04 + Math.abs(Math.sin(ph)) * 0.03);
      cc.translate(0, -foot);
    }
    cc.drawImage(art, -w / 2, foot - h, w, h);
    if (tint) {
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.globalCompositeOperation = 'source-atop';
      cc.fillStyle = tint === 'white' ? 'rgba(255,255,255,0.92)' : 'rgba(255,70,60,0.55)';
      cc.fillRect(0, 0, c.width, c.height);
      cc.globalCompositeOperation = 'source-over';
    }
    sp = { c, box };
    enemySprites.set(key, sp);
    return sp;
  }
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
    cc.fillStyle = tint === 'white' ? 'rgba(255,255,255,0.92)' : 'rgba(255,70,60,0.62)';
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
  // 그림이 없을 때 새 적은 비슷한 적 모양으로
  const shape = ({
    fly: 'mosquito', shieldmouse: 'mouse', roachgen: 'roach', spiderqueen: 'spider', slug: 'mouse', centipede: 'roach', pigeon: 'mosquito', wasp: 'mosquito',
    mole: 'mouse', frog: 'spider', goldmouse: 'mouse', beetle: 'roach', toadking: 'spider', crowboss: 'mosquito', ratemperor: 'ratking',
  } as Record<string, string>)[d.id] ?? d.id;

  switch (shape) {
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
  // 여러 마리 몫을 담은 적은 조금 더 크게 (최대 1.3배)
  const big = d.boss ? 1 : Math.min(1.3, Math.pow(e.worth ?? 1, 0.2));
  if (big > 1.01) ctx.scale(big, big);
  ellipse(ctx, d.flying ? 6 : 0, d.flying ? s * 1.4 : s * 0.4, s * 0.9, s * 0.45, 'rgba(40,20,10,0.22)');
  if (e.dead) {
    // 쓰러짐: 하얗게 번쩍 → 톡 부풀었다가 납작해지며 사라짐
    const k = e.deathT / 0.45;
    const ko = !!getWorld(`enemy-${d.id}-ko`);
    const pop = e.deathT < 0.1 ? 1 + (e.deathT / 0.1) * 0.25 : ko ? 1.05 : 1.25 - (k - 0.22) * 0.6;
    ctx.globalAlpha = e.deathT < 0.1 ? 1 : Math.max(0, 1 - Math.max(0, k - (ko ? 0.55 : 0.22)) / (ko ? 0.45 : 0.78));
    ctx.scale(pop, e.deathT < 0.1 || ko ? pop : pop * (1 - k * 0.5));
  }
  if (e.attacking && !e.dead) ctx.translate(0, Math.sin(t * 18) * 2);
  const frame = moving ? Math.floor(((t * (d.speed / 4)) / (Math.PI * 2)) * 6) % 6 : 6;
  if (e.burrowed) {
    // 땅속: 흙더미만 움직인다
    const dirt = getWorld('fx-dirt');
    const wob = Math.sin(t * 10) * 0.08;
    ctx.rotate(wob);
    if (dirt) drawContain(ctx, dirt, 0, 0, s * 2.6);
    else ellipse(ctx, 0, 0, s, s * 0.5, '#8a6040');
    ctx.restore();
    return;
  }
  if (d.hop && !e.dead) ctx.translate(0, -Math.max(0, Math.sin(t * 4)) * s * 1.2);
  if (!e.dead) {
    // 맞는 순간 찌그러졌다 펴짐 + 밀려날 땐 뒤로 젖혀짐
    const hk = Math.max(0, e.hitFlash / 0.12);
    const lean = Math.min(0.35, (e.kbV ?? 0) / 600);
    ctx.translate(0, s * 0.6);
    ctx.rotate((e.uid % 2 ? 1 : -1) * lean);
    ctx.scale(1 + hk * 0.16, 1 - hk * 0.12);
    ctx.translate(0, -s * 0.6);
  }
  // 걷기: 2번째 동작 그림이 있으면 번갈아, 쓰러질 땐 기절한 그림
  const variant: '' | 'b' | 'ko' = e.dead ? (e.deathT >= 0.1 && getWorld(`enemy-${d.id}-ko`) ? 'ko' : '')
    : moving && frame % 6 >= 3 && getWorld(`enemy-${d.id}-b`) ? 'b' : '';
  const spr = enemySprite(ctx, d, variant ? 6 : frame, e.dead ? (e.deathT < 0.1 ? 'white' : false) : e.hitFlash > 0, variant);
  ctx.drawImage(spr.c, spr.box.x, spr.box.y, spr.box.w, spr.box.h);
  ctx.restore();

  if (!e.dead) {
    if (e.stunT > 0) for (let i = 0; i < 3; i++) {
      const a = e.animT * 5 + (i * Math.PI * 2) / 3;
      text(ctx, '★', e.x + Math.cos(a) * s * 0.9, e.y - s * 1.2 + Math.sin(a) * 4, 10, '#ffe14d', 'center', false);
    }
    if (e.slowT > 0) {
      // 느려짐: 발밑 얼음빛 고리 + 하트
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#9fe3ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + s * 0.4, s * 1.1, s * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      heart(ctx, e.x + Math.sin(e.animT * 4) * s * 0.6, e.y - s * 1.5, 9);
    }
    if ((e.kbV ?? 0) > 60) {
      // 밀려나는 중: 발밑 먼지
      ctx.save();
      ctx.globalAlpha = Math.min(0.6, (e.kbV ?? 0) / 400);
      for (let i = 0; i < 3; i++) circle(ctx, e.x + (i - 1) * s * 0.6, e.y + s * 0.6 + i * 2, s * 0.25, '#e8dccb');
      ctx.restore();
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

/** 전투 뒷모습 키 (고양이 크기 s 대비) */
const BACK_H = 4.2;
/** 공격 포즈 몸집 보정 (같은 키로 그렸을 때 머리 크기를 뒷모습과 맞춘 값) */
const ATK_SCALE: Record<string, number> = {
  cheese: 0.93, godeungeo: 1, huindungi: 1, chaos: 1.06, cheesetabby: 1, tuxedo: 1, samsaek: 1.06, russianblue: 1.32,
  scottish: 0.85, munchkin: 1.04, persian: 1, mainecoon: 0.9, siamese: 1, cow: 1.15, americanshort: 1.15,
  abyssinian: 0.94, norwegian: 0.95, ragdoll: 1, sphynx: 1.12,
};

function drawSquad(ctx: Ctx, game: Game, t: number): void {
  const order = game.squad.filter((m) => m.level > 0).sort((a, b) => a.y - b.y);
  const crowd = order.length >= 6 ? 0.88 : 1;
  for (const m of order) {
    const sleeping = false;
    const s = (m.slot === 0 ? 40 : 33) * crowd;
    const enter = m.enterT / 0.8;
    if (enter > 0) {
      // 합류: 아래에서 폴짝 뛰어 들어오며 반짝
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 3;
        const rr = s * (1.2 + (1 - enter) * 1.4);
        text(ctx, '✦', m.x + Math.cos(a) * rr, m.y - s + Math.sin(a) * rr * 0.6, 12 + enter * 8, '#fff3a0', 'center', false);
      }
      ctx.restore();
    }
    ellipse(ctx, m.x, m.y + 2, s * 1.0, s * 0.3, 'rgba(60,30,10,0.2)');
    if (m.evolved) {
      // 각성한 고양이: 발밑 금빛 오라
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 + Math.sin(t * 4 + m.slot) * 0.2;
      const ag = ctx.createRadialGradient(m.x, m.y, 2, m.x, m.y, s * 1.5);
      ag.addColorStop(0, 'rgba(255,220,90,0.9)'); ag.addColorStop(1, 'rgba(255,180,40,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, s * 1.5, s * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
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
    ctx.translate(m.x, m.y + (enter > 0 ? -Math.sin((1 - enter) * Math.PI) * 60 + enter * enter * 70 : 0));
    if (enter > 0) ctx.scale(1 - enter * 0.3, 1 + enter * 0.2);
    const atkArt = m.swing > 0.35 || m.ultT > 0 && m.swing > 0.1 ? getWorld(`atk-${m.def.id}`) ?? (m.slot === 0 ? getWorld('cheese-attack') : null) : null;
    const art = getArt(m.def.id, 'back');
    // 크기는 '키' 기준으로 통일 (모든 뒷모습이 귀~발끝 전신이라 키가 같으면 몸집도 같아 보임)
    const backH = s * BACK_H;
    if (atkArt) {
      // 공격 포즈: 웅크리거나 팔을 든 자세라 고양이마다 몸집 보정값을 곱한다
      const h = backH * (ATK_SCALE[m.def.id] ?? 1);
      const w = (atkArt.naturalWidth / atkArt.naturalHeight) * h;
      ctx.drawImage(atkArt, -w / 2, -h + s * 0.25, w, h);
    } else if (art) {
      const h = backH;
      const w = (art.naturalWidth / art.naturalHeight) * h;
      ctx.scale(1 + m.swing * 0.05, 1 - m.swing * 0.04);
      ctx.drawImage(art, -w / 2, -h + s * 0.25 - m.swing * 5, w, h);
    } else {
      // 공격할 때 살짝 찌그러졌다 펴지는 탄성
      ctx.scale(1 + m.swing * 0.1, 1 - m.swing * 0.08);
      drawCatBackToon(ctx, `sq${m.slot}`, m.def.look, s, t + m.slot, { sleep: sleeping, swing: m.swing });
    }
    ctx.restore();
    if (!sleeping && m.swing > 0.6 && !getWorld(`atk-${m.def.id}`)) {
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
    if (s.kind === 'lob') {
      // 츄르 폭탄: 바닥 그림자 + 빙글빙글 도는 츄르 스틱
      const k = Math.min(1, (s.age ?? 0) / (s.dur ?? 1));
      const gx = s.sx! + (s.tx! - s.sx!) * k;
      const gy = s.sy! + (s.ty! - s.sy!) * k;
      ellipse(ctx, gx, gy, 10 + k * 8, 4 + k * 3, 'rgba(40,20,10,0.25)');
      const churu = getWorld('w-cow');
      if (churu) {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.spin);
        drawContain(ctx, churu, 0, 0, 40);
        ctx.restore();
        if (k > 0.85) { ctx.strokeStyle = 'rgba(255,90,90,0.6)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.tx!, s.ty!, s.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
        continue;
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.spin);
      roundRect(ctx, -7, -16, 14, 32, 5);
      const g = ctx.createLinearGradient(-7, 0, 7, 0);
      g.addColorStop(0, '#ffd0a0'); g.addColorStop(1, '#ff8a3d');
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#3b2228'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ff5f6d'; ctx.fillRect(-7, -4, 14, 8);
      ctx.fillStyle = '#fff'; ctx.fillRect(-4, -13, 3, 7);
      ctx.restore();
      if (k > 0.85) { ctx.strokeStyle = 'rgba(255,90,90,0.6)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.tx!, s.ty!, s.radius, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      continue;
    }
    if (s.kind === 'boomer') {
      ctx.save();
      ctx.globalAlpha = 0.35;
      circle(ctx, s.x, s.y, s.radius * 1.4, '#ffffff');
      ctx.globalAlpha = 1;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.spin * 1.5);
      const bm = getWorld('w-americanshort');
      if (bm) { drawContain(ctx, bm, 0, 0, s.radius * 3.4); ctx.restore(); continue; }
      const k = s.radius / 14;
      ctx.scale(k, k);
      ctx.strokeStyle = '#d07090'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.quadraticCurveTo(-22, -10, -30, 2); ctx.stroke();
      ellipse(ctx, 0, 0, 14, 9, '#3b2228');
      ellipse(ctx, 0, 0, 12.5, 7.5, '#a9a3b8');
      ellipse(ctx, 8, -6, 5, 5, '#3b2228');
      ellipse(ctx, 8, -6, 4, 4, '#f4a7b9');
      circle(ctx, 11, -1, 1.5, '#3b2228');
      ctx.restore();
      continue;
    }
    if (s.kind === 'vacuum' && getWorld('vacuum')) {
      const R = s.radius;
      const img = getWorld('vacuum')!;
      ellipse(ctx, s.x + 4, s.y + 10, R * 1.1, R * 0.5, 'rgba(30,20,30,0.3)');
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 4; i++) circle(ctx, s.x - Math.sign(s.vx) * (R + 14 + i * 12), s.y + Math.sin(s.spin * 3 + i) * 10, 5 - i, '#e8e0f0');
      ctx.restore();
      ctx.save();
      ctx.translate(s.x, s.y + Math.sin(s.spin * 4) * 1.5);
      ctx.rotate(Math.sin(s.spin * 2) * 0.06);
      const vw = R * 2.5;
      const vh = (vw * img.naturalHeight) / img.naturalWidth;
      ctx.drawImage(img, -vw / 2, -vh / 2, vw, vh);
      ctx.restore();
      continue;
    }
    if (s.kind === 'vacuum') {
      // 집사의 로봇청소기
      const R = s.radius;
      ellipse(ctx, s.x + 4, s.y + 8, R, R * 0.5, 'rgba(30,20,30,0.3)');
      ctx.save();
      ctx.translate(s.x, s.y);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(R * 0.7 * Math.sign(s.vx), side * R * 0.75);
        ctx.rotate(s.spin * 2 * side);
        ctx.strokeStyle = '#6a6070';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke(); }
        ctx.restore();
      }
      ellipse(ctx, 0, 0, R + 2.5, R + 2.5, '#3b2228');
      ellipse(ctx, 0, 0, R, R, '#e9e6ef');
      ellipse(ctx, 0, 0, R * 0.78, R * 0.78, '#bdb7c9');
      ellipse(ctx, 0, 0, R * 0.32, R * 0.32, '#5a5468');
      const blink = Math.sin(s.spin * 2) > 0;
      ellipse(ctx, Math.sign(s.vx) * R * 0.55, 0, 4, 4, blink ? '#5fd3ff' : '#2a8fb8');
      ctx.strokeStyle = '#3b2228'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.92, Math.sign(s.vx) > 0 ? -0.9 : Math.PI - 0.9, Math.sign(s.vx) > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 4; i++) circle(ctx, s.x - Math.sign(s.vx) * (R + 10 + i * 12), s.y + Math.sin(s.spin * 3 + i) * 10, 5 - i, '#e8e0f0');
      ctx.restore();
      continue;
    }
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
    if (s.kind === 'web' && s.eshot === 'meteor') {
      const img = getWorld('fx-meteor');
      // 떨어질 자리 표시
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(s.y * 0.1);
      ellipse(ctx, s.x, CONFIG.barricadeY + 10, 34, 12, '#ff4d4d');
      ctx.restore();
      if (img) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(0.5); drawContain(ctx, img, 0, 0, 70); ctx.restore(); }
      else circle(ctx, s.x, s.y, s.radius, '#ffb000');
      continue;
    }
    if (s.kind === 'web' && s.eshot === 'tongue') {
      const img = getWorld('fx-tongue');
      if (img) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.PI / 2); drawContain(ctx, img, 0, 0, 56); ctx.restore(); }
      else circle(ctx, s.x, s.y, s.radius, '#ff8fa0');
      continue;
    }
    if (s.kind === 'web' && getWorld('web')) {
      const img = getWorld('web')!;
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 30); ctx.lineTo(s.x, s.y); ctx.stroke();
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.y * 0.03);
      const r = s.radius * 3.2;
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
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
    const sideImg = s.style === 'notes' ? getWorld('fx-notes') : s.style === 'cushion' ? getWorld('eq-cushion') : s.style === 'hairball' ? getWorld('fx-poof') : null;
    if (sideImg) {
      // 지원 고양이 보조 공격: 음표 / 쿠션 / 털뭉치
      ctx.rotate(-a + (s.style === 'cushion' ? s.spin * 2 : Math.sin(s.spin * 3) * 0.3));
      if (s.style === 'hairball') ctx.filter = 'sepia(0.6) brightness(0.9)';
      drawContain(ctx, sideImg, 0, 0, s.style === 'cushion' ? 34 : 30);
      ctx.filter = 'none';
    } else if (s.style === 'paw') {
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
    } else if (s.style === 'yarn' && getWorld('yarn')) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-s.radius, 0); ctx.quadraticCurveTo(-s.radius * 3, s.radius * Math.sin(s.spin), -s.radius * 5, 0); ctx.stroke();
      ctx.rotate(s.spin);
      drawContain(ctx, getWorld('yarn')!, 0, 0, s.radius * 2.8);
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

function drawMines(ctx: Ctx, game: Game, t: number): void {
  for (const mn of game.mines) {
    const armed = mn.t >= 0.4;
    ellipse(ctx, mn.x, mn.y + 8, 15, 5, 'rgba(40,20,10,0.25)');
    const trap = getWorld('w-abyssinian');
    if (trap) {
      drawContain(ctx, trap, mn.x, mn.y - 2, 38);
      if (armed && Math.sin(t * 6 + mn.seed) > 0) circle(ctx, mn.x, mn.y - 16, 3, '#ff5a5a');
      continue;
    }
    ctx.save();
    ctx.translate(mn.x, mn.y);
    ctx.rotate(mn.seed);
    ellipse(ctx, 0, 0, 15, 13, '#3b2228');
    ellipse(ctx, 0, 0, 13, 11, '#c8834e');
    ctx.strokeStyle = '#f3d3b0';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 7; i++) { const a = i * 0.9; ctx.beginPath(); ctx.arc(0, 0, 9, a, a + 1.2); ctx.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i * 0.785; ctx.strokeStyle = '#a9652f'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 17, Math.sin(a) * 14); ctx.stroke(); }
    ctx.restore();
    if (armed && Math.sin(t * 6 + mn.seed) > 0) circle(ctx, mn.x, mn.y - 12, 3, '#ff5a5a');
  }
}

function drawShield(ctx: Ctx, game: Game, t: number): void {
  if (game.shield <= 0) return;
  const k = Math.min(1, game.shield / (game.maxHp * 0.3));
  ctx.save();
  ctx.globalAlpha = 0.25 + k * 0.35;
  const y = CONFIG.barricadeY;
  const g = ctx.createLinearGradient(0, y - 50, 0, y + 50);
  g.addColorStop(0, 'rgba(160,215,255,0)'); g.addColorStop(0.5, 'rgba(160,215,255,0.9)'); g.addColorStop(1, 'rgba(160,215,255,0.1)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, y + 50);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, y - 30 - Math.sin(x * 0.03 + t * 2) * 6);
  ctx.lineTo(W, y + 50);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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

const FX_ART: Partial<Record<string, string>> = { boom: 'fx-boom', poof: 'fx-poof', spark: 'fx-spark', feather: 'fx-feather', dirt: 'fx-dirt', coins: 'fx-coins', ring: 'fx-ring', slime: 'fx-slime' };

function drawFx(ctx: Ctx, game: Game): void {
  for (const f of game.fx) {
    const k = f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    const fa = FX_ART[f.kind] ? getWorld(FX_ART[f.kind]!) : null;
    if (fa) {
      // 그림 이펙트: 톡 커졌다가 사라짐
      const pop = f.kind === 'spark' ? 0.6 + k * 0.7 : f.kind === 'slime' ? 1 : 0.55 + Math.min(1, k * 3) * 0.6;
      ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
      ctx.translate(f.x, f.y - (f.kind === 'poof' ? k * 10 : 0));
      ctx.rotate(f.kind === 'spark' ? f.x * 0.37 + k * 0.6 : 0);
      drawContain(ctx, fa, 0, 0, f.r * 2.4 * pop);
      ctx.restore();
      continue;
    }
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
        // 우다다 할퀴기: 빛나는 돌진 궤적 + 지나간 자리에 발톱 자국이 연달아 찍힘
        ctx.lineCap = 'round';
        const reach = (f.y - f.y2!) * Math.min(1, k * 2.5);
        const headY = f.y - reach;
        const cl = getWorld('fx-claw');
        if (cl) {
          // 궤적 (아래로 갈수록 흐려지는 가는 빛줄기)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const tr = ctx.createLinearGradient(0, headY, 0, f.y);
          tr.addColorStop(0, 'rgba(255,230,200,0.75)');
          tr.addColorStop(1, 'rgba(255,160,90,0)');
          ctx.fillStyle = tr;
          ctx.globalAlpha = 1 - k;
          ctx.beginPath();
          ctx.moveTo(f.x - f.r * 0.22, headY);
          ctx.quadraticCurveTo(f.x, headY - f.r * 0.25, f.x + f.r * 0.22, headY);
          ctx.lineTo(f.x + 3, f.y);
          ctx.lineTo(f.x - 3, f.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          // 지나간 자리의 발톱 자국
          const step = 64;
          for (let d = step * 0.6, i = 0; d < reach - step * 0.4; d += step, i++) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, (1 - k) * 1.4) * (0.55 + 0.45 * (d / Math.max(1, reach)));
            ctx.translate(f.x + (i % 2 ? 10 : -10), f.y - d);
            ctx.rotate(i % 2 ? 0.35 : -0.35);
            drawContain(ctx, cl, 0, 0, f.r * 1.05);
            ctx.restore();
          }
          // 선두의 큰 발톱
          ctx.globalAlpha = 1 - k * 0.6;
          drawContain(ctx, cl, f.x, headY, f.r * 1.5);
          break;
        }
        ctx.globalAlpha = 1 - k;
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
      case 'zap': {
        if (!f.pts || f.pts.length < 2) break;
        ctx.globalCompositeOperation = 'lighter';
        for (const [w, col] of [[7, 'rgba(120,200,255,0.5)'], [2.5, '#ffffff']] as const) {
          ctx.strokeStyle = col;
          ctx.lineWidth = w;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(f.pts[0].x, f.pts[0].y);
          for (let i = 1; i < f.pts.length; i++) {
            const a = f.pts[i - 1];
            const b = f.pts[i];
            for (let j = 1; j <= 4; j++) {
              const q = j / 4;
              const jit = j < 4 ? (Math.sin((f.t + j) * 40 + i) * 9) : 0;
              ctx.lineTo(a.x + (b.x - a.x) * q + jit, a.y + (b.y - a.y) * q - jit * 0.6);
            }
          }
          ctx.stroke();
        }
        for (const p of f.pts.slice(1)) circle(ctx, p.x, p.y, 10 * (1 - k) + 3, 'rgba(180,230,255,0.6)');
        break;
      }
      case 'pounce': {
        const q = Math.min(1, k * 1.2);
        const px = f.x + (f.x2! - f.x) * q;
        const py = f.y + (f.y2! - f.y) * q - Math.sin(q * Math.PI) * 70;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(232,160,64,0.5)';
        ctx.lineWidth = 6;
        ctx.setLineDash([2, 10]);
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo((f.x + f.x2!) / 2, Math.min(f.y, f.y2!) - 140, px, py); ctx.stroke();
        ctx.setLineDash([]);
        ellipse(ctx, px, py, 18, 13, '#3b2228');
        ellipse(ctx, px, py, 16, 11, '#e2a24e');
        for (const [dx, dy] of [[-6, -3], [4, 2], [8, -5], [-2, 5]]) circle(ctx, px + dx, py + dy, 2.2, '#5a3a1e');
        ellipse(ctx, px, py - 13, 9, 8, '#e2a24e');
        break;
      }
      case 'spray': {
        const a0 = (f.ang ?? -Math.PI / 2) - (f.x2 ?? 0.45);
        const a1 = (f.ang ?? -Math.PI / 2) + (f.x2 ?? 0.45);
        const rr = f.r * Math.min(1, k * 2.5);
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rr);
        g.addColorStop(0, 'rgba(190,235,255,0.75)'); g.addColorStop(1, 'rgba(120,200,255,0.05)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.arc(f.x, f.y, rr, a0, a1); ctx.closePath(); ctx.fill();
        const sp = getWorld('fx-splash');
        if (sp && k > 0.25) { const am = f.ang ?? -Math.PI / 2; drawContain(ctx, sp, f.x + Math.cos(am) * rr * 0.85, f.y + Math.sin(am) * rr * 0.85, f.r * 0.7); }
        for (let i = 0; i < 16; i++) {
          const a = a0 + ((a1 - a0) * ((i * 7) % 16)) / 15;
          const d = rr * (0.3 + ((i * 13) % 10) / 14);
          ellipse(ctx, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 4, 5.5, 'rgba(225,245,255,0.9)');
        }
        break;
      }
      case 'shield': {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, f.y - 60, 0, f.y + 50);
        g.addColorStop(0, 'rgba(150,210,255,0)'); g.addColorStop(0.5, 'rgba(150,210,255,0.6)'); g.addColorStop(1, 'rgba(150,210,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, f.y - 60 - k * 20, W, 110);
        break;
      }
      case 'stamp': {
        // 대장의 발도장: 위에서 쿵 내려찍는 금빛 발바닥 + 퍼지는 고리
        const drop = Math.min(1, k / 0.18);
        ctx.globalAlpha = k < 0.6 ? 1 : (1 - k) / 0.4;
        if (k > 0.15) {
          ctx.strokeStyle = 'rgba(255,216,77,0.8)';
          ctx.lineWidth = 6 * (1 - k);
          ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * (0.6 + k), f.r * (0.6 + k) * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.translate(f.x, f.y - (1 - drop) * 80);
        const sc = 1.6 - drop * 0.6;
        ctx.scale(sc, sc);
        ctx.globalAlpha *= 0.9;
        pawPrint(ctx, 0, 0, f.r * 0.62, '#3b2228');
        pawPrint(ctx, 0, 0, f.r * 0.55, '#ffd84d');
        pawPrint(ctx, -f.r * 0.05, -f.r * 0.05, f.r * 0.32, '#fff3b0');
        break;
      }
      case 'heal': {
        const hi = getWorld('fx-heal');
        if (hi) for (let i = 0; i < 5; i++) drawContain(ctx, hi, (i + 0.5) * (W / 5), f.y - k * 40 - (i % 2) * 12, 54);
        else for (let i = 0; i < 10; i++) text(ctx, '+', (i + 0.5) * (W / 10), f.y - k * 30 - (i % 2) * 8, 18, f.color, 'center', false);
        break;
      }
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
  text(ctx, `${game.stage.hard ? "🔥" : ""}St.${game.stage.no} · ${game.stage.name}`, 306, 30, 17, game.stage.hard ? "#ffb3a8" : "#fff");
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
  if (game.shield > 0) {
    roundRect(ctx, 64, CONFIG.height - 36, Math.min(416, 416 * (game.shield / game.maxHp)), 20, 10);
    ctx.fillStyle = 'rgba(140,200,255,0.75)';
    ctx.fill();
  }
  text(ctx, `🛡 ${Math.ceil(game.hp)} / ${game.maxHp}${game.shield > 0 ? ` (+${Math.ceil(game.shield)})` : ''}`, W / 2, CONFIG.height - 26, 13, '#fff');
  ctx.save();
  ctx.beginPath(); ctx.arc(34, CONFIG.height - 28, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#bfe6ff'; ctx.fill();
  ctx.clip();
  const girl = getWorld(ratio > 0.6 ? 'girl-happy' : ratio > 0.3 ? 'girl-worried' : 'girl-cry');
  if (girl) {
    const gw = 62;
    const gh = (gw * girl.naturalHeight) / girl.naturalWidth;
    const bob = Math.sin(t * 2) * 1;
    ctx.drawImage(girl, 34 - gw / 2, CONFIG.height - 28 - 26 + bob, gw, gh);
  } else {
    ctx.translate(34, CONFIG.height - 24);
    ctx.scale(0.7, 0.7);
    drawGirl(ctx, 0, 0, ratio, t);
  }
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

/** 말풍선 + 손가락 안내 */
function tutBubble(ctx: Ctx, x: number, y: number, w: number, lines: string[], t: number): void {
  const h = 18 + lines.length * 24;
  const bob = Math.sin(t * 3) * 3;
  ctx.save();
  ctx.translate(0, bob);
  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(255,250,240,0.97)';
  ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#3b2228'; ctx.stroke();
  lines.forEach((ln, i) => text(ctx, ln, x + w / 2, y + 21 + i * 24, i === 0 ? 17 : 14, i === 0 ? '#ff5f8a' : '#3b2228', 'center', false));
  ctx.restore();
}

function tutFinger(ctx: Ctx, x: number, y: number, t: number, up = true): void {
  const d = Math.abs(Math.sin(t * 4)) * 12;
  ctx.save();
  ctx.translate(x, y + (up ? d : -d));
  if (!up) ctx.rotate(Math.PI);
  text(ctx, '👆', 0, 0, 42, '#fff', 'center', false);
  ctx.restore();
}

/** 첫 판 튜토리얼 안내 */
function drawTutorial(ctx: Ctx, game: Game, t: number): void {
  if (game.pickAnim) return;
  if (game.tutStep === 0 && game.choice) {
    const off = (CONFIG.height - 960) / 2;
    tutBubble(ctx, 40, 740 + off, W - 80, ['레벨업! 카드 1장을 골라요', 'NEW 카드를 고르면 고양이 친구가 합류해요'], t);
    const ni = Math.max(0, game.choice.findIndex((c) => c.type === 'new'));
    const r = CHOICE_BUTTONS[ni].rect;
    tutFinger(ctx, r.x + r.w / 2, r.y + r.h + 4, t);
    return;
  }
  if (game.tutStep === 0 && !game.choice && game.time < 9) {
    tutBubble(ctx, 50, CONFIG.height * 0.42, W - 100, ['고양이들은 자동으로 공격해요!', '적을 물리치면 경험치가 쌓여 레벨업해요'], t);
    return;
  }
  if (game.tutStep === 2 && !game.choice) {
    const active = game.squad.filter((m) => m.level > 0);
    const i = active.findIndex((m) => game.canUlt(m.slot));
    if (i >= 0) {
      tutBubble(ctx, 80, 130 + i * 58 - 8, 270, ['고양이 얼굴을 눌러봐요!', '필살기: 4초 동안 폭주 공격'], t);
      tutFinger(ctx, 36, 130 + i * 58 + 62, t);
    }
    return;
  }
  if (game.tutStep === 1 && !game.choice && game.time > 16 && game.canRally()) {
    const rb = HUD_BUTTONS.find((b) => b.id.type === 'rally')!.rect;
    tutBubble(ctx, W - 300, rb.y - 120, 280, ['응원 버튼을 눌러봐요!', '바리케이드 회복 + 모두 공격 UP'], t);
    tutFinger(ctx, rb.x + rb.w / 2, rb.y - 20, t, false);
  }
}

/** 보스 등장 컷인: 얼굴 그림이 옆에서 미끄러져 들어오는 띠 */
function drawBossIntro(ctx: Ctx, game: Game): void {
  const bi = game.bossIntro!;
  const e = game.time - bi.at;
  if (e > 2.6) return;
  const inK = Math.min(1, e / 0.35);
  const outK = e > 2.2 ? (e - 2.2) / 0.4 : 0;
  const ease = 1 - Math.pow(1 - inK, 3);
  const cy = CONFIG.height * 0.36;
  const bh = 150;
  ctx.save();
  ctx.globalAlpha = 1 - outK;
  // 띠
  ctx.save();
  ctx.translate(0, cy);
  ctx.transform(1, -0.08, 0, 1, 0, 0);
  ctx.fillStyle = 'rgba(20,8,16,0.85)';
  ctx.fillRect(-20, -bh / 2, (W + 40) * ease, bh);
  ctx.fillStyle = '#ff4d6d';
  ctx.fillRect(-20, -bh / 2 - 6, (W + 40) * ease, 6);
  ctx.fillRect(W + 20 - (W + 40) * ease, bh / 2, (W + 40) * ease, 6);
  ctx.restore();
  // 얼굴들
  const n = bi.kinds.length;
  bi.kinds.forEach((kd, i) => {
    const img = getWorld(`boss-${kd}`);
    const size = n > 1 ? 120 : 140;
    const x = W - 20 - size / 2 - i * (size + 10) + (1 - ease) * 300;
    const y = cy - 10 + i * 6;
    if (img) {
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.clip();
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      ctx.restore();
      ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.stroke();
    }
  });
  const names = bi.kinds.map((kd) => ENEMIES[kd].name).join(' & ');
  const tx = 24 - (1 - ease) * 200;
  text(ctx, 'WARNING', tx + 70, cy - 36, 22, '#ff8fa3', 'center');
  text(ctx, names, tx, cy + 4, n > 1 ? 24 : 30, '#fff', 'left');
  text(ctx, '쓰러뜨리면 승리!', tx, cy + 40, 16, '#ffe98a', 'left');
  ctx.restore();
}

/** 그림을 (cx, cy) 중심, 긴 변 size 크기로 비율 유지해서 그린다 */
function drawContain(ctx: Ctx, img: HTMLImageElement, cx: number, cy: number, size: number): void {
  const k = size / Math.max(img.naturalWidth, img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function drawSkillChip(ctx: Ctx, m: Member, x: number, y: number, t: number): void {
  const col = RARITY_COLOR[m.def.rarity];
  circle(ctx, x + 24, y + 22, 24, col);
  ctx.save();
  ctx.beginPath(); ctx.arc(x + 24, y + 22, 21, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#3d2a40'; ctx.fillRect(x, y, 48, 48);
  iconFace(ctx, m.def.id, x + 24, y + 22, 21, () => drawFaceAt(ctx, m.def.look, x + 24, y + 28, 14, t));
  ctx.restore();
  // 필살기 쿨타임 / 준비 완료 / 폭주 중
  const cx = x + 24;
  const cy = y + 22;
  if (m.ultT > 0) {
    ctx.save();
    ctx.strokeStyle = `hsl(${(t * 400) % 360}, 100%, 60%)`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (m.ultT / ULT_DUR)); ctx.stroke();
    ctx.restore();
  } else if (m.ultCd > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,10,20,0.55)';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (m.ultCd / ULT_CD)); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else {
    const pulse = 0.6 + Math.sin(t * 6) * 0.4;
    ctx.save();
    ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = 14 * pulse;
    ctx.strokeStyle = '#ffd84d'; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    text(ctx, '탭!', x + 66, y + 22, 13, '#ffd84d', 'center', false);
  }
  circle(ctx, x + 42, y + 38, 10, '#2a1a22');
  text(ctx, `${m.level}`, x + 42, y + 38, 12, '#ffe98a', 'center', false);
}

/** 왼쪽 고양이 얼굴(필살기 버튼) 위치: 누른 곳에 있는 고양이 슬롯 */
export function chipAt(game: Game, x: number, y: number): number | null {
  const active = game.squad.filter((m) => m.level > 0);
  for (let i = 0; i < active.length; i++) {
    const cx = 12 + 24;
    const cy = 130 + i * 58 + 22;
    if (Math.hypot(x - cx, y - cy) <= 30) return active[i].slot;
  }
  return null;
}

// ───────────────────────── 스킬 선택 / 오버레이 ─────────────────────────

function cardInfo(game: Game, c: Card) {
  if (c.type === 'new') {
    const m = game.squad[c.slot];
    return { title: m.def.name, sub: m.def.skillName, desc: m.weapon.intro, badge: 'NEW', color: RARITY_COLOR[m.def.rarity], look: m.def.look as CatLook | null, icon: m.weapon.icon, iconId: `w-${m.def.id}` };
  }
  if (c.type === 'mod') {
    const m = game.squad[c.slot];
    const mod = m.weapon.mods.find((x) => x.id === c.mod)!;
    return { title: mod.name, sub: `${m.def.name} · ${m.def.skillName}`, desc: mod.desc, badge: '', color: RARITY_COLOR[m.def.rarity], look: m.def.look as CatLook | null, icon: m.weapon.icon, iconId: `w-${m.def.id}` };
  }
  if (c.type === 'evolve') {
    const m = game.squad[c.slot];
    return { title: `${m.def.skillName} 각성`, sub: `${m.def.name} · EVOLUTION`, desc: '스킬이 각성! 피해 +60%, 공격 속도 +33%, 투사체·범위도 늘어나요.', badge: '각성', color: '#ffd84d', look: m.def.look as CatLook | null, icon: m.weapon.icon, iconId: `w-${m.def.id}` };
  }
  const g = GENERIC[c.id];
  return { title: g.name, sub: c.id === 'snack' ? '회복' : `${game.generic[c.id] + 1}단계`, desc: g.desc, badge: '강화', color: '#7ad99a', look: null as CatLook | null, icon: g.icon, iconId: `g-${c.id}` };
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
  if (c.type === 'evolve') {
    // 각성 카드: 뒤에서 금빛 햇살이 돈다
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2 - 40);
    ctx.rotate(t * 0.8);
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = i % 2 ? '#ffd84d' : '#fff3b0';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-18, -190); ctx.lineTo(18, -190); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  // 카드 위로 튀어나오는 캐릭터
  if (info.look) {
    ctx.save();
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y - 10, 10, r.x + r.w / 2, r.y - 10, 110);
    g.addColorStop(0, info.color + 'aa'); g.addColorStop(1, info.color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 30, r.y - 130, r.w + 60, 200);
    const cid = c.type !== 'generic' ? game.squad[c.slot].def.id : '';
    const art = cid ? getArt(cid, 'card') : null;
    const full = cid && !art ? getArt(cid, 'full') : null;
    if (full) {
      // 일러스트 상반신을 카드 위에 액자처럼
      const bx = r.x + 6;
      const by = r.y - 124;
      const bw = r.w - 12;
      const bh = 170;
      ctx.save();
      roundRect(ctx, bx, by, bw, bh, 12);
      ctx.clip();
      drawBustArt(ctx, cid, full, bx, by, bw, bh);
      const fade = ctx.createLinearGradient(0, by + bh - 50, 0, by + bh);
      fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(20,10,20,0.45)');
      ctx.fillStyle = fade;
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
      roundRect(ctx, bx, by, bw, bh, 12);
      ctx.strokeStyle = '#2a1420';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 1.5;
      roundRect(ctx, bx + 3, by + 3, bw - 6, bh - 6, 10);
      ctx.stroke();
    } else if (art) {
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
    const gi = info.iconId ? getWorld(info.iconId) : null;
    if (gi) drawContain(ctx, gi, r.x + r.w / 2, r.y - 30, 96);
    else text(ctx, info.icon, r.x + r.w / 2, r.y - 30, 72, '#fff', 'center', false);
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
  const wimg = info.iconId ? getWorld(info.iconId) : null;
  if (wimg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(ix, iy, 30, 0, Math.PI * 2); ctx.clip();
    drawContain(ctx, wimg, ix, iy, 50);
    ctx.restore();
  } else text(ctx, info.icon, ix, iy + 1, 30, '#fff', 'center', false);
  if (c.type === 'mod') {
    circle(ctx, ix + 24, iy + 24, 12, '#1d3b22');
    text(ctx, `${c.next}`, ix + 24, iy + 24, 14, '#ffffff', 'center', false);
  }
  // 배지
  if (info.badge === 'NEW' || info.badge === '강화' || info.badge === '각성') {
    const bx = r.x - 6;
    const by = r.y + 84;
    ctx.fillStyle = info.badge === 'NEW' ? '#ffcf3a' : info.badge === '각성' ? '#ff5fa0' : '#7ad99a';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 70, by); ctx.lineTo(bx + 84, by + 13); ctx.lineTo(bx + 70, by + 26); ctx.lineTo(bx, by + 26); ctx.closePath(); ctx.fill();
    text(ctx, info.badge, bx + 36, by + 13, 16, info.badge === 'NEW' ? '#7a3a00' : info.badge === '각성' ? '#fff' : '#1d3b22', 'center', false);
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

let pressedKey: string | null = null;

function drawResult(ctx: Ctx, game: Game, t: number, reward: RewardView | null): void {
  ctx.fillStyle = 'rgba(25,12,25,0.72)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  ctx.save();
  ctx.translate(0, (CONFIG.height - 960) / 2);
  const res = game.result!;
  const pose = getWorld(res.victory ? 'cheese-win' : 'cheese-lose');
  if (pose) {
    const ph = res.victory ? 175 : 150;
    const pw = (pose.naturalWidth / pose.naturalHeight) * ph;
    const hop = res.victory ? Math.abs(Math.sin(t * 4)) * 10 : 0;
    ellipse(ctx, W / 2, res.victory ? 214 : 240, pw * 0.35, 10, 'rgba(0,0,0,0.3)');
    ctx.drawImage(pose, W / 2 - pw / 2, (res.victory ? 212 : 242) - ph - hop, pw, ph);
  }
  if (res.victory) {
    text(ctx, '승리! 🎉', W / 2, 250, 56, '#ffe98a');
    for (let i = 0; i < 3; i++) {
      const on = i < res.stars;
      text(ctx, '★', W / 2 - 80 + i * 80, 330, on ? 60 : 48, on ? '#ffd84d' : '#6b5a66');
    }
  } else {
    text(ctx, '패배...', W / 2, 280, 56, '#ff8a8a');
    text(ctx, '고양이를 키우고 새 고양이를 모아서 다시 도전!', W / 2, 345, 17, '#fff');
  }
  text(ctx, `처치 ${res.kills} · 레벨 ${game.level} · ${Math.round(res.progress * 100)}% 진행`, W / 2, 400, 16, '#ffd6e4');
  if (reward) {
    roundRect(ctx, 50, 425, W - 100, 118, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    text(ctx, reward.firstClear ? '첫 클리어 보상' : '보상', W / 2, 452, 15, '#ffe98a');
    const parts: [string, string, number][] = [['coin', '🪙', reward.coins]];
    if (reward.tuna > 0) parts.push(['tuna', '🥫', reward.tuna]);
    if (reward.yarn > 0) parts.push(['yarn', '🧶', reward.yarn]);
    const pw = 120;
    parts.forEach(([id, emo, n], i) => {
      const px = W / 2 + (i - (parts.length - 1) / 2) * pw;
      const img = getWorld(id);
      if (img) drawContain(ctx, img, px - 26, 495, 34);
      else text(ctx, emo, px - 26, 497, 22, '#fff');
      text(ctx, `${n}`, px - 6, 497, 22, '#fff', 'left');
    });
    const extra = [`집사 경험치 +${reward.exp}`];
    if (reward.heroShards > 0) extra.push(`${CAT_BY_ID[HERO_ID].name} 조각 +${reward.heroShards}`);
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
      const wi = getWorld(`w-${m.def.id}`);
      if (wi) drawContain(ctx, wi, 80, y, 22);
      else text(ctx, m.weapon.icon, 80, y, 13, '#fff', 'center', false);
      text(ctx, `${m.def.name} · ${m.def.skillName}`, 96, y, 13, '#fff', 'left', false);
      text(ctx, fmtDmg(m.dealt), 360, y, 14, '#fff', 'right', false);
      text(ctx, `${Math.round(m.dealt / Math.max(1, res.time))}`, W - 60, y, 14, '#fff', 'right', false);
    });
  }
  ctx.restore();
  if (!reward) return;
  // 결과 버튼
  const hasNext = res.victory && !!game.nextId;
  for (const b of RESULT_BUTTONS) {
    const r = b.rect;
    ctx.save();
    if (pressedKey === buttonKey(b.id)) ctx.translate(0, 3);
    if (b.id.type === 'lobby') {
      drawButtonBase(ctx, r, true, '#9b7bd6', 32);
      text(ctx, '🏠 로비로', r.x + r.w / 2, r.y + r.h / 2, 21, '#fff');
    } else {
      const label = hasNext ? `St.${nextStageNo(game)} 다음 ▶` : res.victory ? '🔁 다시 하기' : '🔁 다시 도전';
      const pulse = 1 + Math.sin(t * 5) * 0.03;
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
      drawButtonBase(ctx, r, true, hasNext ? '#ffb000' : '#ff7a6b', 32);
      text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, 22, '#fff');
    }
    ctx.restore();
  }
}

/** 다음 스테이지 번호 (없으면 null) */
export function nextStageNo(game: Game): number | null {
  return game.stage.no < STAGE_COUNT ? game.stage.no + 1 : null;
}

export function render(ctx: Ctx, game: Game, t: number, pressed: string | null, reward: RewardView | null): void {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * game.shake * 2, (Math.random() - 0.5) * 8 * game.shake * 2);
  drawField(ctx, game.stage.area, t);
  drawDecals(ctx, game.decals);
  drawFields(ctx, game, t);
  drawMines(ctx, game, t);
  const sorted = [...game.enemies].sort((a, b) => (a.def.flying ? 1 : 0) - (b.def.flying ? 1 : 0) || a.y - b.y);
  for (const e of sorted) drawEnemy(ctx, e);
  drawBarricade(ctx, game, t);
  drawShield(ctx, game, t);
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
  if (game.bossIntro && game.phase === 'playing') drawBossIntro(ctx, game);
  pressedKey = pressed;
  if (game.phase !== 'playing') drawResult(ctx, game, t, reward);
  else if (game.choice || game.pickAnim) drawChoice(ctx, game, t, pressed);
  else if (game.paused) drawPause(ctx, pressed);
  if (game.tutorial && game.phase === 'playing' && !game.paused) drawTutorial(ctx, game, t);
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
