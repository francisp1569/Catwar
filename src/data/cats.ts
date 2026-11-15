// 수집 가능한 고양이 도감
import { WEAPONS, type WeaponDef } from './weapons';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export const RARITY_ORDER: Rarity[] = ['N', 'R', 'SR', 'SSR'];
export const RARITY_COLOR: Record<Rarity, string> = { N: '#9aa5b1', R: '#4fa3ff', SR: '#b06bff', SSR: '#ffb800' };

export type Pattern = 'solid' | 'bicolor' | 'tabby' | 'tuxedo' | 'calico' | 'tortie' | 'point';

/** 코드로 그리는 고양이 외형 */
export interface CatLook {
  base: string;
  pattern: Pattern;
  patch?: string;     // bicolor/calico/tortie 무늬색
  patch2?: string;    // calico 두번째 무늬색
  stripe?: string;    // tabby 줄무늬색
  belly?: string;     // 배/턱 색 (없으면 base)
  eye: string;
  fold?: boolean;     // 접힌 귀
  shortLegs?: boolean;
  fluffy?: boolean;
  scale?: number;
  accessory?: 'scarf' | 'bell' | 'ribbon' | 'crown';
}

export interface CatDef {
  id: string;
  name: string;
  breed: string;
  rarity: Rarity;
  role: string;
  hero?: boolean;
  /** 바리케이드 체력 기여 */
  hp: number;
  /** 스킬 공격력 기준값 */
  atk: number;
  skillName: string;
  weapon: WeaponDef;
  look: CatLook;
  bio: string;
}

const WHITE = '#fffaf2';
const ORANGE = '#f4a24c';

export const CATS: CatDef[] = [
  {
    id: 'cheese', name: '치즈', breed: '반치즈 코리안숏헤어', rarity: 'SSR', role: '리더', hero: true,
    hp: 420, atk: 20, skillName: '발톱 펀치', weapon: WEAPONS.cheese,
    look: { base: WHITE, pattern: 'bicolor', patch: ORANGE, belly: WHITE, eye: '#c9a227', accessory: 'scarf' },
    bio: '소녀가 길에서 데려온 반치즈 코숏. 집을 지키는 냥냥 방위대의 대장이다.',
  },
  {
    id: 'godeungeo', name: '고등어', breed: '고등어태비 코숏', rarity: 'N', role: '탱커',
    hp: 450, atk: 14, skillName: '식빵 굽기', weapon: WEAPONS.godeungeo,
    look: { base: '#9a9aa6', pattern: 'tabby', stripe: '#55556a', belly: '#e9e6e2', eye: '#9ccf5a' },
    bio: '어디서든 식빵 자세로 버티는 든든한 동네 대장.',
  },
  {
    id: 'huindungi', name: '흰둥이', breed: '흰 코숏', rarity: 'N', role: '원거리',
    hp: 120, atk: 18, skillName: '털뭉치 난사', weapon: WEAPONS.huindungi,
    look: { base: WHITE, pattern: 'solid', eye: '#5aa9ff' },
    bio: '털뭉치 던지기를 좋아하는 하얀 코숏. 털이 많이 빠진다.',
  },
  {
    id: 'chaos', name: '카오스', breed: '카오스 코숏', rarity: 'N', role: '돌격',
    hp: 110, atk: 16, skillName: '우다다 돌진', weapon: WEAPONS.chaos,
    look: { base: '#3a2e2a', pattern: 'tortie', patch: '#c8742f', eye: '#e8b83a' },
    bio: '새벽 3시만 되면 우다다를 시작하는 카오스 무늬 코숏.',
  },
  {
    id: 'cheesetabby', name: '치즈태비', breed: '치즈태비 코숏', rarity: 'R', role: '근접',
    hp: 220, atk: 20, skillName: '뒹굴뒹굴 회오리', weapon: WEAPONS.cheesetabby,
    look: { base: ORANGE, pattern: 'tabby', stripe: '#d0702a', belly: '#ffe3c2', eye: '#7cc36b' },
    bio: '온몸이 치즈색인 먹보. 치즈의 먼 친척이라는 소문이 있다.',
  },
  {
    id: 'tuxedo', name: '턱시도', breed: '턱시도 코숏', rarity: 'R', role: '암살',
    hp: 140, atk: 22, skillName: '신사의 일격', weapon: WEAPONS.tuxedo,
    look: { base: '#2e2e38', pattern: 'tuxedo', belly: WHITE, eye: '#e8d23a', accessory: 'bell' },
    bio: '언제나 정장 차림인 신사 고양이. 일격이 매섭다.',
  },
  {
    id: 'samsaek', name: '삼색이', breed: '삼색 코숏', rarity: 'R', role: '지원',
    hp: 200, atk: 10, skillName: '그루밍', weapon: WEAPONS.samsaek,
    look: { base: WHITE, pattern: 'calico', patch: ORANGE, patch2: '#3a3038', eye: '#c9a227', accessory: 'ribbon' },
    bio: '다친 친구를 핥아주는 다정한 삼색 고양이.',
  },
  {
    id: 'russianblue', name: '블루', breed: '러시안 블루', rarity: 'SR', role: '원거리',
    hp: 180, atk: 24, skillName: '차가운 눈빛', weapon: WEAPONS.russianblue,
    look: { base: '#8c9bb3', pattern: 'solid', eye: '#4fc27a' },
    bio: '낯을 가리지만 실력은 확실한 은빛 저격수.',
  },
  {
    id: 'scottish', name: '폴드', breed: '스코티시 폴드', rarity: 'SR', role: '탱커',
    hp: 650, atk: 22, skillName: '동글 박치기', weapon: WEAPONS.scottish,
    look: { base: '#e9d3b4', pattern: 'tabby', stripe: '#c39a68', belly: WHITE, eye: '#d98b2b', fold: true },
    bio: '동그란 얼굴과 접힌 귀. 박치기 한 방이면 벌레가 기절한다.',
  },
  {
    id: 'munchkin', name: '먼치', breed: '먼치킨', rarity: 'SR', role: '돌격',
    hp: 160, atk: 26, skillName: '짧은 다리 연타', weapon: WEAPONS.munchkin,
    look: { base: WHITE, pattern: 'bicolor', patch: '#8f8a86', belly: WHITE, eye: '#5aa9ff', shortLegs: true },
    bio: '다리는 짧아도 누구보다 빠르다. 궁지에 몰리면 폭주한다.',
  },
  {
    id: 'persian', name: '페르', breed: '페르시안', rarity: 'SR', role: '지원',
    hp: 420, atk: 10, skillName: '우아한 기품', weapon: WEAPONS.persian,
    look: { base: '#fbf3ea', pattern: 'solid', belly: WHITE, eye: '#f5a742', fluffy: true, accessory: 'crown' },
    bio: '곁에 있기만 해도 모두가 힘이 나는 공주님 고양이.',
  },
  {
    id: 'mainecoon', name: '쿤', breed: '메인쿤', rarity: 'SSR', role: '광역 탱커',
    hp: 900, atk: 40, skillName: '거대 냥펀치', weapon: WEAPONS.mainecoon,
    look: { base: '#9b7350', pattern: 'tabby', stripe: '#5e4128', belly: '#f1e3cf', eye: '#e8b83a', fluffy: true },
    bio: '집채만 한 순둥이. 냥펀치 한 번에 벌레 떼가 날아간다.',
  },
  {
    id: 'siamese', name: '샴', breed: '샴', rarity: 'SSR', role: '저격',
    hp: 200, atk: 42, skillName: '사파이어 스나이프', weapon: WEAPONS.siamese,
    look: { base: '#f3e6cf', pattern: 'point', patch: '#5a4034', eye: '#4aa3ff' },
    bio: '푸른 눈의 명사수. 말이 많고 한 번 노린 벌레는 놓치지 않는다.',
  },
];

export const CAT_BY_ID: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));
export const HERO_ID = 'cheese';
export const STARTER_IDS = ['godeungeo', 'huindungi', 'chaos'];
