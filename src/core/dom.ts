type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | undefined>;

/**
 * 小さな DOM 生成ヘルパー。文字列の子は textContent 扱いなので、外部 API の値をそのまま渡してよい。
 * 属性値 true は空文字属性（hidden 等）、false / undefined は付けない。
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

/** 自前で用意した SVG 文字列から要素を作る（外部入力を渡さないこと） */
export function svgIcon(svg: string): Element {
  const template = document.createElement('template');
  template.innerHTML = svg.trim();
  const icon = template.content.firstElementChild;
  if (!icon) throw new Error('invalid svg');
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}
