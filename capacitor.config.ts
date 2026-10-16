import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.hisa11.map',
  appName: 'Map',
  webDir: 'dist',
  plugins: {
    SystemBars: {
      // index.html の viewport-fit=cover と揃える。ステータスバー等の逃げは CSS の env(safe-area-inset-*) で行う
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
