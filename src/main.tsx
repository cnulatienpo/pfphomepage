/// <reference types="vite/client" />
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { assetRegistry } from './lib/assetRegistry'


if (
  import.meta.env.PROD &&
  window.location.protocol === 'http:' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
) {
  window.location.replace(
    `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
}

const container = document.getElementById('root')

if (container) {
  const root = createRoot(container)
  root.render(<App />)
}
