// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';

// Static pages are prerendered; the dealer area and warranty lookup run on the Node server
// (pages/endpoints that export `prerender = false`).
export default defineConfig({
  site: 'https://new.mastertune.vn',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  env: {
    schema: {
      // Shared access code for the dealer area. Set on the server (Hostinger env vars / .env), never in code.
      DEALER_ACCESS_CODE: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Random string used to sign the dealer session cookie.
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      // CSV with warranty records (serial,product,dealer,activated,expires). Defaults to private/warranty.csv.
      WARRANTY_FILE: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
