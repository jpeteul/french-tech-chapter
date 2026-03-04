// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// CHAPTER SETUP: Update this URL to match your chapter's domain
// This is used for generating sitemaps, canonical URLs, and OG images
const SITE_URL = 'https://frenchtech-boston.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin/') && !page.includes('/members/'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Force react-dom/server to use the edge-compatible version
      noExternal: ['react-dom'],
    },
    resolve: {
      alias: {
        'react-dom/server': 'react-dom/server.edge',
      },
    },
  },
});
