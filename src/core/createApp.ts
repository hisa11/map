import * as maplibregl from 'maplibre-gl';
// v6 の MapLibre は Worker を「本体と同じ場所にある maplibre-gl-worker.mjs」から読む。
// バンドル後は場所が変わるので、Vite に Worker ファイルを出力させてその URL を渡す。
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { BASEMAPS } from '../config/basemaps';
import { DEFAULT_VIEW } from '../config/app';
import { platform } from '../platform';
import { BasemapController, findBasemap } from './basemap';
import type { AppContext, Feature } from './feature';
import { storage } from './storage';
import { createToaster } from './toast';
import { sanitizeView, viewFromMap } from './view';

maplibregl.setWorkerUrl(workerUrl);

const KEY_VIEW = 'view';
const KEY_BASEMAP = 'basemap';

function requireElement(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`${selector} が見つかりません`);
  return el;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  };
}

export async function createApp(root: HTMLElement, features: readonly Feature[]): Promise<AppContext> {
  const [savedView, savedBasemap] = await Promise.all([storage.get(KEY_VIEW), storage.get(KEY_BASEMAP)]);
  const view = sanitizeView(savedView, DEFAULT_VIEW);
  const initialBasemap = findBasemap(BASEMAPS, savedBasemap);

  const map = new maplibregl.Map({
    container: requireElement(root, '#map'),
    style: initialBasemap.style,
    center: view.center,
    zoom: view.zoom,
    bearing: view.bearing,
    pitch: view.pitch,
    // Web では表示位置を URL（#zoom/lat/lng）に反映し、共有・リロードで同じ場所を開けるようにする。
    // URL にハッシュがあれば保存値より優先される
    hash: !platform.isNative,
    attributionControl: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

  // タイルの 404 などは地図の表示を止めないので、ログだけ残す
  map.on('error', (e) => console.warn('[map]', e.error?.message ?? e));

  const basemap = new BasemapController(map, BASEMAPS, initialBasemap);
  basemap.onChange((def) => void storage.set(KEY_BASEMAP, def.id));
  map.on(
    'moveend',
    debounce(() => void storage.set(KEY_VIEW, viewFromMap(map)), 400),
  );

  const ctx: AppContext = {
    map,
    basemap,
    storage,
    platform,
    ui: {
      top: requireElement(root, '#ui-top'),
      overlay: requireElement(root, '#ui-overlay'),
      toast: createToaster(root),
    },
  };

  for (const feature of features) {
    try {
      await feature.setup(ctx);
    } catch (err) {
      console.error(`[feature:${feature.id}] setup に失敗しました`, err);
    }
  }

  return ctx;
}
