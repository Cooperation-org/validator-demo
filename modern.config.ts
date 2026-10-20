import { appTools, defineConfig } from '@modern-js/app-tools';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  plugins: [appTools()],
  builderPlugins: [pluginTailwindcss()],
  server: {
    ssr: false,
  },
});
