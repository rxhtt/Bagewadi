
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This ensures process.env is available in the browser for the Gemini SDK
    'process.env': {
      API_KEY: process.env.API_KEY || ''
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
