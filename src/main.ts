import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.css';
import { createApp } from './core/createApp';
import { features } from './features';

const root = document.getElementById('app');
if (!root) throw new Error('#app が見つかりません');

createApp(root, features).catch((err: unknown) => {
  console.error(err);
  root.insertAdjacentHTML('beforeend', '<p class="fatal">地図を起動できませんでした。再読み込みしてください。</p>');
});
