// 대장 고양이 고르기: 우리 집 고양이와 닮은 아이를 골라 이름까지 지어 준다
import { getArt } from './art';
import { sound } from './audio';
import { CATS, CAT_BY_ID, RARITY_COLOR, originalName } from './data/cats';

interface PickOptions {
  /** 고를 수 있는 고양이 (없으면 전부) */
  ids?: string[];
  current?: string;
  currentName?: string;
  title?: string;
  onPick: (id: string, name: string) => void;
  onCancel?: () => void;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function openHeroPicker(o: PickOptions): void {
  const root = document.createElement('div');
  root.id = 'heropick';
  document.body.appendChild(root);
  const ids = o.ids ?? CATS.map((c) => c.id);
  let sel = o.current && ids.includes(o.current) ? o.current : ids[0];
  let name = o.currentName ?? '';

  const faceSrc = (id: string): string => getArt(id, 'face')?.src ?? '';
  const fullSrc = (id: string): string => getArt(id, 'full')?.src ?? getArt(id, 'face')?.src ?? '';

  const render = (): void => {
    const d = CAT_BY_ID[sel];
    root.innerHTML = `
      <div class="hp-head">
        <h2>${o.title ?? '나의 대장 고양이를 골라 주세요'}</h2>
        <p>우리 집 고양이와 닮은 아이를 골라 보세요! 대장은 어떤 고양이든 능력치가 같아요.</p>
      </div>
      <div class="hp-preview" style="--rc:${RARITY_COLOR[d.rarity]}">
        <img class="hp-full" src="${fullSrc(sel)}" alt="">
        <div class="hp-info">
          <small>${esc(d.breed)}</small>
          <label>이름 <input class="hp-name" maxlength="8" placeholder="${esc(originalName(sel))}" value="${esc(name)}"></label>
          <small class="muted">비워 두면 「${esc(originalName(sel))}」</small>
        </div>
      </div>
      <div class="hp-grid">
        ${ids.map((id) => `<button class="hp-cat ${id === sel ? 'on' : ''}" data-id="${id}" style="--rc:${RARITY_COLOR[CAT_BY_ID[id].rarity]}">
          <img src="${faceSrc(id)}" alt=""><span>${esc(originalName(id))}</span></button>`).join('')}
      </div>
      <div class="hp-actions">
        ${o.onCancel ? '<button class="btn off" data-act="cancel">취소</button>' : ''}
        <button class="btn gold" data-act="ok">이 아이로 할래요!</button>
      </div>`;
    const input = root.querySelector('.hp-name') as HTMLInputElement;
    input.addEventListener('input', () => { name = input.value; });
  };

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const cat = t.closest('.hp-cat') as HTMLElement | null;
    if (cat) {
      sel = cat.dataset.id!;
      sound.play('meow-hi');
      render();
      return;
    }
    const act = (t.closest('[data-act]') as HTMLElement | null)?.dataset.act;
    if (act === 'ok') {
      sound.play('card');
      root.remove();
      o.onPick(sel, name.trim());
    } else if (act === 'cancel') {
      root.remove();
      o.onCancel?.();
    }
  });
  render();
}
