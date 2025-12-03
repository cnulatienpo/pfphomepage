import React, { useEffect, useState } from 'react';
import ExportPanel from './components/ExportPanel';
import FontMaker from '@components/FontMaker';

function App() {
  const [activeTab, setActiveTab] = useState('font-maker');
  const [themeFont, setThemeFont] = useState('Inter');

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-font', themeFont);
  }, [themeFont]);

  return (
    <div
      style={{
        fontFamily: "var(--theme-font, 'Inter')",
        padding: '1rem',
        background: '#f5f5f5',
        minHeight: '100vh',
      }}
    >
      <nav
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <button
          onClick={() => setActiveTab('font-maker')}
          style={{
            padding: '0.6rem 1rem',
            fontWeight: 700,
            background: activeTab === 'font-maker' ? '#222' : '#fff',
            color: activeTab === 'font-maker' ? '#fff' : '#222',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        >
          Font Maker
        </button>
        <button
          onClick={() => setActiveTab('export')}
          style={{
            padding: '0.6rem 1rem',
            fontWeight: 700,
            background: activeTab === 'export' ? '#222' : '#fff',
            color: activeTab === 'export' ? '#fff' : '#222',
            borderRadius: '6px',
            border: '1px solid #ccc',
          }}
        >
          Export Theme
        </button>
      </nav>

      {activeTab === 'font-maker' ? (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <FontMaker onApplyFont={setThemeFont} />
        </div>
      ) : (
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Theme Exporter</h2>
          <p style={{ color: '#555' }}>
            Current theme font: <strong>{themeFont}</strong>
          </p>
          <ExportPanel />
        </div>
      )}
    </div>
  );
}

export default App;
