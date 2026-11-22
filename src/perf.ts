// 절전 모드 설정 (전투 화면을 초당 30번만 그려 배터리·발열을 줄인다)
let on = (() => { try { return localStorage.getItem('catwar.powersave') === '1'; } catch { return false; } })();
export function powerSave(): boolean { return on; }
export function setPowerSave(v: boolean): void {
  on = v;
  try { localStorage.setItem('catwar.powersave', v ? '1' : '0'); } catch { /* noop */ }
}
