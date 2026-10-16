import * as maplibregl from 'maplibre-gl';
import { ButtonControl } from '../../core/control';
import { h } from '../../core/dom';
import { defineFeature } from '../../core/feature';
import { ICON_LOCATE } from '../../core/icons';
import { LocationError } from '../../platform';

/** 誤差半径 [m] から、その範囲が画面に収まる程度のズームを決める */
export function zoomForAccuracy(accuracy: number): number {
  if (!Number.isFinite(accuracy) || accuracy <= 0) return 16;
  if (accuracy <= 50) return 17;
  if (accuracy <= 200) return 16;
  if (accuracy <= 1000) return 14;
  if (accuracy <= 5000) return 12;
  return 10;
}

/** 現在地ボタン。押すと1回だけ測位して、その位置へ移動して印を置く */
export const locate = defineFeature({
  id: 'locate',
  setup({ map, platform, ui }) {
    let marker: maplibregl.Marker | undefined;

    const control = new ButtonControl({
      title: '現在地',
      icon: ICON_LOCATE,
      className: 'locate-button',
      onClick: async (button) => {
        if (button.getAttribute('aria-busy') === 'true') return;
        button.setAttribute('aria-busy', 'true');
        try {
          const pos = await platform.getCurrentPosition();
          const lngLat: [number, number] = [pos.lng, pos.lat];
          marker ??= new maplibregl.Marker({ element: h('div', { class: 'locate-dot' }) });
          marker.setLngLat(lngLat).addTo(map);
          map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), zoomForAccuracy(pos.accuracy)) });
        } catch (err) {
          console.warn('[locate]', err);
          ui.toast(err instanceof LocationError ? err.message : '現在地を取得できませんでした', 'error');
        } finally {
          button.removeAttribute('aria-busy');
        }
      },
    });
    map.addControl(control, 'top-right');
  },
});
