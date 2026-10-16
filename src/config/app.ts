import type { ViewState } from '../core/view';

/** 保存された表示位置がないとき（初回起動時）の表示 */
export const DEFAULT_VIEW: ViewState = {
  center: [135.4959, 34.7025], // 大阪駅付近
  zoom: 11,
  bearing: 0,
  pitch: 0,
};

/**
 * 文字ラベル（symbol レイヤー）用のフォント配信元。
 * ラスタの背景地図には glyphs が無いので、重ね合わせレイヤーで文字を出せるよう全背景地図に同じものを入れる。
 * 漢字・かなはブラウザのローカルフォントで描画される（MapLibre の localIdeographFontFamily）。
 */
export const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
