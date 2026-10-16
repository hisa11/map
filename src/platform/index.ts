import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

/**
 * Web と Android で実装が分かれる処理をここに閉じ込める。
 * 機能（features/）からは直接 Capacitor のプラグインを呼ばず、ここを経由する。
 */

export class LocationError extends Error {
  constructor(
    message: string,
    readonly reason: 'denied' | 'unavailable' | 'timeout' | 'insecure',
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

export interface Position {
  lng: number;
  lat: number;
  /** 誤差半径 [m] */
  accuracy: number;
}

const isNative = Capacitor.isNativePlatform();

/** Web の GeolocationPositionError / Android プラグインのエラーを LocationError に寄せる */
function toLocationError(err: unknown): LocationError {
  if (err instanceof LocationError) return err;
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : undefined;
  const message = err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err);
  if (code === 1 || /denied|permission/i.test(message)) {
    return new LocationError('位置情報の利用が許可されていません', 'denied');
  }
  if (code === 3 || /timeout|timed out/i.test(message)) {
    return new LocationError('現在地の取得がタイムアウトしました', 'timeout');
  }
  if (/disabled|not enabled|services/i.test(message)) {
    return new LocationError('端末の位置情報がオフになっています', 'unavailable');
  }
  return new LocationError('現在地を取得できませんでした', 'unavailable');
}

async function ensureLocationPermission(): Promise<void> {
  // Web ではブラウザが getCurrentPosition 時に自動で確認するので何もしない
  if (!isNative) return;
  const granted = (s: { location: string; coarseLocation: string }) =>
    s.location === 'granted' || s.coarseLocation === 'granted';
  let status = await Geolocation.checkPermissions();
  if (granted(status)) return;
  status = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
  if (!granted(status)) throw new LocationError('位置情報の利用が許可されていません', 'denied');
}

export const platform = {
  name: Capacitor.getPlatform(),
  isNative,

  async getCurrentPosition(): Promise<Position> {
    if (!isNative && !window.isSecureContext) {
      throw new LocationError('位置情報は HTTPS か localhost で開いたときだけ使えます', 'insecure');
    }
    try {
      // Android では位置情報サービスがオフだと権限確認の時点で例外になるので、ここも変換の対象に含める
      await ensureLocationPermission();
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
      return { lng: pos.coords.longitude, lat: pos.coords.latitude, accuracy: pos.coords.accuracy };
    } catch (err) {
      throw toLocationError(err);
    }
  },

  /**
   * JSON を GET する。Android ではネイティブの HTTP を使うので、相手が CORS 非対応でも取得できる。
   * signal は Web でのみ有効（Android では中断されず、結果を捨てるだけになる）。
   */
  async getJson(url: string, signal?: AbortSignal): Promise<unknown> {
    if (isNative) {
      const res = await CapacitorHttp.get({ url, responseType: 'json' });
      signal?.throwIfAborted();
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
      return typeof res.data === 'string' ? (JSON.parse(res.data) as unknown) : (res.data as unknown);
    }
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as unknown;
  },
};

export type Platform = typeof platform;
