import { describe, expect, it, vi } from 'vitest';

// locate/index.ts は maplibre-gl（ブラウザ専用）を読み込むので、純粋関数のテストでは差し替える
vi.mock('maplibre-gl', () => ({}));
vi.mock('../src/platform', () => ({ LocationError: class extends Error {} }));

const { zoomForAccuracy } = await import('../src/features/locate');
const { formatLatLng } = await import('../src/features/coordinates');

describe('zoomForAccuracy', () => {
  it.each([
    [5, 17],
    [50, 17],
    [51, 16],
    [200, 16],
    [800, 14],
    [3000, 12],
    [20000, 10],
    [0, 16],
    [Number.NaN, 16],
  ])('%d m -> z%d', (accuracy, zoom) => {
    expect(zoomForAccuracy(accuracy)).toBe(zoom);
  });
});

describe('formatLatLng', () => {
  it('小数6桁で「緯度, 経度」', () => {
    expect(formatLatLng(34.70251234, 135.4959)).toBe('34.702512, 135.495900');
  });
});
