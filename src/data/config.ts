// 세로형 전장. 가로는 540 고정, 세로는 화면 비율에 맞춰 960~1170 사이로 늘어난다.
export const CONFIG = {
  width: 540,
  height: 960,
  fieldTop: 96,        // 적이 나타나는 높이
  barricadeY: 780,     // 바리케이드 윗면 (적이 멈추는 선)
  squadY: 872,         // 고양이들이 앉아 있는 높이
  squadX: [270, 160, 380, 60, 480], // [치즈, 편성1~4]
  xpBase: 8,
  xpPerLevel: 6,
  rerolls: 2,
};

/** 화면 비율에 맞춰 논리 높이를 정하고, 아래쪽 요소를 바닥 기준으로 다시 배치한다 */
export function applyLayout(screenW: number, screenH: number): void {
  const h = Math.round(Math.max(960, Math.min(1170, (CONFIG.width * screenH) / Math.max(1, screenW))));
  CONFIG.height = h;
  CONFIG.barricadeY = h - 180;
  CONFIG.squadY = h - 88;
}
