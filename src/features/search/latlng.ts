/**
 * 「34.7025, 135.4959」のような緯度経度の入力を解釈する。
 * - 区切りはカンマ・空白・読点。全角数字や全角カンマも可
 * - 並びは「緯度, 経度」（Google マップと同じ）。ただし1つ目が ±90 を超え2つ目が収まるときは「経度, 緯度」とみなす
 * 緯度経度として読めなければ null
 */
export function parseLatLng(text: string): { lat: number; lng: number } | null {
  const normalized = text.normalize('NFKC').trim();
  const m = /^([+-]?\d+(?:\.\d+)?)\s*[,、\s]\s*([+-]?\d+(?:\.\d+)?)$/.exec(normalized);
  if (!m) return null;
  let lat = Number(m[1]);
  let lng = Number(m[2]);
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
