// filepath: frontend/src/api/config.js
/**
 * AEGIS-IoT Centralized API Endpoint Configuration
 * - Local dev: Falls back to empty string, routing through Vite's proxy to http://127.0.0.1:8000
 * - Production: Set VITE_API_URL in Vercel/Netlify dashboard (e.g. https://aegis-backend.onrender.com)
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const apiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
};

export default {
  API_BASE,
  apiUrl,
};
