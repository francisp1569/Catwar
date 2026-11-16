// 처음 시작할 때 보여주는 스토리 컷씬 (터치로 넘기기, 건너뛰기 가능)
import { sound } from './audio';

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

const CUTS: Cut[] = [
  {
    bg: `${W}bg/lobby.jpg`, bgCls: 'kb-in',
    layers: [
      { src: `${W}props/girl-happy.webp`, cls: 'st-girl pop' },
      { src: 'art/cats/godeungeo-face.jpg', cls: 'st-face f1 float', delay: 0.4 },
      { src: 'art/cats/huindungi-face.jpg', cls: 'st-face f2 float', delay: 0.6 },
      { src: 'art/cats/cheese-face.jpg', cls: 'st-face f3 float', delay: 0.8 },
    ],
    text: '여기는 집사 누나와 고양이들이 함께 사는 평화로운 집.',
    sfx: ['meow-hi'],
  },
  {
    bg: '', bgCls: 'black',
    layers: [{
      // 벽 그림 위에 쥐구멍 위치(가로 17%/50%/83%, 세로 8.5%)에 맞춰 눈빛을 띄운다
      html: `<img src="${W}bg/entrance.jpg" alt="">${[17.2, 50, 83].map((x, i) => `<span class="st-eyes" style="left:${x}%;animation-delay:${0.4 + i * 0.5}s"><i></i><i></i></span>`).join('')}`,
      cls: 'st-wall',
    }],
    text: '그런데 어느 날 밤… 벽 너머 쥐구멍에서 수상한 눈빛들이 반짝였다.',
    sfx: ['discover'],
  },
  {
    bg: `${W}bg/entrance.jpg`, bgCls: 'night',
    layers: [
      { src: `${W}enemies/ant.webp`, cls: 'st-en e1 walk', delay: 0.2 },
      { src: `${W}enemies/roach.webp`, cls: 'st-en e2 walk', delay: 0.35 },
      { src: `${W}enemies/mouse.webp`, cls: 'st-en e3 walk', delay: 0.5 },
      { src: `${W}enemies/mouse.webp`, cls: 'st-en e4 walk flip', delay: 0.6 },
      { src: `${W}enemies/ratking.webp`, cls: 'st-boss slam', delay: 0.9 },
    ],
    speaker: '대왕쥐',
    text: '찍찍! 이 집 간식은 오늘부터 전부 우리 「찍찍 도적단」 거다! 몽땅 털어라!',
    sfx: ['boss'],
    shake: true,
  },
  {
    bg: `${W}bg/lobby.jpg`, bgCls: 'kb-in dim',
    layers: [{ src: `${W}props/girl-cry.webp`, cls: 'st-girl big tremble' }],
    speaker: '집사 누나',
    text: '꺄아악! 쥐랑 벌레가 잔뜩 몰려와…! 누가 좀 도와줘!',
    sfx: ['hurt'],
  },
  {
    bg: '', bgCls: 'burst',
    layers: [
      { src: 'art/cats/cheese-full.jpg', cls: 'st-hero hero-in' },
      { html: '✦', cls: 'st-spark s1', delay: 0.5 },
      { html: '✦', cls: 'st-spark s2', delay: 0.7 },
      { html: '✦', cls: 'st-spark s3', delay: 0.9 },
    ],
    speaker: '치즈',
    text: '거기까지다냥! 집사는 이 몸, 치즈가 지킨다냥!',
    sfx: ['meow', 'levelup'],
  },
  {
    bg: `${W}bg/living.jpg`, bgCls: 'kb-in dim',
    layers: [
      { src: 'art/cats/godeungeo-face.jpg', cls: 'st-face r1 pop', delay: 0.1 },
      { src: 'art/cats/huindungi-face.jpg', cls: 'st-face r2 pop', delay: 0.25 },
      { src: 'art/cats/chaos-face.jpg', cls: 'st-face r3 pop', delay: 0.4 },
      { src: 'art/cats/tuxedo-face.jpg', cls: 'st-face r4 pop', delay: 0.55 },
      { src: 'art/cats/russianblue-face.jpg', cls: 'st-face r5 pop', delay: 0.7 },
      { html: '<b>LEVEL UP!</b><small>NEW 카드로 친구 합류</small>', cls: 'st-tag pop', delay: 1.0 },
    ],
    speaker: '치즈',
    text: '레벨업할 때마다 고양이 친구들이 하나씩 달려와 줄 거다냥. 카드를 잘 골라라냥!',
    sfx: ['meow-hi', 'card'],
  },
  {
    bg: `${W}bg/entrance.jpg`, bgCls: 'battle',
    layers: [
      { src: `${W}enemies/mouse.webp`, cls: 'st-far m1 walk', delay: 0.1 },
      { src: `${W}enemies/ant.webp`, cls: 'st-far m2 walk', delay: 0.2 },
      { src: `${W}enemies/roach.webp`, cls: 'st-far m3 walk', delay: 0.3 },
      { src: `${W}props/barricade-0.webp`, cls: 'st-barricade rise' },
      { src: 'art/cats/cheese-back.png', cls: 'st-back rise', delay: 0.2 },
    ],
    speaker: '치즈',
    text: '바리케이드가 무너지기 전에 전부 물리치자! 냥냥 방위대, 출동이다냥!',
    sfx: ['win'],
  },
];

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

  play(onDone: () => void): void {
    this.done = onDone;
    this.idx = 0;
    this.root.hidden = false;
    this.show();
  }

  private show(): void {
    const c = CUTS[this.idx];
    const last = this.idx === CUTS.length - 1;
    this.root.innerHTML = `
      <div class="st-stage ${c.shake ? 'shake' : ''}">
        <div class="st-bg ${c.bgCls ?? ''}" style="${c.bg ? `background-image:url(${c.bg})` : ''}"></div>
        ${c.layers.map((l) => {
          const st = `animation-delay:${l.delay ?? 0}s;${l.style ?? ''}`;
          return l.src ? `<img class="st-layer ${l.cls}" src="${l.src}" style="${st}" alt="">` : `<div class="st-layer ${l.cls}" style="${st}">${l.html}</div>`;
        }).join('')}
      </div>
      <button class="st-skip" data-skip>건너뛰기 ▶▶</button>
      <div class="st-dots">${CUTS.map((_, i) => `<i class="${i === this.idx ? 'on' : ''}"></i>`).join('')}</div>
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
    if (this.idx >= CUTS.length - 1) { this.finish(); return; }
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
