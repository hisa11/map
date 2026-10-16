import * as maplibregl from 'maplibre-gl';
import { h, svgIcon } from '../../core/dom';
import { defineFeature } from '../../core/feature';
import { ICON_COPY } from '../../core/icons';

const LONG_PRESS_MS = 550;
/** 長押し中にこれ以上指が動いたらパン操作とみなす [px] */
const MOVE_TOLERANCE_PX = 10;

/** 「緯度, 経度」の文字列。小数6桁 ≒ 0.1 m */
export function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API が使えない環境向けの旧方式
    const area = h('textarea', { readonly: true, style: 'position:fixed;opacity:0' });
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** 右クリック（PC）または長押し（スマホ）した地点の緯度経度を表示する */
export const coordinates = defineFeature({
  id: 'coordinates',
  setup({ map, ui }) {
    // closeOnClick は使わない: 長押し直後に click が来る端末だと、出した瞬間に閉じてしまうため
    const popup = new maplibregl.Popup({ className: 'coord-popup', maxWidth: '280px', closeOnClick: false, focusAfterOpen: false });
    let lastShownAt = 0;
    map.on('click', () => {
      if (Date.now() - lastShownAt > 500) popup.remove();
    });

    function show(lngLat: maplibregl.LngLat) {
      // Android では長押しで touch 由来と contextmenu 由来の2回が来るので、まとめて1回にする
      if (Date.now() - lastShownAt < 800) return;
      lastShownAt = Date.now();
      const text = formatLatLng(lngLat.lat, lngLat.wrap().lng);
      const copyButton = h('button', { type: 'button', class: 'coord-popup__copy', title: 'コピー', 'aria-label': 'コピー' });
      copyButton.append(svgIcon(ICON_COPY));
      copyButton.addEventListener('click', async () => {
        ui.toast((await copyText(text)) ? 'コピーしました' : 'コピーできませんでした', 'info');
      });
      popup
        .setLngLat(lngLat)
        .setDOMContent(h('div', { class: 'coord-popup__body' }, h('span', { class: 'coord-popup__text' }, text), copyButton))
        .addTo(map);
    }

    map.on('contextmenu', (e) => {
      e.originalEvent.preventDefault();
      show(e.lngLat);
    });

    let timer: number | undefined;
    let start: maplibregl.Point | undefined;
    const cancel = () => {
      window.clearTimeout(timer);
      timer = undefined;
      start = undefined;
    };
    map.on('touchstart', (e) => {
      cancel();
      if (e.points.length !== 1) return; // ピンチ操作は対象外
      start = e.point;
      const lngLat = e.lngLat;
      timer = window.setTimeout(() => {
        cancel();
        show(lngLat);
      }, LONG_PRESS_MS);
    });
    map.on('touchmove', (e) => {
      if (start && (e.points.length !== 1 || e.point.dist(start) > MOVE_TOLERANCE_PX)) cancel();
    });
    map.on('touchend', cancel);
    map.on('touchcancel', cancel);
  },
});
