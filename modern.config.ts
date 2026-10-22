import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// APP_BASE_PATH serves the app under a path prefix, e.g. /validator-demo on
// demos.linkedtrust.us. Unset serves it at /. Read at build time.
const baseUrl = process.env.APP_BASE_PATH?.replace(/\/$/, '') || undefined;

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  plugins: [appTools(), bffPlugin()],
  builderPlugins: [pluginTailwindcss()],
  server: {
    ssr: false,
    baseUrl,
  },
  source: {
    // Read by src/bff-client.ts to prefix BFF requests from the browser.
    globalVars: { 'process.env.APP_BASE_PATH': baseUrl ?? '' },
  },
  output: {
    assetPrefix: baseUrl ? `${baseUrl}/` : undefined,
  },
});
