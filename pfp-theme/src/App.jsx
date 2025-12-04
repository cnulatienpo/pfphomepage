import React, { useEffect, useMemo, useState } from 'react';
import ExportPanel from './components/ExportPanel';
import FontMakerRoute from 'pfp-theme/FontMakerRoute';
import { registerFontMakerRoute } from 'pfp-theme/registerFontMakerRoute';
import { useThemeFont } from 'pfp-theme/ThemeFontContext';

function App() {
  const routes = useMemo(() => {
    const list = [];
    registerFontMakerRoute({
      addRoute(route) {
        list.push({
          ...route,
          label: route.label || 'Font Maker',
          element: <FontMakerRoute />,
        });
      },
    });

    list.push({
      path: '/export',
      label: 'Export Theme',
      element: <ExportPanel />,
    });

    return list;
  }, []);

  const [activePath, setActivePath] = useState(() => {
    const hashPath = window.location.hash.replace('#', '');
    const candidate = hashPath ? `/${hashPath}` : routes[0]?.path;
    const match = routes.find((r) => r.path === candidate);
    return match ? match.path : routes[0]?.path;
  });

  useEffect(() => {
    function syncFromHash() {
      const hashPath = window.location.hash.replace('#', '');
      const candidate = hashPath ? `/${hashPath}` : routes[0]?.path;
      const match = routes.find((r) => r.path === candidate);
      if (match) setActivePath(match.path);
    }

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [routes]);

  useEffect(() => {
    if (!activePath) return;
    const normalized = activePath.replace(/^\//, '');
    if (normalized && window.location.hash !== `#${normalized}`) {
      window.location.hash = normalized;
    }
  }, [activePath]);

  const { activeFontName } = useThemeFont();
  const activeRoute = routes.find((r) => r.path === activePath) || routes[0];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
        minHeight: '100vh',
        background: '#f5f5f5',
        color: '#111',
        fontFamily: "var(--theme-font, 'Inter')",
      }}
    >
      <aside
        style={{
          background: '#121826',
          color: '#f7f7f7',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Theme Builder</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          Active font: <strong style={{ color: '#fff' }}>{activeFontName}</strong>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {routes.map((route) => (
            <button
              key={route.path}
              onClick={() => setActivePath(route.path)}
              style={{
                textAlign: 'left',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background:
                  route.path === activePath ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: '#f7f7f7',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              {route.label}
            </button>
          ))}
        </nav>
      </aside>

      <main
        style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0 }}>{activeRoute?.label}</h1>
              <p style={{ margin: '4px 0 0', color: '#4b5563' }}>
                Build fonts and export your Fisher-Price inspired themes.
              </p>
            </div>
            <div style={{ textAlign: 'right', color: '#6b7280', fontSize: '0.9rem' }}>
              Using: <strong style={{ color: '#111' }}>{activeFontName}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            border: '1px solid #e5e7eb',
            minHeight: '70vh',
          }}
        >
          {activeRoute?.element}
        </div>
      </main>
    </div>
  );
}

export default App;
