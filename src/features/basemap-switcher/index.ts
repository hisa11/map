import { ButtonControl } from '../../core/control';
import { h } from '../../core/dom';
import { defineFeature } from '../../core/feature';
import { ICON_LAYERS } from '../../core/icons';

/** 背景地図の切り替えボタンとパネル */
export const basemapSwitcher = defineFeature({
  id: 'basemap-switcher',
  setup({ map, basemap, ui }) {
    const inputs = basemap.list.map((def) => {
      const input = h('input', { type: 'radio', name: 'basemap', value: def.id });
      input.checked = def.id === basemap.current.id;
      input.addEventListener('change', () => {
        basemap.set(def.id);
        close();
      });
      return { input, item: h('li', {}, h('label', { class: 'option' }, input, h('span', {}, def.name))) };
    });

    const panel = h(
      'div',
      { class: 'panel panel--basemap', role: 'dialog', 'aria-label': '背景地図', hidden: true },
      h('div', { class: 'panel__title' }, '背景地図'),
      h('ul', { class: 'option-list' }, ...inputs.map((x) => x.item)),
    );
    ui.overlay.append(panel);

    const control = new ButtonControl({
      title: '背景地図を切り替え',
      icon: ICON_LAYERS,
      onClick: () => (panel.hidden ? open() : close()),
    });
    map.addControl(control, 'top-right');

    function open() {
      panel.hidden = false;
      control.button.setAttribute('aria-expanded', 'true');
      inputs.find((x) => x.input.checked)?.input.focus();
    }
    function close() {
      panel.hidden = true;
      control.button.setAttribute('aria-expanded', 'false');
    }

    basemap.onChange((def) => {
      for (const { input } of inputs) input.checked = input.value === def.id;
    });

    // パネル外のタップと Esc で閉じる
    document.addEventListener('pointerdown', (e) => {
      const target = e.target as Node;
      if (!panel.hidden && !panel.contains(target) && !control.button.contains(target)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) close();
    });
  },
});
