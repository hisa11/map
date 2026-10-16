import type { IControl } from 'maplibre-gl';
import { h, svgIcon } from './dom';

export interface ButtonControlOptions {
  /** ツールチップと読み上げに使う */
  title: string;
  /** icons.ts の SVG 文字列 */
  icon: string;
  onClick: (button: HTMLButtonElement) => void;
  className?: string;
}

/** 地図の四隅に置く、アイコン1つのボタン。map.addControl(new ButtonControl(...), 'top-right') で使う */
export class ButtonControl implements IControl {
  readonly button: HTMLButtonElement;
  private readonly container: HTMLDivElement;

  constructor(opts: ButtonControlOptions) {
    this.button = h('button', {
      type: 'button',
      class: ['app-ctrl-button', opts.className].filter(Boolean).join(' '),
      title: opts.title,
      'aria-label': opts.title,
    });
    this.button.append(svgIcon(opts.icon));
    this.button.addEventListener('click', () => opts.onClick(this.button));
    this.container = h('div', { class: 'maplibregl-ctrl maplibregl-ctrl-group' }, this.button);
  }

  onAdd(): HTMLElement {
    return this.container;
  }

  onRemove(): void {
    this.container.remove();
  }
}
