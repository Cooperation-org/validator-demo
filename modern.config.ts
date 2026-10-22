import { appTools, defineConfig } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  plugins: [appTools(), bffPlugin()],
  builderPlugins: [pluginTailwindcss()],
  server: {
    ssr: false,
  },
});
