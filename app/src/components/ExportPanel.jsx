import React from 'react';
import { useThemeFont } from 'pfp-theme/ThemeFontContext';

export default function ExportPanel() {
  const { activeFontName } = useThemeFont();

  return (
    <div>
      <p>Prepare your theme assets and export them when ready.</p>
      <p style={{ color: '#555', marginTop: '0.5rem' }}>
        Current theme font: <strong>{activeFontName}</strong>
      </p>
    </div>
  );
}
