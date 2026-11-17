// 보상형 광고 (끝까지 보면 보상)
// - Google AdSense 'H5 게임 광고(Ad Placement API)'를 쓴다: ADS.client 에 ca-pub-… 를 넣으면 진짜 광고
// - 비어 있으면 '테스트 광고'(몇 초 기다리면 보상)로 동작해서 흐름을 미리 확인할 수 있다
import { sound } from './audio';
import { today } from './meta/gacha';
import type { SaveData } from './meta/save';

export const ADS = {
  /** AdSense 게시자 ID (예: 'ca-pub-1234567890123456'). 비우면 테스트 광고 */
  client: '',
  /** 테스트 광고 길이(초) */
  testSeconds: 4,
};

/** 하루에 광고로 받을 수 있는 횟수 */
export const AD_LIMIT: Record<AdKind, number> = { revive: 99, double: 5, cat: 3, item: 3 };
export type AdKind = 'revive' | 'double' | 'cat' | 'item';

type AdBreak = (o: Record<string, unknown>) => void;
interface AdWindow { adsbygoogle?: unknown[]; adBreak?: AdBreak; adConfig?: AdBreak }

let loaded = false;
function load(): void {
  if (loaded || !ADS.client) return;
  loaded = true;
  const w = window as unknown as AdWindow;
  const sc = document.createElement('script');
  sc.async = true;
  sc.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS.client}`;
  sc.crossOrigin = 'anonymous';
  sc.dataset.adFrequencyHint = '30s';
  document.head.appendChild(sc);
  w.adsbygoogle = w.adsbygoogle || [];
  w.adBreak = w.adConfig = (o) => { w.adsbygoogle!.push(o); };
  w.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}
load();

export const adsReal = (): boolean => !!ADS.client;

/** 보상형 광고 보여 주기 → 끝까지 봤으면 true */
export function showRewarded(name: string): Promise<boolean> {
  return ADS.client ? realAd(name) : testAd();
}

function realAd(name: string): Promise<boolean> {
  const w = window as unknown as AdWindow;
  return new Promise((done) => {
    let ok = false;
    let shown = false;
    const wasMusic = sound.musicOn;
    w.adBreak!({
      type: 'reward',
      name,
      beforeAd: () => { if (wasMusic) sound.setMusic(false); },
      afterAd: () => { if (wasMusic) sound.setMusic(true); },
      beforeReward: (showAdFn: () => void) => { shown = true; showAdFn(); },
      adDismissed: () => { ok = false; },
      adViewed: () => { ok = true; },
      adBreakDone: () => {
        if (!shown) toast('지금은 볼 수 있는 광고가 없어요. 잠시 뒤 다시 해 주세요');
        done(ok);
      },
    });
  });
}

/** 테스트용 가짜 광고: 몇 초 기다리면 보상 */
function testAd(): Promise<boolean> {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.id = 'adtest';
    let left = ADS.testSeconds;
    const paint = (): void => {
      el.innerHTML = `<div class="ad-box"><small>광고 자리 (테스트)</small><b>📺 광고 재생 중…</b>
        <p>실제 출시 땐 여기에 광고가 나와요</p>
        <button class="btn ${left > 0 ? 'off' : 'gold'}" data-ad="close">${left > 0 ? `${left}초 뒤 보상` : '보상 받기'}</button>
        <button class="ad-skip" data-ad="skip">그만 보기 (보상 없음)</button></div>`;
    };
    paint();
    document.body.appendChild(el);
    const timer = window.setInterval(() => { left--; paint(); if (left <= 0) window.clearInterval(timer); }, 1000);
    el.addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-ad]')?.dataset.ad;
      if (!a || (a === 'close' && left > 0)) return;
      window.clearInterval(timer);
      el.remove();
      done(a === 'close');
    });
  });
}

function toast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  window.setTimeout(() => t.classList.remove('show'), 2200);
}

/** 오늘 남은 광고 보상 횟수 */
export function adLeft(save: SaveData, kind: AdKind): number {
  if (save.ads?.day !== today()) return AD_LIMIT[kind];
  return Math.max(0, AD_LIMIT[kind] - (save.ads.n[kind] ?? 0));
}

export function adUse(save: SaveData, kind: AdKind): void {
  if (save.ads?.day !== today()) save.ads = { day: today(), n: {} };
  save.ads.n[kind] = (save.ads.n[kind] ?? 0) + 1;
}
