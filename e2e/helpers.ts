import type { Page } from '@playwright/test';
import { crc32, deflateSync } from 'node:zlib';

/** 1色塗りの PNG（ラスタタイルの代わり） */
export function solidPng(r: number, g: number, b: number, size = 256): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const TILE_RGB = [120, 180, 90] as const;
export const VECTOR_RGB = [255, 0, 0] as const;

/** OpenFreeMap の代わり。全面を覆う GeoJSON ポリゴン1枚（GeoJSON の処理は Worker で走る） */
const VECTOR_STYLE = {
  version: 8,
  sources: {
    world: {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[[-179, -80], [179, -80], [179, 80], [-179, 80], [-179, -80]]] },
      },
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#000000' } },
    { id: 'world', type: 'fill', source: 'world', paint: { 'fill-color': '#ff0000' } },
  ],
};

export const OSAKA_CASTLE = { lng: 135.525963, lat: 34.687316 };

const SEARCH_RESULTS = [
  { geometry: { coordinates: [OSAKA_CASTLE.lng, OSAKA_CASTLE.lat], type: 'Point' }, type: 'Feature', properties: { addressCode: '', title: '大阪城' } },
  { geometry: { coordinates: [135.5312, 34.6881], type: 'Point' }, type: 'Feature', properties: { addressCode: '', title: '大阪城公園駅' } },
];

const CORS = { 'access-control-allow-origin': '*' };

/** 外部のタイル・API への通信をすべて差し替える */
export async function mockNetwork(page: Page): Promise<void> {
  const tile = solidPng(...TILE_RGB);
  await page.route('https://cyberjapandata.gsi.go.jp/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', headers: CORS, body: tile }),
  );
  await page.route('https://tiles.openfreemap.org/styles/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(VECTOR_STYLE) }),
  );
  await page.route('https://tiles.openfreemap.org/fonts/**', (route) => route.fulfill({ status: 404, headers: CORS }));
  await page.route('https://msearch.gsi.go.jp/**', (route) => {
    const q = new URL(route.request().url()).searchParams.get('q');
    const body = q === '大阪城' ? SEARCH_RESULTS : [];
    return route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  });
}

/** MapLibre の URL ハッシュ（#zoom/lat/lng/...）を読む */
export async function readHash(page: Page): Promise<{ zoom: number; lat: number; lng: number } | null> {
  const hash = await page.evaluate(() => location.hash);
  const [zoom, lat, lng] = hash.replace(/^#/, '').split('/').map(Number);
  if (zoom === undefined || lat === undefined || lng === undefined || [zoom, lat, lng].some(Number.isNaN)) return null;
  return { zoom, lat, lng };
}

/** 画面上の1点の色。WebGL の canvas は直接読めないのでスクリーンショットをブラウザで復号する */
export async function pixelAt(page: Page, x: number, y: number): Promise<number[]> {
  const shot = await page.screenshot({ clip: { x, y, width: 1, height: 1 } });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context');
    ctx.drawImage(img, 0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  }, shot.toString('base64'));
}

export const near = (actual: readonly number[], expected: readonly number[], tol = 12) =>
  actual.every((v, i) => Math.abs(v - (expected[i] ?? 0)) <= tol);
