// 플레이어 진행 상황 (브라우저 localStorage에 저장)
import { CAT_BY_ID, HERO_ID, STARTER_IDS, type Rarity } from '../data/cats';
import { SLOTS, type Slot } from '../data/items';

export interface OwnedCat { level: number; stars: number; shards: number; }

export interface Item {
  uid: number;
  slot: Slot;
  rarity: Rarity;
  level: number;
}

export interface SaveData {
  version: 1;
  coins: number;   // 🪙 레벨업 재화
  tuna: number;    // 🥫 참치캔: 뽑기 재화
  yarn: number;    // 🧶 털실: 장비 강화 재료
  exp: number;     // 집사 경험치
  cats: Record<string, OwnedCat>;
  deck: string[];  // 주인공 제외 최대 4마리
  stages: Record<string, number>; // 스테이지 id → 최고 별 개수
  pulls: number;
  items: Item[];
  equip: Partial<Record<Slot, number>>; // 부위 → 아이템 uid
  nextItemUid: number;
  napAt: number;       // 낮잠 보상 마지막 수령 시각(ms)
  freeDay: string;     // 무료 상자를 받은 날짜 (YYYY-MM-DD)
  selectedStage: string;
  seen: string[];      // 발견한 적 종류
}

const KEY = 'catwar.save.v1';
export const DECK_SIZE = 5;

export function newSave(): SaveData {
  const cats: Record<string, OwnedCat> = {};
  for (const id of [HERO_ID, ...STARTER_IDS]) cats[id] = { level: 1, stars: 1, shards: 0 };
  return {
    version: 1, coins: 300, tuna: 300, yarn: 0, exp: 0, cats, deck: [...STARTER_IDS], stages: {}, pulls: 0,
    // 시작 장비: 기본 목걸이와 장난감
    items: [{ uid: 1, slot: 'collar', rarity: 'N', level: 1 }, { uid: 2, slot: 'toy', rarity: 'N', level: 1 }],
    equip: { collar: 1, toy: 2 }, nextItemUid: 3, napAt: Date.now(), freeDay: '', selectedStage: 's1', seen: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveData;
      if (data && data.version === 1 && data.cats && data.cats[HERO_ID]) {
        // 예전 저장 데이터에 새 항목 채우기
        const base = newSave();
        data.yarn ??= 0;
        data.exp ??= 0;
        if (!Array.isArray(data.items)) { data.items = base.items; data.equip = base.equip; data.nextItemUid = base.nextItemUid; }
        data.equip ??= {};
        data.nextItemUid ??= Math.max(0, ...data.items.map((i) => i.uid)) + 1;
        data.napAt ??= Date.now();
        data.freeDay ??= '';
        data.selectedStage ??= 's1';
        data.seen ??= [];
        for (const id of Object.keys(data.cats)) if (!CAT_BY_ID[id]) delete data.cats[id];
        data.deck = data.deck.filter((id) => data.cats[id] && id !== HERO_ID).slice(0, DECK_SIZE);
        for (const s of SLOTS) if (data.equip[s] !== undefined && !data.items.some((i) => i.uid === data.equip[s])) delete data.equip[s];
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
