import { h } from './dom';

export type ToastKind = 'info' | 'error';
export type Toast = (message: string, kind?: ToastKind) => void;

const VISIBLE_MS = 3500;

/** 画面下部に短いメッセージを出す関数を作る */
export function createToaster(root: HTMLElement): Toast {
  const stack = h('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
  root.append(stack);
  return (message, kind = 'info') => {
    const toast = h('div', { class: `toast toast--${kind}` }, message);
    stack.append(toast);
    window.setTimeout(() => {
      toast.classList.add('toast--leaving');
      window.setTimeout(() => toast.remove(), 250);
    }, VISIBLE_MS);
  };
}
