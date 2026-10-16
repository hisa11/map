/**
 * 国土地理院の住所検索 API。キー不要。住所と地名（駅名・山名など）を引ける。
 * 返り値は GeoJSON Feature の配列: [{ geometry: { coordinates: [lng, lat] }, properties: { title } }, ...]
 */
export const GSI_ADDRESS_SEARCH_URL = 'https://msearch.gsi.go.jp/address-search/AddressSearch';

export interface SearchResult {
  title: string;
  lng: number;
  lat: number;
}

export function buildGsiSearchUrl(query: string): string {
  return `${GSI_ADDRESS_SEARCH_URL}?q=${encodeURIComponent(query.trim())}`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** API の応答を検証して SearchResult[] にする。形式が崩れた要素は捨てる */
export function parseGsiResponse(data: unknown, limit = 30): SearchResult[] {
  if (!Array.isArray(data)) return [];
  const results: SearchResult[] = [];
  for (const item of data) {
    if (!isRecord(item) || !isRecord(item.geometry) || !isRecord(item.properties)) continue;
    const coords = item.geometry.coordinates;
    const title = item.properties.title;
    if (!Array.isArray(coords) || !isFiniteNumber(coords[0]) || !isFiniteNumber(coords[1])) continue;
    if (typeof title !== 'string' || title.trim() === '') continue;
    results.push({ title: title.trim(), lng: coords[0], lat: coords[1] });
    if (results.length >= limit) break;
  }
  return results;
}
