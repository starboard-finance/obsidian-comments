import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'cjs',
  outfile: 'main.js',
  external: ['obsidian', '@codemirror/state', '@codemirror/view', '@codemirror/language'],
  loader: {
    '.ts': 'ts'
  },
  sourcemap: true,
  minify: false,
});

console.log('Build complete!');
