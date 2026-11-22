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

export interface DailyState {
  day: string;
  missions: { id: string; prog: number; done: boolean }[];
  bonusDone: boolean;
  /** 출석: 받은 날 수 (7일 주기) 와 마지막으로 받은 날 */
  att: number;
  attDay: string;
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
  introSeen?: boolean; // 시작 스토리를 봤는지
  tutorialDone?: boolean; // 첫 판 안내를 끝냈는지
  hardMode?: boolean;  // 로비에서 어려움 모드 선택
  ch2Seen?: boolean;   // 2장 컷씬을 봤는지
  cloudAsked?: boolean; // 첫 승리 뒤 '이메일로 저장 지키기'를 권했는지
  guide?: number;       // 첫 승리 뒤 로비 안내 단계 (0=끝)
  ads?: { day: string; n: Record<string, number> }; // 오늘 광고로 받은 횟수
  daily?: DailyState;   // 출석·일일 미션
  aimLearned?: boolean; // 대장 조준을 한 번이라도 써 봤는지
  heroId?: string;     // 대장 고양이 (없으면 치즈)
  heroName?: string;   // 대장 고양이에게 붙인 이름
  savedAt?: number;    // 마지막 저장 시각 (클라우드와 비교용)
}

const KEY = 'catwar.save.v1';

/** 처음 고른 대장 고양이를 저장에 반영: 보유시키고, 시작 고양이 3마리는 유지 */
export function chooseHero(save: SaveData, id: string, name: string): void {
  save.heroId = id;
  save.heroName = name.trim().slice(0, 8) || undefined;
  if (!save.cats[id]) save.cats[id] = { level: 1, stars: 1, shards: 0 };
  // 시작 고양이 중 하나를 골랐으면 그 자리는 치즈가 채운다
  if (id !== 'cheese' && !save.cats.cheese) save.cats.cheese = { level: 1, stars: 1, shards: 0 };
}

/** 저장 코드 (다른 기기로 옮기기) */
export function exportSave(save: SaveData): string {
  return 'CATWAR1:' + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
}

/** 저장 코드를 읽어 이 기기에 덮어쓴다. 성공하면 true */
export function importSave(code: string): boolean {
  try {
    const body = code.trim().replace(/^CATWAR1:/, '');
    const data = JSON.parse(decodeURIComponent(escape(atob(body))));
    if (!data || typeof data !== 'object' || !data.cats || !data.cats.cheese) return false;
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
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
      if (data && data.version === 1 && data.cats && data.cats[data.heroId ?? HERO_ID]) {
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

/** 저장할 때마다 불리는 콜백 (클라우드 저장) */
let onWrite: ((data: SaveData) => void) | null = null;
export function setOnWrite(fn: (data: SaveData) => void): void { onWrite = fn; }

export function writeSave(data: SaveData): void {
  data.savedAt = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* 사생활 보호 모드 등 */
  }
  onWrite?.(data);
}

/** 다른 곳(클라우드)에서 받은 저장으로 이 기기 저장을 바꾼다 */
export function replaceLocalSave(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* */ }
}

export function resetSave(): SaveData {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  return newSave();
}
