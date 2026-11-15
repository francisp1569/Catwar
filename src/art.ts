// 외부 일러스트(PNG) 교체 시스템.
// public/art/manifest.json 에 { "cheese": ["back", "face", "card"] } 처럼 적어두고
// public/art/cats/cheese-back.png 등을 넣으면, 코드로 그린 고양이 대신 그 그림을 사용한다.
export type ArtKind = 'back' | 'face' | 'card';

const images = new Map<string, HTMLImageElement>();

export async function loadArt(): Promise<void> {
  try {
    const res = await fetch('art/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = (await res.json()) as Record<string, ArtKind[]>;
    for (const [id, kinds] of Object.entries(manifest)) {
      if (!Array.isArray(kinds)) continue;
      for (const kind of kinds) {
        const img = new Image();
        img.src = `art/cats/${id}-${kind}.png`;
        images.set(`${id}-${kind}`, img);
      }
    }
  } catch {
    /* 그림이 없으면 코드로 그린 그림 사용 */
  }
}

export function getArt(id: string, kind: ArtKind): HTMLImageElement | null {
  const img = images.get(`${id}-${kind}`);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}
