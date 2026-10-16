import type { StyleSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import type { BasemapDefinition } from '../src/config/basemaps';
import { BASEMAPS } from '../src/config/basemaps';
import { carryOverOverlays, findBasemap, OVERLAY_PREFIX } from '../src/core/basemap';

const base = (id: string, glyphs?: string): StyleSpecification => ({
  version: 8,
  ...(glyphs ? { glyphs } : {}),
  sources: { [`basemap:${id}`]: { type: 'raster', tiles: [`https://example.com/${id}/{z}/{x}/{y}.png`] } },
  layers: [{ id: `basemap:${id}`, type: 'raster', source: `basemap:${id}` }],
});

describe('carryOverOverlays', () => {
  it('初回（prev なし）は next をそのまま返す', () => {
    const next = base('b');
    expect(carryOverOverlays(undefined, next)).toBe(next);
  });

  it('重ね合わせが無ければ next をそのまま返す', () => {
    const next = base('b');
    expect(carryOverOverlays(base('a'), next)).toBe(next);
  });

  it('overlay: の source / layer だけを新スタイルの最前面に引き継ぐ', () => {
    const prev = base('a', 'https://example.com/fonts/{fontstack}/{range}.pbf');
    prev.sources[`${OVERLAY_PREFIX}pins`] = { type: 'geojson', data: { type: 'FeatureCollection', features: [] } };
    prev.layers.push({ id: `${OVERLAY_PREFIX}pins`, type: 'circle', source: `${OVERLAY_PREFIX}pins` });

    const result = carryOverOverlays(prev, base('b'));

    expect(Object.keys(result.sources)).toEqual(['basemap:b', 'overlay:pins']);
    expect(result.layers.map((l) => l.id)).toEqual(['basemap:b', 'overlay:pins']);
    // 新スタイルに glyphs が無いときは旧スタイルのものを使う（文字ラベルの重ね合わせ用）
    expect(result.glyphs).toBe(prev.glyphs);
  });
});

describe('findBasemap', () => {
  const defs: BasemapDefinition[] = [
    { id: 'a', name: 'A', style: 'https://example.com/a.json' },
    { id: 'b', name: 'B', style: 'https://example.com/b.json' },
  ];

  it('ID が一致するものを返す', () => {
    expect(findBasemap(defs, 'b').id).toBe('b');
  });

  it.each([undefined, 'zzz', 3])('見つからなければ先頭 (%s)', (id) => {
    expect(findBasemap(defs, id).id).toBe('a');
  });

  it('BASEMAPS の ID は重複しない', () => {
    const ids = BASEMAPS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
