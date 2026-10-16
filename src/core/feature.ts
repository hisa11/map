import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Platform } from '../platform';
import type { BasemapController } from './basemap';
import type { Storage } from './storage';
import type { Toast } from './toast';

/** 各機能の setup に渡される、アプリ共通の部品 */
export interface AppContext {
  map: MapLibreMap;
  basemap: BasemapController;
  storage: Storage;
  platform: Platform;
  ui: {
    /** 画面上部のバー。検索欄など横長の UI を置く */
    top: HTMLElement;
    /** 地図の上に浮かせるパネル類を置く場所 */
    overlay: HTMLElement;
    toast: Toast;
  };
}

/**
 * 機能1つ分。src/features/<id>/index.ts で defineFeature して、src/features/index.ts の配列に足す。
 * setup は地図の生成直後に配列の順で1回ずつ呼ばれる（スタイルの読み込み完了は待たない）。
 * 1つの機能の setup が失敗しても他の機能は動く。
 */
export interface Feature {
  id: string;
  setup(ctx: AppContext): void | Promise<void>;
}

export const defineFeature = (feature: Feature): Feature => feature;
