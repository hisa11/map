import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import type { BasemapDefinition } from '../config/basemaps';

/**
 * この接頭辞で始まる ID の source / layer は「重ね合わせ」として扱い、背景地図を切り替えても引き継ぐ。
 * 機能側で地図にレイヤーを足すときは必ずこの接頭辞を付ける（例: `overlay:route`）。
 */
export const OVERLAY_PREFIX = 'overlay:';

const isOverlay = (id: string) => id.startsWith(OVERLAY_PREFIX);

/** setStyle の transformStyle に渡す。旧スタイルの重ね合わせを新スタイルの上に載せ直す */
export function carryOverOverlays(prev: StyleSpecification | undefined, next: StyleSpecification): StyleSpecification {
  if (!prev) return next;
  const sources = Object.entries(prev.sources).filter(([id]) => isOverlay(id));
  const layers = prev.layers.filter((layer) => isOverlay(layer.id));
  if (sources.length === 0 && layers.length === 0) return next;
  return {
    ...next,
    glyphs: next.glyphs ?? prev.glyphs,
    sources: { ...next.sources, ...Object.fromEntries(sources) },
    layers: [...next.layers.filter((layer) => !isOverlay(layer.id)), ...layers],
  };
}

/** ID に一致する背景地図。無ければ先頭（既定）を返す */
export function findBasemap(defs: readonly BasemapDefinition[], id: unknown): BasemapDefinition {
  const found = defs.find((d) => d.id === id);
  if (found) return found;
  const first = defs[0];
  if (!first) throw new Error('BASEMAPS が空です');
  return first;
}

type Listener = (def: BasemapDefinition) => void;

export class BasemapController {
  private currentDef: BasemapDefinition;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly map: MapLibreMap,
    readonly list: readonly BasemapDefinition[],
    initial: BasemapDefinition,
  ) {
    this.currentDef = initial;
  }

  get current(): BasemapDefinition {
    return this.currentDef;
  }

  set(id: string): void {
    const def = findBasemap(this.list, id);
    if (def.id === this.currentDef.id) return;
    this.currentDef = def;
    this.map.setStyle(def.style, { transformStyle: carryOverOverlays });
    for (const listener of this.listeners) listener(def);
  }

  /** 切り替え時に呼ばれる。返り値で登録解除 */
  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/**
 * スタイル読み込み済みなら即座に、未読み込みなら読み込み後に1回だけ fn を呼ぶ。
 * 重ね合わせレイヤー（OVERLAY_PREFIX）の追加はこの中で行う。以後の背景切り替えでは自動で引き継がれる。
 */
export function onceStyleLoaded(map: MapLibreMap, fn: () => void): void {
  if (map.isStyleLoaded()) fn();
  else map.once('style.load', fn);
}
