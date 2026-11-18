// 처음 시작할 때 보여주는 스토리 컷씬 (터치로 넘기기, 건너뛰기 가능)
import { getArt } from './art';
import { sound } from './audio';
import { CAT_BY_ID, HERO_ID } from './data/cats';

interface Layer {
  /** 그림 경로 (art/ 아래). 없으면 html 사용 */
  src?: string;
  html?: string;
  /** 위치·크기·애니메이션 클래스 */
  cls: string;
  /** 등장 지연(초) */
  delay?: number;
  style?: string;
}

interface Cut {
  bg: string;
  bgCls?: string;
  layers: Layer[];
  speaker?: string;
  text: string;
  sfx?: string[];
  shake?: boolean;
}

const W = 'art/world/';

const S = `${W}story/`;
const CHEESE_CUTS: Cut[] = [
  { bg: `${S}1.jpg`, bgCls: 'kb-in panel', layers: [], text: '여기는 집사 누나와 고양이들이 함께 사는 평화로운 집.', sfx: ['meow-hi'] },
  { bg: `${S}2.jpg`, bgCls: 'kb-in panel', layers: [], text: '그런데 어느 날 밤… 벽 너머 쥐구멍에서 수상한 눈빛들이 반짝였다.', sfx: ['discover'] },
  {
    bg: `${S}3.jpg`, bgCls: 'kb-in panel', layers: [],
    speaker: '대왕쥐',
    text: '찍찍! 이 집 간식은 오늘부터 전부 우리 「찍찍 도적단」 거다! 몽땅 털어라!',
    sfx: ['boss'], shake: true,
  },
  { bg: `${S}4.jpg`, bgCls: 'kb-in panel', layers: [], speaker: '집사 누나', text: '꺄아악! 쥐랑 벌레가 잔뜩 몰려와…! 누가 좀 도와줘!', sfx: ['hurt'] },
  {
    bg: `${S}5.jpg`, bgCls: 'kb-out panel',
    layers: [
      { html: '✦', cls: 'st-spark s1', delay: 0.5 },
      { html: '✦', cls: 'st-spark s2', delay: 0.7 },
      { html: '✦', cls: 'st-spark s3', delay: 0.9 },
    ],
    speaker: '치즈',
    text: '거기까지다냥! 집사는 이 몸, 치즈가 지킨다냥!',
    sfx: ['meow', 'levelup'],
  },
  {
    bg: `${S}6.jpg`, bgCls: 'kb-in panel',
    layers: [{ html: '<b>LEVEL UP!</b><small>NEW 카드로 친구 합류</small>', cls: 'st-tag pop', delay: 0.8 }],
    speaker: '치즈',
    text: '레벨업할 때마다 고양이 친구들이 하나씩 달려와 줄 거다냥. 카드를 잘 골라라냥!',
    sfx: ['meow-hi', 'card'],
  },
  { bg: `${S}7.jpg`, bgCls: 'kb-in panel', layers: [], speaker: '치즈', text: '바리케이드가 무너지기 전에 전부 물리치자! 냥냥 방위대, 출동이다냥!', sfx: ['win'] },
];


/** 대장 이름으로 대사를 바꾼다 ('치즈' → 고른 이름, 받침에 맞게 조사도) */
function named(cuts: Cut[]): Cut[] {
  const n = CAT_BY_ID[HERO_ID].name;
  return cuts.map((c) => ({
    ...c,
    speaker: c.speaker === '치즈' ? n : c.speaker,
    text: c.text.replace(/치즈가/g, n + josa(n, '이', '가')).replace(/치즈/g, n),
  }));
}
function josa(w: string, withBatchim: string, without: string): string {
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return without;
  return code % 28 ? withBatchim : without;
}

/** 치즈가 아닌 고양이를 대장으로 고르면, 대장이 나오는 컷은 그 고양이 그림으로 */
function heroCuts(): Cut[] {
  const id = HERO_ID;
  const full = getArt(id, 'full')?.src ?? getArt(id, 'face')?.src ?? '';
  const back = getArt(id, 'back')?.src ?? '';
  const friends = ['cheese', 'godeungeo', 'huindungi', 'chaos', 'tuxedo', 'russianblue'].filter((f) => f !== id).slice(0, 5);
  const cuts = CHEESE_CUTS.slice(0, 4);
  cuts.push(
    {
      bg: '', bgCls: 'burst',
      layers: [
        { src: full, cls: 'st-hero hero-in' },
        { html: '✦', cls: 'st-spark s1', delay: 0.5 },
        { html: '✦', cls: 'st-spark s2', delay: 0.7 },
        { html: '✦', cls: 'st-spark s3', delay: 0.9 },
      ],
      speaker: '치즈', text: CHEESE_CUTS[4].text, sfx: ['meow', 'levelup'],
    },
    {
      bg: `${W}bg/living.jpg`, bgCls: 'kb-in dim',
      layers: [
        ...friends.map((f, i) => ({ src: getArt(f, 'face')?.src ?? '', cls: `st-face r${i + 1} pop`, delay: 0.1 + i * 0.15 })),
        { html: '<b>LEVEL UP!</b><small>NEW 카드로 친구 합류</small>', cls: 'st-tag pop', delay: 1.0 },
      ],
      speaker: '치즈', text: CHEESE_CUTS[5].text, sfx: ['meow-hi', 'card'],
    },
    {
      bg: `${W}bg/entrance.jpg`, bgCls: 'battle',
      layers: [
        { src: `${W}enemies/mouse.webp`, cls: 'st-far m1 walk', delay: 0.1 },
        { src: `${W}enemies/ant.webp`, cls: 'st-far m2 walk', delay: 0.2 },
        { src: `${W}enemies/roach.webp`, cls: 'st-far m3 walk', delay: 0.3 },
        { src: `${W}props/barricade-0.webp`, cls: 'st-barricade rise' },
        { src: back, cls: 'st-back rise', delay: 0.2 },
      ],
      speaker: '치즈', text: CHEESE_CUTS[6].text, sfx: ['win'],
    },
  );
  return cuts;
}

/** 시작 스토리 (대장과 이름에 맞춰서) */
export function introCuts(): Cut[] {
  return named(HERO_ID === 'cheese' ? CHEESE_CUTS : heroCuts());
}

/** 2장 시작 컷씬 */
const CH2_BASE: Cut[] = [
  {
    bg: `${S}title-ch2.jpg`, bgCls: 'kb-in wide',
    layers: [{ html: '<small>CHAPTER 2</small><b>찍찍 도적단의 역습</b>', cls: 'st-chapter pop', delay: 0.3 }],
    text: '집 안에서 쫓겨난 찍찍 도적단은 그대로 물러나지 않았다…',
    sfx: ['levelup'],
  },
  {
    bg: `${S}c2-1.jpg`, bgCls: 'kb-in panel', layers: [],
    speaker: '대왕쥐',
    text: '찍찍… 집 안이 안 되면 바깥부터 포위한다! 황제 폐하께도 소식을 전해라!',
    sfx: ['boss'],
  },
  {
    bg: `${S}c2-2.jpg`, bgCls: 'kb-in panel', layers: [],
    speaker: '찍찍 도적단',
    text: '찍찍찍! 욕실 하수구, 베란다, 마당까지 전부 우리 차지다!',
    sfx: ['hurt'], shake: true,
  },
  {
    bg: `${S}c2-3.jpg`, bgCls: 'kb-out wide', layers: [],
    speaker: '치즈',
    text: '놈들이 밖에서 다시 모였다냥. 이번엔 우리가 먼저 나간다냥! 냥냥 방위대, 출동!',
    sfx: ['meow', 'win'],
  },
];

export function ch2Cuts(): Cut[] {
  const cuts = CH2_BASE.slice();
  if (HERO_ID !== 'cheese') {
    // 마지막 컷(치즈가 문을 여는 그림)은 대장 그림으로
    cuts[3] = { ...cuts[3], bg: '', bgCls: 'burst', layers: [{ src: getArt(HERO_ID, 'full')?.src ?? '', cls: 'st-hero hero-in' }] };
  }
  return named(cuts);
}

export class Story {
  private root: HTMLDivElement;
  private idx = 0;
  private typing = 0;
  private full = '';
  private shown = 0;
  private done: () => void = () => {};

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'story';
    this.root.hidden = true;
    document.body.appendChild(this.root);
    this.root.addEventListener('pointerdown', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-skip]')) { this.finish(); return; }
      this.next();
    });
  }

  private cuts: Cut[] = [];

  play(onDone: () => void, cuts: Cut[] = introCuts()): void {
    this.cuts = cuts;
    this.done = onDone;
    this.idx = 0;
    this.root.hidden = false;
    this.show();
  }

  private show(): void {
    const c = this.cuts[this.idx];
    const last = this.idx === this.cuts.length - 1;
    this.root.innerHTML = `
      <div class="st-stage ${c.shake ? 'shake' : ''}">
        <div class="st-bg ${c.bgCls ?? ''}" style="${c.bg ? `background-image:url(${c.bg})` : ''}"></div>
        ${c.layers.map((l) => {
          const st = `animation-delay:${l.delay ?? 0}s;${l.style ?? ''}`;
          return l.src ? `<img class="st-layer ${l.cls}" src="${l.src}" style="${st}" alt="">` : `<div class="st-layer ${l.cls}" style="${st}">${l.html}</div>`;
        }).join('')}
      </div>
      <button class="st-skip" data-skip>건너뛰기 ▶▶</button>
      <div class="st-dots">${this.cuts.map((_, i) => `<i class="${i === this.idx ? 'on' : ''}"></i>`).join('')}</div>
      <div class="st-box ${c.speaker ? '' : 'narr'}">
        ${c.speaker ? `<div class="st-name">${c.speaker}</div>` : ''}
        <p class="st-text"></p>
        <span class="st-next">${last ? '터치해서 출동!' : '▼'}</span>
      </div>`;
    this.full = c.text;
    this.shown = 0;
    const p = this.root.querySelector('.st-text') as HTMLElement;
    window.clearInterval(this.typing);
    this.typing = window.setInterval(() => {
      this.shown++;
      p.textContent = this.full.slice(0, this.shown);
      if (this.shown >= this.full.length) window.clearInterval(this.typing);
    }, 38);
    (c.sfx ?? []).forEach((s, i) => setTimeout(() => sound.play(s), 150 + i * 250));
  }

  private next(): void {
    if (this.shown < this.full.length) {
      // 글자가 다 나오기 전에 누르면 한 번에 다 보여준다
      this.shown = this.full.length;
      window.clearInterval(this.typing);
      (this.root.querySelector('.st-text') as HTMLElement).textContent = this.full;
      return;
    }
    sound.play('click');
    if (this.idx >= this.cuts.length - 1) { this.finish(); return; }
    this.idx++;
    this.show();
  }

  private finish(): void {
    window.clearInterval(this.typing);
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.done();
  }
}

export const story = new Story();
