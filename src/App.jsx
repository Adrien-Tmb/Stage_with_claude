import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useAppStore } from './store/useAppStore.js';
import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Feed from './pages/Feed.jsx';
import Pipeline from './pages/Pipeline.jsx';
import MapPage from './pages/MapPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import Contacts from './pages/Contacts.jsx';
import Companies from './pages/Companies.jsx';
import Settings from './pages/Settings.jsx';

function useTheme() {
  const theme = useAppStore((s) => s.settings.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

/** Démarrage : collecte initiale / rattrapage, puis horloge d'une minute (planning 10h–15h, relances, expirations). */
function useEngine() {
  useEffect(() => {
    const { bootstrap, tick } = useAppStore.getState();
    bootstrap();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);
}

export default function App() {
  useTheme();
  useEngine();
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="france" element={<Feed space="france" />} />
          <Route path="international" element={<Feed space="international" />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="map" element={<MapPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="companies" element={<Companies />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
