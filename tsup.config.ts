import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  // Excludes test files so their bun:test types never reach the published declarations.
  tsconfig: 'tsconfig.build.json',
});
