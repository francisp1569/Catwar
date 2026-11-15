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

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
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
    if (p === 'bicolor') ellipse(ctx, -s * 0.15, by - s * 0.38, bw * 0.95, s * 0.48, accentA);
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
  const hr = s * (look.fluffy ? 0.66 : 0.62);
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
      ellipse(ctx, hx + hr * 0.26, hy - hr * 0.25, hr * 0.13, hr * 0.48, look.base); // 흰 이마 줄
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
      ellipse(ctx, hx + ex * hr, hy - hr * 0.05, hr * 0.16, hr * 0.21, look.eye);
      ellipse(ctx, hx + ex * hr + hr * 0.02, hy - hr * 0.03, hr * 0.07, hr * 0.17, '#1e1820');
      ellipse(ctx, hx + ex * hr + hr * 0.05, hy - hr * 0.13, hr * 0.05, hr * 0.05, '#fff');
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

/** 메뉴용 초상화: 캔버스 중앙에 고양이를 그린다 */
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
  const s = Math.min(cssW, cssH) * 0.3;
  ctx.setTransform(dpr, 0, 0, dpr, dpr * (cssW / 2 - s * 0.1), dpr * (cssH * 0.86));
  drawCatLook(ctx, look, s, { ...IDLE_POSE, t });
}
