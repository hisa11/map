import type { Map as MapLibreMap } from 'maplibre-gl';

/** 地図の表示状態。永続化して次回起動時に復元する */
export interface ViewState {
  center: [lng: number, lat: number];
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Web メルカトルで表示できる緯度の上限 */
const MAX_LAT = 85.051129;

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 経度を [-180, 180] に正規化する。範囲内の値は誤差を入れないためそのまま返す */
export function wrapLng(lng: number): number {
  if (lng >= -180 && lng <= 180) return lng;
  const wrapped = ((((lng + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

/**
 * 保存領域から読んだ値を検証して ViewState にする。
 * 壊れた値・古い形式の値が入っていても起動できるよう、使えない項目は fallback で埋める。
 */
export function sanitizeView(raw: unknown, fallback: ViewState): ViewState {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fallback;
  const r = raw as Record<string, unknown>;
  const c = r.center;
  const center: ViewState['center'] =
    Array.isArray(c) && isFiniteNumber(c[0]) && isFiniteNumber(c[1])
      ? [wrapLng(c[0]), clamp(c[1], -MAX_LAT, MAX_LAT)]
      : fallback.center;
  return {
    center,
    zoom: isFiniteNumber(r.zoom) ? clamp(r.zoom, 0, 24) : fallback.zoom,
    bearing: isFiniteNumber(r.bearing) ? clamp(r.bearing, -180, 180) : fallback.bearing,
    pitch: isFiniteNumber(r.pitch) ? clamp(r.pitch, 0, 85) : fallback.pitch,
  };
}

export function viewFromMap(map: MapLibreMap): ViewState {
  const c = map.getCenter();
  return { center: [c.lng, c.lat], zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };
}
