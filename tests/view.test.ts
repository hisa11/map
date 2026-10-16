import { describe, expect, it } from 'vitest';
import { sanitizeView, wrapLng, type ViewState } from '../src/core/view';

const fallback: ViewState = { center: [135, 35], zoom: 10, bearing: 0, pitch: 0 };

describe('wrapLng', () => {
  it.each([
    [0, 0],
    [179.5, 179.5],
    [180, 180],
    [-180, -180],
    [181, -179],
    [-181, 179],
    [540, 180],
    [720, 0],
  ])('%d -> %d', (input, expected) => {
    expect(wrapLng(input)).toBeCloseTo(expected, 9);
  });
});

describe('sanitizeView', () => {
  it('正しい値はそのまま通す', () => {
    const v: ViewState = { center: [139.7, 35.6], zoom: 12.5, bearing: -30, pitch: 45 };
    expect(sanitizeView(v, fallback)).toEqual(v);
  });

  it.each([undefined, null, 'x', 42, []])('オブジェクトでなければ fallback (%s)', (raw) => {
    expect(sanitizeView(raw, fallback)).toBe(fallback);
  });

  it('壊れた項目だけ fallback で埋める', () => {
    const v = sanitizeView({ center: ['a', 1], zoom: Number.NaN, bearing: 10, pitch: null }, fallback);
    expect(v).toEqual({ center: fallback.center, zoom: fallback.zoom, bearing: 10, pitch: fallback.pitch });
  });

  it('範囲外は丸める', () => {
    const v = sanitizeView({ center: [200, 89], zoom: 99, bearing: 500, pitch: -5 }, fallback);
    expect(v.center[0]).toBeCloseTo(-160, 9);
    expect(v.center[1]).toBeCloseTo(85.051129, 6);
    expect(v.zoom).toBe(24);
    expect(v.bearing).toBe(180);
    expect(v.pitch).toBe(0);
  });
});
