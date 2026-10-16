# Map

ブラウザと Android で同じコードが動く地図アプリ。

- Web: Vite + TypeScript + [MapLibre GL JS](https://maplibre.org/) v6
- Android: [Capacitor](https://capacitorjs.com/) 8 で Web のビルド結果（`dist/`）をアプリに同梱する

機能は `src/features/` の下に1機能1ディレクトリで足していく。Web と Android で処理が分かれるもの（位置情報・HTTP・保存）は `src/platform/` と `src/core/storage.ts` に閉じ込めてあるので、機能側は両方の違いを意識しなくてよい。

## 今ある機能

| 機能 | 場所 | 内容 |
| --- | --- | --- |
| 背景地図の切り替え | `features/basemap-switcher` | 地理院 標準 / 淡色 / 航空写真、OpenFreeMap（ベクタ）。選択は保存される |
| 検索 | `features/search` | 住所・地名は国土地理院の住所検索 API。`34.70, 135.49` のような緯度経度は直接移動 |
| 現在地 | `features/locate` | ボタンで1回測位して移動し、青い点を置く |
| 緯度経度の表示 | `features/coordinates` | PC は右クリック、スマホは長押しした地点の緯度経度を表示・コピー |
| 表示位置の保存 | `core/createApp.ts` | 最後に見ていた位置を次回起動時に復元。Web では URL の `#ズーム/緯度/経度` でも共有できる |

## 必要なもの

- Node.js 22.12 以上
- Android をビルドする場合: JDK 21 と Android SDK（API 36）。Android Studio を入れれば揃う

## 開発

```bash
npm install
npm run dev          # http://localhost:5173 で開発サーバ
npm run typecheck    # 型チェック
npm test             # 単体テスト（vitest）
npm run test:e2e     # E2E テスト（Playwright。初回は npx playwright install chromium）
npm run build        # dist/ に本番用ファイルを出力
```

E2E テストは地図タイルと検索 API をテスト内で差し替えているので、外部に通信せずに動く。

`npm run dev` はスマホから LAN 経由でも開けるが、ブラウザの制約で現在地は HTTPS か localhost のときしか使えない。

## Web として公開する

`npm run build` の `dist/` を静的ファイルとして配信するだけでよい（相対パスで出力しているのでサブディレクトリでも動く）。

```bash
npm run build
pm2 serve dist 8080 --name map   # 例: pm2 で配信する場合
```

現在地を使うには HTTPS が要る。前段に nginx などを置いて TLS を終端する。

## Android アプリ

```bash
npm run android:sync   # Web をビルドして android/ にコピーし、プラグインを同期
npm run android:open   # Android Studio で開く（実機・エミュレータでの実行はここから）
# または
cd android && ./gradlew assembleDebug   # app/build/outputs/apk/debug/app-debug.apk
```

Web 側のコードを変えたら、毎回 `npm run android:sync` してからビルドする。`android/` は Capacitor が生成したネイティブプロジェクトで、権限（`AndroidManifest.xml`）やアイコンを変えるときだけ触る。

GitHub に push すると CI（`.github/workflows/ci.yml`）が debug APK をビルドし、Actions の実行結果の Artifacts に `app-debug-apk` として置く。

## 機能の足し方

1. `src/features/<id>/index.ts` を作る

   ```ts
   import { defineFeature } from '../../core/feature';
   import { ButtonControl } from '../../core/control';
   import { ICON_LAYERS } from '../../core/icons';

   export const hello = defineFeature({
     id: 'hello',
     setup({ map, ui }) {
       map.addControl(
         new ButtonControl({ title: 'あいさつ', icon: ICON_LAYERS, onClick: () => ui.toast('こんにちは') }),
         'top-right',
       );
     },
   });
   ```

2. `src/features/index.ts` の配列に `hello` を足す

`setup` には `AppContext`（`src/core/feature.ts`）が渡される。

| 名前 | 用途 |
| --- | --- |
| `map` | MapLibre の `Map` |
| `basemap` | 背景地図の取得・切り替え・変更通知 |
| `storage` | 設定の保存（Web: localStorage / Android: SharedPreferences） |
| `platform` | 位置情報・HTTP など Web と Android で実装が違うもの |
| `ui.top` / `ui.overlay` / `ui.toast` | 上部バー、浮かせるパネルの置き場、短い通知 |

### 地図にレイヤーを重ねるとき

背景地図を切り替えると MapLibre のスタイルが丸ごと入れ替わる。**source と layer の ID を `overlay:` で始めておけば**、切り替え後も自動で引き継がれる（`src/core/basemap.ts` の `carryOverOverlays`）。

```ts
import { onceStyleLoaded } from '../../core/basemap';

onceStyleLoaded(map, () => {
  map.addSource('overlay:pins', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'overlay:pins', type: 'circle', source: 'overlay:pins' });
});
```

### Android の権限やネイティブ機能が要るとき

Capacitor のプラグイン（`@capacitor/*`）を入れて、呼び出しは `src/platform/index.ts` にまとめる。権限は `android/app/src/main/AndroidManifest.xml` に足し、`npm run android:sync` する。

## 構成

```
src/
  main.ts                 エントリポイント
  config/
    app.ts                既定の表示位置など
    basemaps.ts           背景地図の一覧（ここに足すとパネルに出る）
  core/                   機能から共通で使う部品
    createApp.ts          地図の生成、表示位置・背景地図の保存、機能の setup 呼び出し
    feature.ts            Feature / AppContext の型
    basemap.ts            背景地図の切り替えと重ね合わせの引き継ぎ
    storage.ts            保存
    control.ts            地図の隅に置くボタン
    dom.ts icons.ts toast.ts view.ts
  platform/index.ts       Web / Android の差を吸収する層
  features/               機能（1機能1ディレクトリ）
  styles/main.css
tests/                    単体テスト（vitest）
e2e/                      E2E テスト（Playwright、通信はモック）
android/                  Capacitor が生成した Android プロジェクト
capacitor.config.ts       アプリ ID・名前など
```

## 使っているデータと利用条件

- **地理院タイル**（国土地理院）: 出典の明示が条件。地図右下に「地理院タイル」と出している。詳しくは [地理院タイル一覧](https://maps.gsi.go.jp/development/ichiran.html) と国土地理院の利用規約を確認すること
- **OpenFreeMap**: キー不要の無料ベクタタイル。データは OpenStreetMap で、帰属表示はスタイルに含まれる
- **国土地理院 住所検索 API**（`msearch.gsi.go.jp`）: 地理院地図が使っている API。公開・継続の保証や利用条件は未確認なので、公開サービスで大量に使う前に確認すること
