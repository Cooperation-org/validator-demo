import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  plugins: [appTools(), bffPlugin()],
  builderPlugins: [pluginTailwindcss()],
  html: {
    title: 'Validator demo',
    favicon: './src/assets/icon-192.png',
    appIcon: { icons: [{ src: './src/assets/icon-192.png', size: 192 }] },
  },
  server: {
    ssr: false,
  },
});
