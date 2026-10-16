// 24x24, stroke ベースのアイコン。currentColor で色を継承する
const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ICON_LAYERS = svg('<path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 13 10 5 10-5"/><path d="m2 17.5 10 5 10-5" opacity=".55"/>');
export const ICON_LOCATE = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/>');
export const ICON_SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>');
export const ICON_CLOSE = svg('<path d="M6 6l12 12M18 6 6 18"/>');
export const ICON_COPY = svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>');
