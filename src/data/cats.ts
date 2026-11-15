// 수집 가능한 고양이 도감
import { WEAPONS, type WeaponDef } from './weapons';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR';
export const RARITY_ORDER: Rarity[] = ['N', 'R', 'SR', 'SSR'];
export const RARITY_COLOR: Record<Rarity, string> = { N: '#9aa5b1', R: '#4fa3ff', SR: '#b06bff', SSR: '#ffb800' };

export type Pattern = 'solid' | 'bicolor' | 'tabby' | 'tuxedo' | 'calico' | 'tortie' | 'point' | 'spotted';

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
  accessory?: 'scarf' | 'bell' | 'ribbon' | 'crown' | 'heart';
  /** 아기 고양이 비율: 큰 귀, 큰 눈 */
  kitten?: boolean;
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
    hp: 420, atk: 20, skillName: '냥냥펀치', weapon: WEAPONS.cheese,
    // 실제 반치즈 코숏 '혜옹이'를 모델로: 연한 치즈색 + 은은한 줄무늬, 이마에서 턱까지 흰 ㅅ자, 큰 귀와 초록빛 눈
    look: { base: WHITE, pattern: 'bicolor', patch: '#eeb47c', stripe: '#d8925a', belly: WHITE, eye: '#a8a86c', accessory: 'heart', kitten: true },
    bio: '소녀가 길에서 데려온 반치즈 코숏. 집을 지키는 냥냥 방위대의 대장이다.',
  },
  {
    id: 'godeungeo', name: '고등어', breed: '고등어태비 코숏', rarity: 'N', role: '탱커',
    hp: 450, atk: 14, skillName: '스크래처 방벽', weapon: WEAPONS.godeungeo,
    look: { base: '#9a9aa6', pattern: 'tabby', stripe: '#55556a', belly: '#e9e6e2', eye: '#9ccf5a' },
    bio: '어디서든 식빵 자세로 버티는 든든한 동네 대장.',
  },
  {
    id: 'huindungi', name: '흰둥이', breed: '흰 코숏', rarity: 'N', role: '원거리',
    hp: 120, atk: 18, skillName: '털실뭉치 던지기', weapon: WEAPONS.huindungi,
    look: { base: WHITE, pattern: 'solid', eye: '#5aa9ff' },
    bio: '털뭉치 던지기를 좋아하는 하얀 코숏. 털이 많이 빠진다.',
  },
  {
    id: 'chaos', name: '카오스', breed: '카오스 코숏', rarity: 'N', role: '돌격',
    hp: 110, atk: 16, skillName: '우다다 할퀴기', weapon: WEAPONS.chaos,
    look: { base: '#3a2e2a', pattern: 'tortie', patch: '#c8742f', eye: '#e8b83a' },
    bio: '새벽 3시만 되면 우다다를 시작하는 카오스 무늬 코숏.',
  },
  {
    id: 'cheesetabby', name: '치즈태비', breed: '치즈태비 코숏', rarity: 'R', role: '근접',
    hp: 220, atk: 20, skillName: '캣휠 굴리기', weapon: WEAPONS.cheesetabby,
    look: { base: ORANGE, pattern: 'tabby', stripe: '#d0702a', belly: '#ffe3c2', eye: '#7cc36b' },
    bio: '온몸이 치즈색인 먹보. 치즈의 먼 친척이라는 소문이 있다.',
  },
  {
    id: 'tuxedo', name: '턱시도', breed: '턱시도 코숏', rarity: 'R', role: '암살',
    hp: 140, atk: 22, skillName: '방울공 저격', weapon: WEAPONS.tuxedo,
    look: { base: '#2e2e38', pattern: 'tuxedo', belly: WHITE, eye: '#e8d23a', accessory: 'bell' },
    bio: '언제나 정장 차림인 신사 고양이. 일격이 매섭다.',
  },
  {
    id: 'samsaek', name: '삼색이', breed: '삼색 코숏', rarity: 'R', role: '지원',
    hp: 200, atk: 10, skillName: '그루밍 수선', weapon: WEAPONS.samsaek,
    look: { base: WHITE, pattern: 'calico', patch: ORANGE, patch2: '#3a3038', eye: '#c9a227', accessory: 'ribbon' },
    bio: '다친 친구를 핥아주는 다정한 삼색 고양이.',
  },
  {
    id: 'russianblue', name: '블루', breed: '러시안 블루', rarity: 'SR', role: '원거리',
    hp: 180, atk: 24, skillName: '깃털 낚싯대', weapon: WEAPONS.russianblue,
    look: { base: '#8c9bb3', pattern: 'solid', eye: '#4fc27a' },
    bio: '낯을 가리지만 실력은 확실한 은빛 저격수.',
  },
  {
    id: 'scottish', name: '폴드', breed: '스코티시 폴드', rarity: 'SR', role: '탱커',
    hp: 650, atk: 22, skillName: '식빵 엉덩방아', weapon: WEAPONS.scottish,
    look: { base: '#e9d3b4', pattern: 'tabby', stripe: '#c39a68', belly: WHITE, eye: '#d98b2b', fold: true },
    bio: '동그란 얼굴과 접힌 귀. 박치기 한 방이면 벌레가 기절한다.',
  },
  {
    id: 'munchkin', name: '먼치', breed: '먼치킨', rarity: 'SR', role: '돌격',
    hp: 160, atk: 26, skillName: '할퀴기 연타', weapon: WEAPONS.munchkin,
    look: { base: WHITE, pattern: 'bicolor', patch: '#8f8a86', belly: WHITE, eye: '#5aa9ff', shortLegs: true },
    bio: '다리는 짧아도 누구보다 빠르다. 궁지에 몰리면 폭주한다.',
  },
  {
    id: 'persian', name: '페르', breed: '페르시안', rarity: 'SR', role: '지원',
    hp: 420, atk: 10, skillName: '골골송', weapon: WEAPONS.persian,
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
    hp: 200, atk: 42, skillName: '레이저 포인터', weapon: WEAPONS.siamese,
    look: { base: '#f3e6cf', pattern: 'point', patch: '#5a4034', eye: '#4aa3ff' },
    bio: '푸른 눈의 명사수. 말이 많고 한 번 노린 벌레는 놓치지 않는다.',
  },
  {
    id: 'cow', name: '젖소', breed: '젖소무늬 코숏', rarity: 'R', role: '폭격',
    hp: 200, atk: 18, skillName: '츄르 폭탄', weapon: WEAPONS.cow,
    look: { base: WHITE, pattern: 'calico', patch: '#2e2e38', patch2: '#2e2e38', belly: WHITE, eye: '#c9a227' },
    bio: '흑백 얼룩이 젖소를 닮은 코숏. 츄르를 아껴 먹다 폭탄처럼 던진다.',
  },
  {
    id: 'americanshort', name: '은비', breed: '아메리칸 숏헤어', rarity: 'R', role: '원거리',
    hp: 180, atk: 20, skillName: '쥐돌이 부메랑', weapon: WEAPONS.americanshort,
    look: { base: '#c9ccd2', pattern: 'tabby', stripe: '#3e4250', belly: '#f2f2f2', eye: '#e8b83a' },
    bio: '은빛 소용돌이 무늬. 쥐돌이 장난감을 던지면 꼭 다시 받아낸다.',
  },
  {
    id: 'abyssinian', name: '아비', breed: '아비시니안', rarity: 'R', role: '함정',
    hp: 170, atk: 22, skillName: '털뭉치 덫', weapon: WEAPONS.abyssinian,
    look: { base: '#c8834e', pattern: 'tabby', stripe: '#a9652f', belly: '#f3d3b0', eye: '#d9b030' },
    bio: '호기심 많은 탐험가. 집안 곳곳에 털뭉치를 숨겨 둔다.',
  },
  {
    id: 'norwegian', name: '노르', breed: '노르웨이숲', rarity: 'SR', role: '연쇄',
    hp: 300, atk: 20, skillName: '정전기 쓰다듬기', weapon: WEAPONS.norwegian,
    look: { base: '#a88a68', pattern: 'tabby', stripe: '#6a5038', belly: WHITE, eye: '#9ccf5a', fluffy: true },
    bio: '겨울에 쓰다듬으면 찌릿! 털 속에 정전기가 가득하다.',
  },
  {
    id: 'ragdoll', name: '구름', breed: '랙돌', rarity: 'SR', role: '보호막',
    hp: 450, atk: 10, skillName: '꾹꾹이 쿠션', weapon: WEAPONS.ragdoll,
    look: { base: '#f6efe6', pattern: 'point', patch: '#8a7a70', belly: WHITE, eye: '#5aa9ff', fluffy: true },
    bio: '안으면 축 늘어지는 구름 같은 고양이. 꾹꾹이로 폭신한 쿠션을 만든다.',
  },
  {
    id: 'bengal', name: '벵이', breed: '벵갈', rarity: 'SSR', role: '사냥꾼',
    hp: 220, atk: 36, skillName: '사냥 본능', weapon: WEAPONS.bengal,
    look: { base: '#e2a24e', pattern: 'spotted', patch: '#5a3a1e', belly: '#fff1d8', eye: '#7cc36b' },
    bio: '작은 표범. 사냥감을 보면 눈빛이 달라진다.',
  },
  {
    id: 'sphynx', name: '스피', breed: '스핑크스', rarity: 'SSR', role: '물대포',
    hp: 200, atk: 34, skillName: '분무기 물총', weapon: WEAPONS.sphynx,
    look: { base: '#f2c4b8', pattern: 'solid', eye: '#7ad0a0', kitten: true },
    bio: '털이 없어 물이 묻어도 끄떡없다. 분무기는 이 고양이의 무기.',
  },
];

export const CAT_BY_ID: Record<string, CatDef> = Object.fromEntries(CATS.map((c) => [c.id, c]));
export const HERO_ID = 'cheese';
export const STARTER_IDS = ['godeungeo', 'huindungi', 'chaos'];
