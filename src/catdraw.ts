// 고양이 외형(무늬/품종)을 코드로 그린다. 오른쪽을 바라보며 발밑이 원점.
import type { CatLook } from './data/cats';

type Ctx = CanvasRenderingContext2D;

export interface CatPose {
  t: number;
  walking: boolean;
  attacking: boolean;
  swing: number;   // 0~1 공격 모션
  stride: number;  // 걸음 속도 계수
}

export const IDLE_POSE: CatPose = { t: 0, walking: false, attacking: false, swing: 0, stride: 5 };

/** #rrggbb 색을 밝게(+)/어둡게(-) */
export function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

const HEX = /^#[0-9a-f]{6}$/i;

/** 입체 타원: 왼쪽 위에서 빛이 오는 그라데이션 (단색 #rrggbb일 때) */
export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  rx = Math.max(0.1, rx);
  ry = Math.max(0.1, ry);
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (HEX.test(fill) && Math.max(rx, ry) >= 3) {
    const m = Math.max(rx, ry);
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, m * 0.08, x, y, m * 1.08);
    g.addColorStop(0, shadeHex(fill, 0.3));
    g.addColorStop(0.5, fill);
    g.addColorStop(1, shadeHex(fill, -0.25));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = fill;
  }
  ctx.fill();
}

function clipEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, draw: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  draw();
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function heart(ctx: Ctx, x: number, y: number, size: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(-size * 0.1, size * 0.22, -size * 0.62, -size * 0.02, -size * 0.5, -size * 0.32);
  ctx.bezierCurveTo(-size * 0.4, -size * 0.6, -size * 0.05, -size * 0.55, 0, -size * 0.25);
  ctx.bezierCurveTo(size * 0.05, -size * 0.55, size * 0.4, -size * 0.6, size * 0.5, -size * 0.32);
  ctx.bezierCurveTo(size * 0.62, -size * 0.02, size * 0.1, size * 0.22, 0, size * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#e8352b';
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.strokeStyle = '#2a1414';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.ellipse(-size * 0.26, -size * 0.3, size * 0.1, size * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawCatLook(ctx: Ctx, look: CatLook, s: number, pose: CatPose): void {
  const p = look.pattern;
  const white = look.belly ?? '#fffaf2';
  const accentA = look.patch ?? look.base;
  const legsColor = p === 'bicolor' || p === 'tuxedo' || p === 'calico' ? white : p === 'point' ? accentA : look.base;
  const tailColor = p === 'bicolor' || p === 'point' || p === 'calico' ? accentA : look.base;
  const earL = p === 'bicolor' || p === 'point' || p === 'calico' ? accentA : look.base;
  const earR = p === 'calico' ? (look.patch2 ?? accentA) : earL;

  const ly = look.shortLegs ? s * 0.18 : 0;
  const bob = pose.walking ? Math.abs(Math.sin(pose.t * pose.stride)) * 3 : 0;
  ctx.save();
  ctx.translate(pose.swing * 6, -bob);

  // 꼬리
  ctx.lineCap = 'round';
  const tw = Math.sin(pose.t * 4) * s * 0.3;
  const tailPath = () => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.8, -s * 0.5 + ly);
    ctx.quadraticCurveTo(-s * 1.5, -s * 0.8 + ly, -s * 1.3 + tw * 0.3, -s * 1.6 + tw + ly);
  };
  ctx.strokeStyle = tailColor;
  ctx.lineWidth = s * (look.fluffy ? 0.5 : 0.28);
  tailPath();
  ctx.stroke();
  if (p === 'tabby' && look.stripe) {
    ctx.strokeStyle = look.stripe;
    ctx.setLineDash([s * 0.15, s * 0.22]);
    tailPath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 다리
  const legSwing = pose.walking ? Math.sin(pose.t * pose.stride * 1.3) * s * 0.18 : 0;
  const legH = look.shortLegs ? s * 0.25 : s * 0.45;
  ctx.fillStyle = legsColor;
  for (const [lx, ph] of [[-s * 0.5, 1], [s * 0.4, -1]] as const) {
    roundRect(ctx, lx + legSwing * ph - s * 0.15, -legH + s * 0.05, s * 0.3, legH, s * 0.12);
    ctx.fill();
  }

  // 몸통 + 무늬
  const bw = s * (look.fluffy ? 1.15 : 1.05);
  const by = -s * 0.6 + ly;
  const bry = s * (look.fluffy ? 0.68 : 0.62);
  ellipse(ctx, 0, by, bw, bry, look.base);
  clipEllipse(ctx, 0, by, bw, bry, () => {
    if (p === 'bicolor') {
      ellipse(ctx, -s * 0.15, by - s * 0.38, bw * 0.95, s * 0.48, accentA);
      if (look.stripe) {
        ctx.strokeStyle = look.stripe;
        ctx.lineWidth = s * 0.08;
        for (let i = -2; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.32, by - bry); ctx.lineTo(i * s * 0.32 - s * 0.08, by - bry * 0.35); ctx.stroke(); }
      }
    }
    if (p === 'calico') {
      ellipse(ctx, -s * 0.55, by - s * 0.3, s * 0.55, s * 0.42, accentA);
      ellipse(ctx, s * 0.3, by - s * 0.42, s * 0.42, s * 0.3, look.patch2 ?? '#333');
    }
    if (p === 'tortie') {
      for (const [x, y, r] of [[-0.6, -0.3, 0.3], [0.1, -0.45, 0.25], [0.55, -0.2, 0.2], [-0.2, 0.05, 0.22]] as const) {
        ellipse(ctx, s * x, by + s * y, s * r * 1.3, s * r, accentA);
      }
    }
    if (p === 'tabby' && look.stripe) {
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = s * 0.13;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.32, by - bry);
        ctx.quadraticCurveTo(i * s * 0.32 - s * 0.12, by - bry * 0.4, i * s * 0.32 - s * 0.05, by);
        ctx.stroke();
      }
    }
    if (look.belly && p !== 'solid') {
      const bigBib = p === 'tuxedo';
      ellipse(ctx, s * 0.25, by + s * 0.22, bw * (bigBib ? 0.7 : 0.55), s * (bigBib ? 0.42 : 0.32), white);
    }
  });

  // 머리 위치
  const hr = s * (look.fluffy ? 0.76 : look.kitten ? 0.78 : 0.72);
  const hx = s * 0.85;
  const hy = -s * 1.15 + ly;

  // 풍성한 목털
  if (look.fluffy) {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.35 + i * 0.32;
      ellipse(ctx, hx - hr * 0.2 + Math.cos(a) * hr * 0.75, hy + hr * 0.25 + Math.sin(a) * hr * 0.5, hr * 0.32, hr * 0.28, look.belly ?? look.base);
    }
  }

  // 목 스카프 (머리 뒤에 그려서 목에 두른 것처럼)
  if (look.accessory === 'scarf') {
    const flap = Math.sin(pose.t * 9) * 2.5;
    ctx.fillStyle = '#e8384f';
    ctx.beginPath();
    ctx.moveTo(hx - hr * 0.75, hy + hr * 0.55);
    ctx.lineTo(hx - hr * 1.55, hy + hr * 0.35 + flap);
    ctx.lineTo(hx - hr * 1.45, hy + hr * 0.85 + flap);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, hx - hr * 0.2, hy + hr * 0.78, hr * 0.78, hr * 0.24, '#e8384f', -0.15);
    ellipse(ctx, hx - hr * 0.2, hy + hr * 0.72, hr * 0.6, hr * 0.08, '#ff6b81', -0.15);
  }

  // 귀
  if (!look.fold) {
    const ear = (x1: number, x2: number, x3: number, col: string, inner: boolean, side: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(hx + x1 * hr, hy - hr * 0.4);
      ctx.lineTo(hx + x2 * hr, hy - hr * 1.35);
      ctx.lineTo(hx + x3 * hr, hy - hr * 0.8);
      ctx.fill();
      if (inner) {
        ctx.fillStyle = '#ffb3c6';
        ctx.beginPath();
        ctx.moveTo(hx + (x1 + 0.2 * side) * hr, hy - hr * 0.6);
        ctx.lineTo(hx + x2 * hr * 0.92, hy - hr * 1.1);
        ctx.lineTo(hx + (x3 - 0.15 * side) * hr, hy - hr * 0.75);
        ctx.fill();
      }
      if (look.fluffy) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(hx + x2 * hr, hy - hr * 1.35);
        ctx.lineTo(hx + x2 * hr + 2 * side, hy - hr * 1.6);
        ctx.stroke();
      }
    };
    ear(-0.8, -0.55, -0.05, earL, true, 1);
    ear(0.05, 0.6, 0.85, earR, true, -1);
  }

  // 머리 + 무늬
  ellipse(ctx, hx, hy, hr, hr * (look.fold ? 0.95 : 1), look.base);
  clipEllipse(ctx, hx, hy, hr, hr, () => {
    if (p === 'bicolor') {
      ellipse(ctx, hx - hr * 0.1, hy - hr * 0.45, hr * 1.15, hr * 0.8, accentA);
      ellipse(ctx, hx - hr * 0.85, hy + hr * 0.1, hr * 0.5, hr * 0.7, accentA); // 뒤통수
      if (look.stripe) {
        ctx.strokeStyle = look.stripe;
        ctx.lineWidth = hr * 0.08;
        for (const dx of [-0.05, 0.12, 0.42, 0.58]) { ctx.beginPath(); ctx.moveTo(hx + dx * hr, hy - hr * 0.95); ctx.lineTo(hx + dx * hr, hy - hr * 0.55); ctx.stroke(); }
        for (const dy of [-0.15, 0.08]) { ctx.beginPath(); ctx.moveTo(hx - hr * 0.95, hy + dy * hr); ctx.lineTo(hx - hr * 0.6, hy + dy * hr + 2); ctx.stroke(); }
      }
      // 이마에서 코로 넓어지는 흰 ㅅ자
      ctx.fillStyle = look.base;
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.22, hy - hr * 0.9);
      ctx.lineTo(hx + hr * 0.32, hy - hr * 0.9);
      ctx.lineTo(hx + hr * 0.7, hy + hr * 0.2);
      ctx.lineTo(hx - hr * 0.12, hy + hr * 0.2);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, hx + hr * 0.3, hy + hr * 0.42, hr * 0.62, hr * 0.42, look.base);
    }
    if (p === 'calico') {
      ellipse(ctx, hx - hr * 0.5, hy - hr * 0.55, hr * 0.6, hr * 0.5, accentA);
      ellipse(ctx, hx + hr * 0.7, hy - hr * 0.65, hr * 0.45, hr * 0.4, look.patch2 ?? '#333');
    }
    if (p === 'tortie') ellipse(ctx, hx + hr * 0.45, hy - hr * 0.55, hr * 0.4, hr * 0.35, accentA);
    if (p === 'tabby' && look.stripe) {
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = hr * 0.12;
      for (const dx of [0.05, 0.27, 0.49]) {
        ctx.beginPath();
        ctx.moveTo(hx + dx * hr, hy - hr * 0.98);
        ctx.lineTo(hx + dx * hr, hy - hr * 0.55);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.95, hy - hr * 0.1); ctx.lineTo(hx - hr * 0.55, hy - hr * 0.05);
      ctx.moveTo(hx - hr * 0.95, hy + hr * 0.15); ctx.lineTo(hx - hr * 0.55, hy + hr * 0.15);
      ctx.stroke();
    }
    if (p === 'point') ellipse(ctx, hx + hr * 0.27, hy + hr * 0.18, hr * 0.62, hr * 0.55, accentA);
    if (p === 'tuxedo') {
      ellipse(ctx, hx + hr * 0.27, hy + hr * 0.42, hr * 0.55, hr * 0.42, white);
      ellipse(ctx, hx + hr * 0.27, hy - hr * 0.1, hr * 0.1, hr * 0.4, white);
    }
    if (look.belly && (p === 'tabby' || p === 'tortie')) ellipse(ctx, hx + hr * 0.27, hy + hr * 0.4, hr * 0.42, hr * 0.28, white);
  });

  // 접힌 귀
  if (look.fold) {
    ellipse(ctx, hx - hr * 0.45, hy - hr * 0.78, hr * 0.32, hr * 0.17, earL, 0.5);
    ellipse(ctx, hx + hr * 0.5, hy - hr * 0.8, hr * 0.32, hr * 0.17, earR, -0.5);
  }

  // 얼굴
  const dark = p === 'tuxedo' || p === 'tortie' || p === 'point';
  const lineCol = dark ? '#d8d0c8' : '#2a2030';
  if (pose.attacking && pose.swing > 0.4) {
    ctx.strokeStyle = lineCol;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx - hr * 0.1, hy - hr * 0.2); ctx.lineTo(hx + hr * 0.1, hy - hr * 0.05); ctx.lineTo(hx - hr * 0.1, hy + hr * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + hr * 0.6, hy - hr * 0.2); ctx.lineTo(hx + hr * 0.4, hy - hr * 0.05); ctx.lineTo(hx + hr * 0.6, hy + hr * 0.1); ctx.stroke();
  } else {
    for (const ex of [0, 0.52]) {
      const k = look.kitten ? 1.4 : 1.28;
      ellipse(ctx, hx + ex * hr, hy - hr * 0.05, hr * 0.16 * k, hr * 0.21 * k, look.eye);
      ellipse(ctx, hx + ex * hr + hr * 0.02, hy - hr * 0.03, hr * 0.08 * k, hr * 0.15 * k, '#1e1820');
      ellipse(ctx, hx + ex * hr + hr * 0.06, hy - hr * 0.14, hr * 0.055 * k, hr * 0.055 * k, '#fff');
    }
  }
  ellipse(ctx, hx + hr * 0.27, hy + hr * 0.2, hr * 0.09, hr * 0.07, '#ff7f9f');
  ctx.strokeStyle = lineCol;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(hx + hr * 0.17, hy + hr * 0.3, hr * 0.1, 0, Math.PI);
  ctx.arc(hx + hr * 0.37, hy + hr * 0.3, hr * 0.1, 0, Math.PI);
  ctx.stroke();
  ellipse(ctx, hx - hr * 0.2, hy + hr * 0.3, hr * 0.15, hr * 0.08, 'rgba(255,130,160,0.5)');
  ellipse(ctx, hx + hr * 0.75, hy + hr * 0.3, hr * 0.12, hr * 0.08, 'rgba(255,130,160,0.5)');
  // 수염
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.6)' : 'rgba(80,60,60,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.55, hy + hr * 0.22); ctx.lineTo(hx + hr * 1.2, hy + hr * 0.12);
  ctx.moveTo(hx + hr * 0.55, hy + hr * 0.3); ctx.lineTo(hx + hr * 1.2, hy + hr * 0.36);
  ctx.stroke();

  // 액세서리
  switch (look.accessory) {
    case 'heart':
      heart(ctx, hx + hr * 0.1, hy - hr * 1.75 + Math.sin(pose.t * 3) * hr * 0.08, hr * 0.7);
      break;
    case 'bell':
      ctx.fillStyle = '#e8384f';
      ctx.fillRect(hx - hr * 0.6, hy + hr * 0.75, hr * 1.1, hr * 0.14);
      ellipse(ctx, hx + hr * 0.05, hy + hr * 1.0, hr * 0.17, hr * 0.17, '#ffd84d');
      break;
    case 'ribbon':
      ctx.fillStyle = '#ff5f9e';
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.2, hy - hr * 0.8); ctx.lineTo(hx - hr * 0.6, hy - hr * 1.15); ctx.lineTo(hx - hr * 0.55, hy - hr * 0.5); ctx.closePath();
      ctx.moveTo(hx - hr * 0.2, hy - hr * 0.8); ctx.lineTo(hx + hr * 0.15, hy - hr * 1.2); ctx.lineTo(hx + hr * 0.2, hy - hr * 0.55); ctx.closePath();
      ctx.fill();
      ellipse(ctx, hx - hr * 0.2, hy - hr * 0.8, hr * 0.12, hr * 0.12, '#ff2f7e');
      break;
    case 'crown': {
      const cx = hx + hr * 0.1;
      const cy = hy - hr * 0.95;
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.4, cy); ctx.lineTo(cx - hr * 0.45, cy - hr * 0.45); ctx.lineTo(cx - hr * 0.2, cy - hr * 0.2);
      ctx.lineTo(cx, cy - hr * 0.55); ctx.lineTo(cx + hr * 0.2, cy - hr * 0.2); ctx.lineTo(cx + hr * 0.45, cy - hr * 0.45);
      ctx.lineTo(cx + hr * 0.4, cy); ctx.closePath(); ctx.fill();
      ellipse(ctx, cx, cy - hr * 0.15, hr * 0.08, hr * 0.08, '#4aa3ff');
      break;
    }
  }

  // 공격 이펙트(근접)
  if (pose.swing > 0.5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(s * 1.3, -s * 0.8 + ly, s * 0.7, -0.9, 0.9);
    ctx.stroke();
  }
  ctx.restore();
}


/** 정면 얼굴 초상화 (로비·아이콘용). 원점 = 머리 중심, R = 머리 반지름 */
export function drawCatFace(ctx: Ctx, look: CatLook, R: number, t = 0): void {
  const p = look.pattern;
  const white = look.belly ?? '#fffaf2';
  const accent = look.patch ?? look.base;
  const kit = look.kitten ? 1.2 : 1.1;
  const earCol = (side: number) => p === 'bicolor' || p === 'point' ? accent : p === 'calico' ? (side < 0 ? accent : look.patch2 ?? '#333') : look.base;
  ctx.save();
  // 가슴
  ellipse(ctx, 0, R * 1.35, R * 0.95, R * 0.75, p === 'bicolor' || p === 'tuxedo' || p === 'calico' ? white : p === 'point' ? look.base : look.base);
  if (p === 'bicolor') {
    ellipse(ctx, -R * 0.95, R * 1.5, R * 0.4, R * 0.6, accent);
    ellipse(ctx, R * 0.95, R * 1.5, R * 0.4, R * 0.6, accent);
  }
  if (p === 'tabby' || p === 'tortie') ellipse(ctx, 0, R * 1.25, R * 0.5, R * 0.5, look.belly ?? look.base);
  // 귀
  for (const side of [-1, 1]) {
    if (look.fold) {
      ellipse(ctx, side * R * 0.5, -R * 0.72, R * 0.36, R * 0.2, earCol(side), side * 0.5);
      continue;
    }
    ctx.fillStyle = earCol(side);
    ctx.beginPath();
    ctx.moveTo(side * R * 0.92, -R * 0.15);
    ctx.lineTo(side * R * 0.78 * kit, -R * 1.42 * kit);
    ctx.lineTo(side * R * 0.08, -R * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7b5c4';
    ctx.beginPath();
    ctx.moveTo(side * R * 0.78, -R * 0.35);
    ctx.lineTo(side * R * 0.74 * kit, -R * 1.2 * kit);
    ctx.lineTo(side * R * 0.28, -R * 0.8);
    ctx.closePath();
    ctx.fill();
    if (look.fluffy || look.kitten) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side * R * (0.6 - i * 0.08), -R * (0.55 + i * 0.12)); ctx.lineTo(side * R * (0.7 - i * 0.06), -R * (0.85 + i * 0.1)); ctx.stroke(); }
    }
  }
  // 머리
  const hx = R * 1.02;
  const hy = R * 0.9;
  ellipse(ctx, 0, 0, hx, hy, look.base);
  clipEllipse(ctx, 0, 0, hx, hy, () => {
    if (p === 'bicolor') {
      ellipse(ctx, 0, -R * 0.15, hx * 1.05, hy * 0.95, accent);
      if (look.stripe) {
        ctx.strokeStyle = look.stripe;
        ctx.lineWidth = R * 0.06;
        for (const dx of [-0.42, -0.28, 0.28, 0.42]) { ctx.beginPath(); ctx.moveTo(dx * R, -R * 0.9); ctx.lineTo(dx * R * 0.9, -R * 0.45); ctx.stroke(); }
        for (const side of [-1, 1]) for (const dy of [0.05, 0.25]) {
          ctx.beginPath(); ctx.moveTo(side * R * 1.0, dy * R); ctx.quadraticCurveTo(side * R * 0.85, dy * R - R * 0.05, side * R * 0.7, dy * R + R * 0.02); ctx.stroke();
        }
      }
      // 흰 ㅅ자: 이마에서 코·입으로 넓어짐
      ctx.fillStyle = look.base;
      ctx.beginPath();
      ctx.moveTo(-R * 0.06, -R * 0.95);
      ctx.lineTo(R * 0.06, -R * 0.95);
      ctx.quadraticCurveTo(R * 0.2, -R * 0.2, R * 0.62, R * 0.25);
      ctx.lineTo(-R * 0.62, R * 0.25);
      ctx.quadraticCurveTo(-R * 0.2, -R * 0.2, -R * 0.06, -R * 0.95);
      ctx.fill();
      ellipse(ctx, 0, R * 0.55, R * 0.75, R * 0.5, look.base);
    }
    if (p === 'tabby' && look.stripe) {
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = R * 0.09;
      for (const dx of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(dx * R, -R * 0.9); ctx.lineTo(dx * R, -R * 0.45); ctx.stroke(); }
      for (const side of [-1, 1]) for (const dy of [0, 0.22]) { ctx.beginPath(); ctx.moveTo(side * R, dy * R); ctx.lineTo(side * R * 0.68, dy * R + R * 0.04); ctx.stroke(); }
    }
    if (p === 'calico') {
      ellipse(ctx, -R * 0.6, -R * 0.45, R * 0.6, R * 0.55, accent);
      ellipse(ctx, R * 0.65, -R * 0.5, R * 0.5, R * 0.5, look.patch2 ?? '#333');
    }
    if (p === 'tortie') { ellipse(ctx, R * 0.45, -R * 0.4, R * 0.45, R * 0.4, accent); ellipse(ctx, -R * 0.6, R * 0.2, R * 0.35, R * 0.3, accent); }
    if (p === 'point') ellipse(ctx, 0, R * 0.25, R * 0.62, R * 0.6, accent);
    if (p === 'tuxedo') {
      ctx.fillStyle = white;
      ctx.beginPath(); ctx.moveTo(-R * 0.08, -R * 0.5); ctx.lineTo(R * 0.08, -R * 0.5); ctx.lineTo(R * 0.5, R * 0.3); ctx.lineTo(-R * 0.5, R * 0.3); ctx.fill();
      ellipse(ctx, 0, R * 0.55, R * 0.62, R * 0.42, white);
    }
    if (look.belly && (p === 'tabby' || p === 'tortie')) ellipse(ctx, 0, R * 0.55, R * 0.5, R * 0.36, white);
  });
  // 볼털 (아기 고양이/장모)
  if (look.fluffy) for (const side of [-1, 1]) ellipse(ctx, side * R * 0.95, R * 0.4, R * 0.25, R * 0.3, look.belly ?? look.base);

  // 눈
  const dark = p === 'tuxedo' || p === 'tortie';
  const ex = R * 0.4;
  const ey = -R * 0.05;
  const erx = R * 0.2 * kit;
  const ery = R * 0.22 * kit;
  for (const side of [-1, 1]) {
    ellipse(ctx, side * ex, ey, erx * 1.12, ery * 1.12, dark ? '#1a1418' : '#5a3a2a');
    const g = ctx.createRadialGradient(side * ex, ey + ery * 0.3, 1, side * ex, ey, ery);
    g.addColorStop(0, '#f2f0c8'); g.addColorStop(1, look.eye);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(side * ex, ey, erx, ery, 0, 0, Math.PI * 2); ctx.fill();
    ellipse(ctx, side * ex, ey + ery * 0.05, erx * 0.55, ery * 0.72, '#141016');
    ellipse(ctx, side * ex + erx * 0.3, ey - ery * 0.35, erx * 0.28, erx * 0.28, '#fff');
    ellipse(ctx, side * ex - erx * 0.3, ey + ery * 0.35, erx * 0.12, erx * 0.12, '#fff');
  }
  // 코 / 입
  ctx.fillStyle = '#f0a0a8';
  ctx.beginPath();
  ctx.moveTo(-R * 0.12, R * 0.22);
  ctx.quadraticCurveTo(0, R * 0.16, R * 0.12, R * 0.22);
  ctx.quadraticCurveTo(R * 0.08, R * 0.33, 0, R * 0.36);
  ctx.quadraticCurveTo(-R * 0.08, R * 0.33, -R * 0.12, R * 0.22);
  ctx.fill();
  ctx.strokeStyle = dark ? '#ddd' : '#8a5a5a';
  ctx.lineWidth = Math.max(1, R * 0.035);
  ctx.beginPath();
  ctx.moveTo(0, R * 0.36); ctx.lineTo(0, R * 0.43);
  ctx.arc(-R * 0.08, R * 0.43, R * 0.08, 0, Math.PI * 0.9);
  ctx.moveTo(0, R * 0.43);
  ctx.arc(R * 0.08, R * 0.43, R * 0.08, Math.PI * 0.1, Math.PI, false);
  ctx.stroke();
  ellipse(ctx, -R * 0.55, R * 0.3, R * 0.14, R * 0.08, 'rgba(255,130,160,0.4)');
  ellipse(ctx, R * 0.55, R * 0.3, R * 0.14, R * 0.08, 'rgba(255,130,160,0.4)');
  // 수염
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(0.8, R * 0.02);
  for (const side of [-1, 1]) for (const a of [-0.12, 0.05, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(side * R * 0.3, R * 0.38);
    ctx.quadraticCurveTo(side * R * 0.8, R * (0.3 + a), side * R * 1.35, R * (0.3 + a * 2));
    ctx.stroke();
  }
  // 액세서리
  switch (look.accessory) {
    case 'heart': heart(ctx, 0, -R * 1.55 + Math.sin(t * 3) * R * 0.05, R * 0.55); break;
    case 'scarf': ellipse(ctx, 0, R * 0.95, R * 0.8, R * 0.18, '#e8384f'); break;
    case 'bell':
      ellipse(ctx, 0, R * 0.92, R * 0.75, R * 0.1, '#e8384f');
      ellipse(ctx, 0, R * 1.08, R * 0.14, R * 0.14, '#ffd84d');
      break;
    case 'ribbon':
      ctx.fillStyle = '#ff5f9e';
      ctx.beginPath();
      ctx.moveTo(-R * 0.5, -R * 0.75); ctx.lineTo(-R * 0.85, -R * 1.0); ctx.lineTo(-R * 0.8, -R * 0.5); ctx.closePath();
      ctx.moveTo(-R * 0.5, -R * 0.75); ctx.lineTo(-R * 0.2, -R * 1.05); ctx.lineTo(-R * 0.22, -R * 0.55); ctx.closePath();
      ctx.fill();
      break;
    case 'crown': {
      const cy = -R * 0.85;
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.moveTo(-R * 0.35, cy); ctx.lineTo(-R * 0.42, cy - R * 0.4); ctx.lineTo(-R * 0.18, cy - R * 0.18);
      ctx.lineTo(0, cy - R * 0.5); ctx.lineTo(R * 0.18, cy - R * 0.18); ctx.lineTo(R * 0.42, cy - R * 0.4);
      ctx.lineTo(R * 0.35, cy); ctx.closePath(); ctx.fill();
      break;
    }
  }
  ctx.restore();
}


// ───────────── 만화 스타일 렌더링: 굵은 외곽선 + 부드러운 명암 ─────────────

interface ToonBuf { a: HTMLCanvasElement; b: HTMLCanvasElement; }
const toonBufs = new Map<string, ToonBuf>();

function buf(key: string, w: number, h: number): ToonBuf {
  let t = toonBufs.get(key);
  if (!t) {
    t = { a: document.createElement('canvas'), b: document.createElement('canvas') };
    toonBufs.set(key, t);
  }
  for (const c of [t.a, t.b]) {
    if (c.width < w) c.width = w;
    if (c.height < h) c.height = h;
  }
  return t;
}

export interface ToonOpt { outline?: string; width?: number; shade?: boolean; }

/**
 * box(로컬 좌표) 안에 draw로 그린 그림을 따로 그린 뒤,
 * 아래로 갈수록 어두워지는 명암과 실루엣 외곽선을 입혀서 ctx에 찍는다.
 */
export function drawToon(ctx: Ctx, key: string, box: { x: number; y: number; w: number; h: number }, draw: (c: Ctx) => void, opt: ToonOpt = {}): void {
  const tr = ctx.getTransform();
  const k = Math.min(4, Math.max(1, Math.hypot(tr.a, tr.b)));
  const pw = Math.ceil(box.w * k);
  const ph = Math.ceil(box.h * k);
  if (pw <= 0 || ph <= 0) return;
  const { a, b } = buf(key, pw, ph);
  const ac = a.getContext('2d')!;
  const bc = b.getContext('2d')!;
  ac.setTransform(1, 0, 0, 1, 0, 0);
  ac.globalCompositeOperation = 'source-over';
  ac.clearRect(0, 0, pw, ph);
  ac.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  draw(ac);
  ac.setTransform(1, 0, 0, 1, 0, 0);
  if (opt.shade !== false) {
    ac.globalCompositeOperation = 'source-atop';
    const g = ac.createLinearGradient(0, 0, pw * 0.3, ph);
    g.addColorStop(0, 'rgba(255,255,255,0.18)');
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(70,30,50,0.26)');
    ac.fillStyle = g;
    ac.fillRect(0, 0, pw, ph);
    ac.globalCompositeOperation = 'source-over';
  }
  bc.setTransform(1, 0, 0, 1, 0, 0);
  bc.globalCompositeOperation = 'source-over';
  bc.clearRect(0, 0, pw, ph);
  bc.drawImage(a, 0, 0, pw, ph, 0, 0, pw, ph);
  bc.globalCompositeOperation = 'source-in';
  bc.fillStyle = opt.outline ?? '#3b2228';
  bc.fillRect(0, 0, pw, ph);
  bc.globalCompositeOperation = 'source-over';

  const ow = opt.width ?? 2;
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    ctx.drawImage(b, 0, 0, pw, ph, box.x + Math.cos(ang) * ow, box.y + Math.sin(ang) * ow, box.w, box.h);
  }
  ctx.drawImage(a, 0, 0, pw, ph, box.x, box.y, box.w, box.h);
}

/** 옆모습을 만화 스타일로 (원점 = 발밑, s = 크기) */
export function drawCatLookToon(ctx: Ctx, key: string, look: CatLook, s: number, pose: CatPose, width = 2): void {
  drawToon(ctx, key, { x: -s * 2.3, y: -s * 3.4, w: s * 4.8, h: s * 3.7 }, (c) => drawCatLook(c, look, s, pose), { width });
}

/** 뒷모습을 만화 스타일로 */
export function drawCatBackToon(ctx: Ctx, key: string, look: CatLook, s: number, t: number, opt: { sleep: boolean; swing: number }, width = 2.2): void {
  drawToon(ctx, key, { x: -s * 1.8, y: -s * 3.9, w: s * 3.9, h: s * 4.1 }, (c) => drawCatBack(c, look, s, t, opt), { width });
}

/** 정면 얼굴을 만화 스타일로 (원점 = 머리 중심) */
export function drawCatFaceToon(ctx: Ctx, key: string, look: CatLook, R: number, t = 0, width = Math.max(1.2, R * 0.07)): void {
  drawToon(ctx, key, { x: -R * 1.75, y: -R * 2.15, w: R * 3.5, h: R * 4.3 }, (c) => drawCatFace(c, look, R, t), { width });
}

/** 메뉴용 초상화: 캔버스 중앙에 고양이 얼굴을 그린다 */
export function drawCatPortrait(canvas: HTMLCanvasElement, look: CatLook, t = 0): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(cssW * dpr)) {
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const R = Math.min(cssW, cssH) * 0.27;
  ctx.setTransform(dpr, 0, 0, dpr, dpr * (cssW / 2), dpr * (cssH * 0.52));
  drawCatFaceToon(ctx, 'portrait', look, R, t);
}

/** 뒷모습 (전투 화면 아래쪽에서 적을 바라보는 고양이). 발밑 중앙이 원점. */
export function drawCatBack(ctx: Ctx, look: CatLook, s: number, t: number, opt: { sleep: boolean; swing: number }): void {
  const p = look.pattern;
  const white = look.belly ?? '#fffaf2';
  const accent = look.patch ?? look.base;
  const tailColor = p === 'bicolor' || p === 'point' || p === 'calico' ? accent : look.base;
  const earL = p === 'bicolor' || p === 'point' || p === 'calico' ? accent : look.base;
  const earR = p === 'calico' ? (look.patch2 ?? accent) : earL;
  const fluffy = !!look.fluffy;
  const breathe = opt.sleep ? Math.sin(t * 2) * 0.03 : Math.sin(t * 3) * 0.015;
  const bodyRx = s * (fluffy ? 0.95 : 0.82) * (1 + breathe);
  const bodyRy = s * (look.shortLegs ? 0.66 : 0.76);
  const by = -bodyRy;
  const hr = s * (fluffy ? 0.7 : look.kitten ? 0.72 : 0.66);
  const hy = by - bodyRy * 0.78 - hr * 0.55 + (opt.sleep ? s * 0.22 : 0) - opt.swing * s * 0.12;
  const hx = opt.sleep ? s * 0.08 : 0;

  ctx.save();
  // 꼬리 (바닥에 말아둔 모양)
  ctx.lineCap = 'round';
  ctx.strokeStyle = tailColor;
  ctx.lineWidth = s * (fluffy ? 0.42 : 0.26);
  const sw = opt.sleep ? 0 : Math.sin(t * 3.2) * s * 0.25;
  ctx.beginPath();
  ctx.moveTo(s * 0.3, -s * 0.15);
  ctx.quadraticCurveTo(s * 1.25, -s * 0.05, s * 1.05 + sw * 0.4, -s * 0.85 + sw);
  ctx.stroke();
  if (p === 'tabby' && look.stripe) {
    ctx.strokeStyle = look.stripe;
    ctx.setLineDash([s * 0.12, s * 0.2]);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.15);
    ctx.quadraticCurveTo(s * 1.25, -s * 0.05, s * 1.05 + sw * 0.4, -s * 0.85 + sw);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 몸통
  ellipse(ctx, 0, by, bodyRx, bodyRy, look.base);
  clipEllipse(ctx, 0, by, bodyRx, bodyRy, () => {
    if (p === 'bicolor') {
      ellipse(ctx, 0, by - bodyRy * 0.35, bodyRx * 0.95, bodyRy * 0.85, accent);
      if (look.stripe) {
        ctx.strokeStyle = look.stripe;
        ctx.lineWidth = s * 0.08;
        for (let i = -2; i <= 1; i++) { const yy = by - bodyRy * 0.7 + i * bodyRy * 0.25; ctx.beginPath(); ctx.moveTo(-bodyRx * 0.8, yy + s * 0.06); ctx.quadraticCurveTo(0, yy - s * 0.1, bodyRx * 0.8, yy + s * 0.06); ctx.stroke(); }
      }
    }
    if (p === 'calico') {
      ellipse(ctx, -bodyRx * 0.45, by - bodyRy * 0.2, bodyRx * 0.55, bodyRy * 0.55, accent);
      ellipse(ctx, bodyRx * 0.5, by + bodyRy * 0.15, bodyRx * 0.45, bodyRy * 0.5, look.patch2 ?? '#333');
    }
    if (p === 'tortie') {
      for (const [x, y, r] of [[-0.5, -0.3, 0.32], [0.4, -0.1, 0.28], [-0.1, 0.4, 0.3]] as const) ellipse(ctx, bodyRx * x, by + bodyRy * y, bodyRx * r, bodyRy * r, accent);
    }
    if (p === 'point') ellipse(ctx, 0, by + bodyRy * 0.9, bodyRx, bodyRy * 0.4, accent);
    if (p === 'tabby' && look.stripe) {
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = s * 0.11;
      for (let i = -2; i <= 2; i++) {
        const yy = by + i * bodyRy * 0.32;
        ctx.beginPath();
        ctx.moveTo(-bodyRx, yy + s * 0.08);
        ctx.quadraticCurveTo(0, yy - s * 0.12, bodyRx, yy + s * 0.08);
        ctx.stroke();
      }
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = s * 0.14;
      ctx.beginPath(); ctx.moveTo(0, by - bodyRy); ctx.lineTo(0, by + bodyRy * 0.6); ctx.stroke();
    }
  });
  // 뒷발
  const pawCol = p === 'bicolor' || p === 'tuxedo' || p === 'calico' ? white : p === 'point' ? accent : look.base;
  ellipse(ctx, -bodyRx * 0.55, -s * 0.06, s * 0.24, s * 0.13, pawCol);
  ellipse(ctx, bodyRx * 0.55, -s * 0.06, s * 0.24, s * 0.13, pawCol);

  // 공격할 때 앞발을 번쩍
  if (opt.swing > 0.05) {
    const lift = opt.swing;
    ctx.strokeStyle = p === 'bicolor' ? accent : look.base;
    ctx.lineWidth = s * 0.22;
    ctx.beginPath();
    ctx.moveTo(bodyRx * 0.55, by - bodyRy * 0.3);
    ctx.lineTo(bodyRx * 0.8, by - bodyRy * 0.3 - s * 0.9 * lift);
    ctx.stroke();
    ellipse(ctx, bodyRx * 0.8, by - bodyRy * 0.3 - s * 0.9 * lift, s * 0.16, s * 0.16, pawCol);
  }

  // 목털 / 스카프 / 방울
  if (fluffy) {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.05 + i * 0.15);
      ellipse(ctx, hx + Math.cos(a) * hr * 0.95, hy + hr * 0.75 - Math.sin(a) * hr * 0.15, hr * 0.3, hr * 0.26, look.base);
    }
  }

  // 귀
  const ear = (dir: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    if (look.fold) {
      ctx.ellipse(hx + dir * hr * 0.55, hy - hr * 0.72, hr * 0.32, hr * 0.18, dir * 0.4, 0, Math.PI * 2);
    } else {
      ctx.moveTo(hx + dir * hr * 0.92, hy - hr * 0.25);
      ctx.lineTo(hx + dir * hr * 0.72, hy - hr * 1.32);
      ctx.lineTo(hx + dir * hr * 0.1, hy - hr * 0.82);
    }
    ctx.fill();
    if (fluffy && !look.fold) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(hx + dir * hr * 0.72, hy - hr * 1.32); ctx.lineTo(hx + dir * hr * 0.76, hy - hr * 1.6); ctx.stroke();
    }
  };
  ear(-1, earL);
  ear(1, earR);

  // 머리 (뒤통수)
  ellipse(ctx, hx, hy, hr, hr * 0.95, look.base);
  clipEllipse(ctx, hx, hy, hr, hr * 0.95, () => {
    if (p === 'bicolor') {
      ellipse(ctx, hx, hy - hr * 0.1, hr * 1.05, hr * 0.95, accent);
      if (look.stripe) {
        ctx.strokeStyle = look.stripe;
        ctx.lineWidth = hr * 0.09;
        for (const dx of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(hx + dx * hr, hy - hr); ctx.lineTo(hx + dx * hr * 0.8, hy + hr * 0.05); ctx.stroke(); }
      }
    }
    if (p === 'calico') {
      ellipse(ctx, hx - hr * 0.55, hy - hr * 0.3, hr * 0.6, hr * 0.6, accent);
      ellipse(ctx, hx + hr * 0.6, hy - hr * 0.4, hr * 0.5, hr * 0.5, look.patch2 ?? '#333');
    }
    if (p === 'tortie') ellipse(ctx, hx + hr * 0.4, hy - hr * 0.3, hr * 0.45, hr * 0.4, accent);
    if (p === 'point') ellipse(ctx, hx, hy + hr * 0.3, hr * 1.1, hr * 0.6, '#00000022');
    if (p === 'tabby' && look.stripe) {
      ctx.strokeStyle = look.stripe;
      ctx.lineWidth = hr * 0.13;
      for (const dx of [-0.3, 0, 0.3]) {
        ctx.beginPath(); ctx.moveTo(hx + dx * hr, hy - hr); ctx.lineTo(hx + dx * hr * 0.8, hy + hr * 0.1); ctx.stroke();
      }
    }
  });
  // 볼살이 살짝 보이게
  ellipse(ctx, hx - hr * 0.88, hy + hr * 0.25, hr * 0.18, hr * 0.14, p === 'bicolor' || p === 'tuxedo' ? white : look.base);
  ellipse(ctx, hx + hr * 0.88, hy + hr * 0.25, hr * 0.18, hr * 0.14, p === 'bicolor' || p === 'tuxedo' ? white : look.base);

  switch (look.accessory) {
    case 'heart':
      heart(ctx, hx, hy - hr * 1.9 + Math.sin(t * 3) * hr * 0.1, hr * 0.75);
      break;
    case 'scarf': {
      ellipse(ctx, hx, hy + hr * 0.92, hr * 0.85, hr * 0.22, '#e8384f');
      const flap = Math.sin(t * 7) * 2;
      ctx.fillStyle = '#e8384f';
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.2, hy + hr * 0.95);
      ctx.lineTo(hx - hr * 0.45 + flap, hy + hr * 1.7);
      ctx.lineTo(hx + hr * 0.05 + flap, hy + hr * 1.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'bell':
      ellipse(ctx, hx, hy + hr * 0.92, hr * 0.8, hr * 0.14, '#e8384f');
      break;
    case 'ribbon':
      ctx.fillStyle = '#ff5f9e';
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.3, hy - hr * 0.75); ctx.lineTo(hx - hr * 0.05, hy - hr * 1.1); ctx.lineTo(hx + hr * 0.0, hy - hr * 0.45); ctx.closePath();
      ctx.moveTo(hx + hr * 0.3, hy - hr * 0.75); ctx.lineTo(hx + hr * 0.7, hy - hr * 1.1); ctx.lineTo(hx + hr * 0.65, hy - hr * 0.45); ctx.closePath();
      ctx.fill();
      break;
    case 'crown': {
      const cy = hy - hr * 0.9;
      ctx.fillStyle = '#ffd84d';
      ctx.beginPath();
      ctx.moveTo(hx - hr * 0.4, cy); ctx.lineTo(hx - hr * 0.45, cy - hr * 0.45); ctx.lineTo(hx - hr * 0.2, cy - hr * 0.2);
      ctx.lineTo(hx, cy - hr * 0.55); ctx.lineTo(hx + hr * 0.2, cy - hr * 0.2); ctx.lineTo(hx + hr * 0.45, cy - hr * 0.45);
      ctx.lineTo(hx + hr * 0.4, cy); ctx.closePath(); ctx.fill();
      break;
    }
  }
  ctx.restore();
}
