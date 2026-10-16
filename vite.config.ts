/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Android 版は dist/ をアプリに同梱して https://localhost/ から読むので相対パスで出力する。
  // Web 側をサブディレクトリに置く場合もこのまま動く。
  base: './',
  build: {
    target: 'es2022',
    // maplibre-gl 本体だけで 1MB 前後あるため警告の閾値を上げる
    chunkSizeWarningLimit: 1500,
  },
  server: {
    // スマホから LAN 経由で開けるようにする（位置情報は HTTPS か localhost でしか使えない点に注意）
    host: true,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
