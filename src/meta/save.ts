// 플레이어 진행 상황 (브라우저 localStorage에 저장)
import { CAT_BY_ID, HERO_ID, STARTER_IDS } from '../data/cats';

export interface OwnedCat { level: number; stars: number; shards: number; }

export interface SaveData {
  version: 1;
  coins: number;   // 🪙 레벨업 재화
  tuna: number;    // 🥫 참치캔: 뽑기 재화
  cats: Record<string, OwnedCat>;
  deck: string[];  // 주인공 제외 최대 4마리
  stages: Record<string, number>; // 스테이지 id → 최고 별 개수
  pulls: number;
}

const KEY = 'catwar.save.v1';
export const DECK_SIZE = 4;

export function newSave(): SaveData {
  const cats: Record<string, OwnedCat> = {};
  for (const id of [HERO_ID, ...STARTER_IDS]) cats[id] = { level: 1, stars: 1, shards: 0 };
  return { version: 1, coins: 300, tuna: 300, cats, deck: [...STARTER_IDS], stages: {}, pulls: 0 };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveData;
      if (data && data.version === 1 && data.cats && data.cats[HERO_ID]) {
        // 알 수 없는 고양이 id 정리
        for (const id of Object.keys(data.cats)) if (!CAT_BY_ID[id]) delete data.cats[id];
        data.deck = data.deck.filter((id) => data.cats[id] && id !== HERO_ID).slice(0, DECK_SIZE);
        return data;
      }
    }
  } catch {
    /* 저장소를 쓸 수 없으면 새로 시작 */
  }
  return newSave();
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 사생활 보호 모드 등 */
  }
}

export function resetSave(): SaveData {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  return newSave();
}
