import type { StyleSpecification } from 'maplibre-gl';
import { GLYPHS_URL } from './app';

export interface BasemapDefinition {
  id: string;
  /** 切り替えパネルに出す名前 */
  name: string;
  /** MapLibre のスタイル。URL かスタイルオブジェクト */
  style: string | StyleSpecification;
}

const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';

interface RasterOptions {
  tiles: string;
  attribution: string;
  minzoom?: number;
  maxzoom: number;
  background?: string;
}

/** XYZ ラスタタイル1枚だけのスタイルを作る */
function rasterStyle(id: string, opts: RasterOptions): StyleSpecification {
  const sourceId = `basemap:${id}`;
  return {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: {
      [sourceId]: {
        type: 'raster',
        tiles: [opts.tiles],
        tileSize: 256,
        minzoom: opts.minzoom ?? 0,
        maxzoom: opts.maxzoom,
        attribution: opts.attribution,
      },
    },
    layers: [
      { id: 'basemap:background', type: 'background', paint: { 'background-color': opts.background ?? '#eef1f3' } },
      { id: sourceId, type: 'raster', source: sourceId },
    ],
  };
}

/**
 * 背景地図の一覧。先頭が既定。
 * 増やすときはここに足すだけで切り替えパネルに出る。
 */
export const BASEMAPS: readonly BasemapDefinition[] = [
  {
    id: 'gsi-std',
    name: '地理院 標準地図',
    style: rasterStyle('gsi-std', {
      tiles: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
      attribution: GSI_ATTRIBUTION,
      maxzoom: 18,
    }),
  },
  {
    id: 'gsi-pale',
    name: '地理院 淡色地図',
    style: rasterStyle('gsi-pale', {
      tiles: 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',
      attribution: GSI_ATTRIBUTION,
      minzoom: 2,
      maxzoom: 18,
    }),
  },
  {
    id: 'gsi-photo',
    name: '地理院 航空写真',
    style: rasterStyle('gsi-photo', {
      tiles: 'https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg',
      attribution: GSI_ATTRIBUTION,
      minzoom: 2,
      maxzoom: 18,
      background: '#1b1f23',
    }),
  },
  {
    id: 'ofm-liberty',
    name: 'OpenFreeMap（ベクタ）',
    style: 'https://tiles.openfreemap.org/styles/liberty',
  },
];
