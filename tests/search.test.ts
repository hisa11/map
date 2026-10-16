import { describe, expect, it } from 'vitest';
import { buildGsiSearchUrl, parseGsiResponse } from '../src/features/search/gsi';
import { parseLatLng } from '../src/features/search/latlng';

describe('parseLatLng', () => {
  it.each([
    ['34.7025, 135.4959', { lat: 34.7025, lng: 135.4959 }],
    ['34.7025,135.4959', { lat: 34.7025, lng: 135.4959 }],
    ['34.7025 135.4959', { lat: 34.7025, lng: 135.4959 }],
    ['３４．７０２５、１３５．４９５９', { lat: 34.7025, lng: 135.4959 }],
    ['-33.8568, 151.2153', { lat: -33.8568, lng: 151.2153 }],
    // 1つ目が緯度として不正で2つ目が収まる → 経度, 緯度 とみなす
    ['135.4959, 34.7025', { lat: 34.7025, lng: 135.4959 }],
  ])('%s', (input, expected) => {
    expect(parseLatLng(input)).toEqual(expected);
  });

  it.each(['大阪駅', '1-2-3', '34.7', '100, 200', '34.7, 135.5, 10', ''])('緯度経度でない: %s', (input) => {
    expect(parseLatLng(input)).toBeNull();
  });
});

describe('buildGsiSearchUrl', () => {
  it('クエリを URL エンコードする', () => {
    expect(buildGsiSearchUrl(' 大阪 城 ')).toBe(
      'https://msearch.gsi.go.jp/address-search/AddressSearch?q=%E5%A4%A7%E9%98%AA%20%E5%9F%8E',
    );
  });
});

describe('parseGsiResponse', () => {
  const feature = (lng: unknown, lat: unknown, title: unknown) => ({
    geometry: { coordinates: [lng, lat], type: 'Point' },
    type: 'Feature',
    properties: { addressCode: '', title },
  });

  it('座標と名前を取り出す', () => {
    expect(parseGsiResponse([feature(135.52, 34.68, '大阪城')])).toEqual([{ title: '大阪城', lng: 135.52, lat: 34.68 }]);
  });

  it('形式が崩れた要素は捨てる', () => {
    const data = [feature('x', 34, 'a'), feature(135, 34, ''), { geometry: null }, null, feature(135, 34, ' ok ')];
    expect(parseGsiResponse(data)).toEqual([{ title: 'ok', lng: 135, lat: 34 }]);
  });

  it('配列でなければ空', () => {
    expect(parseGsiResponse({ error: 'x' })).toEqual([]);
  });

  it('件数を制限する', () => {
    const data = Array.from({ length: 50 }, (_, i) => feature(135, 34, `p${i}`));
    expect(parseGsiResponse(data, 5)).toHaveLength(5);
  });
});
