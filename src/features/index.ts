import type { Feature } from '../core/feature';
import { basemapSwitcher } from './basemap-switcher';
import { coordinates } from './coordinates';
import { locate } from './locate';
import { search } from './search';

/**
 * 有効な機能の一覧。並び順 = setup の呼び出し順 = 同じ位置に置くボタンの並び順。
 * 機能を足すときは src/features/<id>/index.ts を作ってここに追加する。
 */
export const features: readonly Feature[] = [search, locate, basemapSwitcher, coordinates];
