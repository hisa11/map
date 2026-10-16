# CLAUDE.md

Web と Android（Capacitor）で同じコードを動かす地図アプリ。詳細は README.md。

## 規約

- 機能は `src/features/<id>/index.ts` に `defineFeature` で書き、`src/features/index.ts` の配列に足す。core を機能固有の処理で太らせない
- Web と Android で挙動が違う処理（位置情報、HTTP、ファイル、権限など）は `src/platform/index.ts` に置く。features から `@capacitor/*` を直接呼ばない
- 地図に足す source / layer の ID は `overlay:` で始める（背景地図の切り替えで引き継ぐため）。追加は `onceStyleLoaded` の中で行う
- 外部 API の応答は `unknown` として受け、検証関数（例: `parseGsiResponse`）を通してから使う。DOM へは `h()` の文字列子（textContent）で入れ、innerHTML に外部の値を入れない
- UI の文言は日本語
- Android の権限を足したら `android/app/src/main/AndroidManifest.xml` も更新する

## 確認コマンド

```bash
npm run typecheck && npm test
npm run test:e2e        # 地図タイル・検索 API はテスト内でモックしている
npm run android:sync    # Android へ反映（ビルドは android/ で ./gradlew assembleDebug）
```

純粋関数は `tests/` に単体テスト、画面操作は `e2e/app.spec.ts` に E2E を足す。
