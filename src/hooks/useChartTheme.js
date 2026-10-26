// Jetons de couleur des graphiques, sélectionnés pour chaque thème (pas une simple inversion).
import { useAppStore } from '../store/useAppStore.js';

const LIGHT = {
  surface: '#ffffff', grid: '#e2e8f0', axis: '#64748b', text: '#0f172a', muted: '#64748b',
  series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  primary: '#1baf7a',
};
const DARK = {
  surface: '#111827', grid: '#1e293b', axis: '#94a3b8', text: '#f1f5f9', muted: '#94a3b8',
  series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  primary: '#199e70',
};

export function useChartTheme() {
  const theme = useAppStore((s) => s.settings.theme);
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return dark ? { ...DARK, dark } : { ...LIGHT, dark };
}
