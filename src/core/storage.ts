import { Preferences } from '@capacitor/preferences';

const PREFIX = 'map.';

/**
 * 設定・状態の保存先。Web では localStorage、Android では SharedPreferences に入る。
 * 値は JSON で保存する。読み出した値は型が保証されないので、使う側で検証すること。
 */
export const storage = {
  async get(key: string): Promise<unknown> {
    try {
      const { value } = await Preferences.get({ key: PREFIX + key });
      return value == null ? undefined : (JSON.parse(value) as unknown);
    } catch (err) {
      console.warn(`[storage] ${key} を読めませんでした`, err);
      return undefined;
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    try {
      await Preferences.set({ key: PREFIX + key, value: JSON.stringify(value) });
    } catch (err) {
      console.warn(`[storage] ${key} を保存できませんでした`, err);
    }
  },

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key: PREFIX + key });
  },
};

export type Storage = typeof storage;
