import * as maplibregl from 'maplibre-gl';
import { h, svgIcon } from '../../core/dom';
import { defineFeature } from '../../core/feature';
import { ICON_CLOSE, ICON_SEARCH } from '../../core/icons';
import { buildGsiSearchUrl, parseGsiResponse, type SearchResult } from './gsi';
import { parseLatLng } from './latlng';

const RESULT_ZOOM = 16;

/** 画面上部の検索バー。住所・地名は地理院の住所検索 API、緯度経度は直接移動 */
export const search = defineFeature({
  id: 'search',
  setup({ map, platform, ui }) {
    const input = h('input', {
      type: 'search',
      class: 'search__input',
      name: 'q',
      placeholder: '住所・地名・緯度経度',
      autocomplete: 'off',
      enterkeyhint: 'search',
      'aria-label': '検索',
    });
    const clearButton = h('button', { type: 'button', class: 'search__icon-button', title: '消去', 'aria-label': '消去', hidden: true });
    clearButton.append(svgIcon(ICON_CLOSE));
    const submitButton = h('button', { type: 'submit', class: 'search__icon-button', title: '検索', 'aria-label': '検索' });
    submitButton.append(svgIcon(ICON_SEARCH));
    const results = h('ul', { class: 'search__results', role: 'listbox', 'aria-label': '検索結果', hidden: true });
    const form = h('form', { class: 'search', role: 'search' }, input, clearButton, submitButton);
    ui.top.append(h('div', { class: 'search-box' }, form, results));

    let marker: maplibregl.Marker | undefined;
    let pending: AbortController | undefined;

    function showMarker(lng: number, lat: number) {
      marker ??= new maplibregl.Marker({ color: '#d93025' });
      marker.setLngLat([lng, lat]).addTo(map);
    }

    function goTo(result: SearchResult) {
      closeResults();
      input.blur(); // スマホではキーボードを閉じる
      showMarker(result.lng, result.lat);
      map.flyTo({ center: [result.lng, result.lat], zoom: Math.max(map.getZoom(), RESULT_ZOOM) });
    }

    function closeResults() {
      results.hidden = true;
      results.replaceChildren();
    }

    function renderResults(items: SearchResult[]) {
      results.replaceChildren(
        ...items.map((item) => {
          const button = h('button', { type: 'button', class: 'search__result', role: 'option' }, item.title);
          button.addEventListener('click', () => goTo(item));
          return h('li', {}, button);
        }),
      );
      results.hidden = items.length === 0;
    }

    async function runSearch(query: string) {
      const latLng = parseLatLng(query);
      if (latLng) {
        goTo({ title: query, ...latLng });
        return;
      }
      pending?.abort();
      const controller = new AbortController();
      pending = controller;
      form.setAttribute('aria-busy', 'true');
      try {
        const items = parseGsiResponse(await platform.getJson(buildGsiSearchUrl(query), controller.signal));
        if (controller.signal.aborted) return;
        if (items.length === 0) {
          closeResults();
          ui.toast(`「${query}」は見つかりませんでした`);
        } else if (items.length === 1 && items[0]) {
          goTo(items[0]);
        } else {
          renderResults(items);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.warn('[search]', err);
        ui.toast('検索できませんでした。通信状態を確認してください', 'error');
      } finally {
        if (pending === controller) {
          pending = undefined;
          form.removeAttribute('aria-busy');
        }
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (query) void runSearch(query);
    });
    input.addEventListener('input', () => {
      clearButton.hidden = input.value === '';
    });
    clearButton.addEventListener('click', () => {
      input.value = '';
      clearButton.hidden = true;
      pending?.abort();
      closeResults();
      marker?.remove();
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeResults();
    });
    // 地図を触ったら候補を閉じる
    map.on('mousedown', closeResults);
    map.on('touchstart', closeResults);
  },
});
