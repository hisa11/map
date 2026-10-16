import { expect, test, type Page } from '@playwright/test';
import { mockNetwork, near, OSAKA_CASTLE, pixelAt, readHash, TILE_RGB, VECTOR_RGB } from './helpers';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await mockNetwork(page);
});

test.afterEach(({ page }) => {
  expect(pageErrors.get(page) ?? [], 'ページ内でエラーが出ていない').toEqual([]);
});

const center = async (page: Page) => {
  const size = page.viewportSize();
  if (!size) throw new Error('viewport');
  // 画面中央は検索マーカー等が乗るので少しずらした点を見る
  return { x: Math.round(size.width / 2) + 40, y: Math.round(size.height * 0.62) };
};

test('起動すると既定位置に地理院タイルが描画される', async ({ page }) => {
  const worker = page.waitForResponse((res) => /maplibre-gl-worker-.*\.mjs/.test(res.url()));
  await page.goto('/');
  expect((await worker).status()).toBe(200);

  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('.maplibregl-ctrl-attrib-inner')).toContainText('地理院タイル');

  const p = await center(page);
  await expect.poll(() => pixelAt(page, p.x, p.y).then((c) => near(c, TILE_RGB))).toBe(true);

  // 既定位置（大阪駅付近, z11）が URL に出る
  await expect.poll(() => readHash(page)).toMatchObject({ zoom: 11 });
  const hash = await readHash(page);
  expect(hash?.lat).toBeCloseTo(34.7025, 3);
  expect(hash?.lng).toBeCloseTo(135.4959, 3);
});

test('背景地図を切り替えると描画が変わり、再読み込み後も保持される', async ({ page }) => {
  await page.goto('/');
  const p = await center(page);
  await expect.poll(() => pixelAt(page, p.x, p.y).then((c) => near(c, TILE_RGB))).toBe(true);

  await page.getByRole('button', { name: '背景地図を切り替え' }).click();
  const panel = page.getByRole('dialog', { name: '背景地図' });
  await expect(panel).toBeVisible();
  await panel.getByText('OpenFreeMap（ベクタ）').click();
  await expect(panel).toBeHidden();

  // GeoJSON の塗り（Worker で処理される）が描画されること
  await expect.poll(() => pixelAt(page, p.x, p.y).then((c) => near(c, VECTOR_RGB))).toBe(true);

  await page.reload();
  await expect.poll(() => pixelAt(page, p.x, p.y).then((c) => near(c, VECTOR_RGB))).toBe(true);
  await page.getByRole('button', { name: '背景地図を切り替え' }).click();
  await expect(panel.getByRole('radio', { name: 'OpenFreeMap（ベクタ）' })).toBeChecked();
});

test('地名で検索して候補を選ぶとその場所へ移動する', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('searchbox', { name: '検索' });
  await input.fill('大阪城');
  await input.press('Enter');

  const results = page.getByRole('listbox', { name: '検索結果' });
  await expect(results.getByRole('option')).toHaveCount(2);
  await results.getByRole('option', { name: '大阪城', exact: true }).click();
  await expect(results).toBeHidden();
  await expect(page.locator('.maplibregl-marker')).toHaveCount(1);

  await expect.poll(async () => (await readHash(page))?.zoom).toBeGreaterThanOrEqual(15.9);
  await expect.poll(async () => Math.abs(((await readHash(page))?.lat ?? 0) - OSAKA_CASTLE.lat)).toBeLessThan(0.001);
  await expect.poll(async () => Math.abs(((await readHash(page))?.lng ?? 0) - OSAKA_CASTLE.lng)).toBeLessThan(0.001);
});

test('緯度経度を入れると API を使わずに移動する', async ({ page }) => {
  let apiCalls = 0;
  page.on('request', (req) => {
    if (req.url().startsWith('https://msearch.gsi.go.jp/')) apiCalls++;
  });
  await page.goto('/');
  const input = page.getByRole('searchbox', { name: '検索' });
  await input.fill('35.681236, 139.767125');
  await input.press('Enter');

  await expect.poll(async () => Math.abs(((await readHash(page))?.lat ?? 0) - 35.681236)).toBeLessThan(0.001);
  await expect.poll(async () => Math.abs(((await readHash(page))?.lng ?? 0) - 139.767125)).toBeLessThan(0.001);
  expect(apiCalls).toBe(0);
});

test('見つからないときは知らせる', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('searchbox', { name: '検索' });
  await input.fill('存在しない地名');
  await input.press('Enter');
  await expect(page.getByRole('status')).toContainText('「存在しない地名」は見つかりませんでした');
});

test('現在地ボタンで現在地へ移動して印を置く', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 34.7706, longitude: 135.6283, accuracy: 30 });
  await page.goto('/');
  await page.getByRole('button', { name: '現在地' }).click();

  await expect(page.locator('.locate-dot')).toBeVisible();
  await expect.poll(async () => (await readHash(page))?.zoom).toBeGreaterThanOrEqual(16.9);
  await expect.poll(async () => Math.abs(((await readHash(page))?.lat ?? 0) - 34.7706)).toBeLessThan(0.001);
});

test('位置情報が拒否されたらエラーを出す', async ({ page }) => {
  // ヘッドレスでは許可ダイアログが保留のままになるので、ブラウザの「拒否」応答を直接返す
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) =>
      fail?.({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
  });
  await page.goto('/');
  await page.getByRole('button', { name: '現在地' }).click();
  await expect(page.getByRole('status')).toContainText('位置情報の利用が許可されていません');
  await expect(page.locator('.locate-dot')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '現在地' })).not.toHaveAttribute('aria-busy');
});

test('右クリックした地点の緯度経度を表示する', async ({ page, isMobile }) => {
  test.skip(isMobile, 'スマホは長押しのテストで見る');
  await page.goto('/');
  await expect.poll(() => readHash(page)).not.toBeNull();
  const box = await page.locator('#map').boundingBox();
  if (!box) throw new Error('map');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });

  const text = page.locator('.coord-popup__text');
  await expect(text).toBeVisible();
  const [lat, lng] = (await text.innerText()).split(',').map(Number);
  // 画面中央 = 地図の中心
  const hash = await readHash(page);
  expect(lat).toBeCloseTo(hash?.lat ?? 0, 3);
  expect(lng).toBeCloseTo(hash?.lng ?? 0, 3);
});

test('長押しした地点の緯度経度を表示する', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'タッチ操作はスマホのみ');
  await page.goto('/');
  await expect.poll(() => readHash(page)).not.toBeNull();
  const box = await page.locator('#map').boundingBox();
  if (!box) throw new Error('map');
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  await page.waitForTimeout(800);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect(page.locator('.coord-popup__text')).toBeVisible();
  await expect(page.locator('.coord-popup__text')).toHaveText(/^-?\d+\.\d{6}, -?\d+\.\d{6}$/);
});

test('短いタップでは緯度経度を出さない', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'タッチ操作はスマホのみ');
  await page.goto('/');
  const box = await page.locator('#map').boundingBox();
  if (!box) throw new Error('map');
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(900);
  await expect(page.locator('.coord-popup')).toHaveCount(0);
});

test('検索バーと右上のボタン列が重ならない', async ({ page }) => {
  await page.goto('/');
  const search = await page.locator('.search').boundingBox();
  const controls = await page.locator('.maplibregl-ctrl-top-right').boundingBox();
  if (!search || !controls) throw new Error('layout');
  const overlapX = search.x < controls.x + controls.width && controls.x < search.x + search.width;
  const overlapY = search.y < controls.y + controls.height && controls.y < search.y + search.height;
  expect(overlapX && overlapY).toBe(false);
});
