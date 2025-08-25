import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { babel } from '@rollup/plugin-babel';
import postcss from 'rollup-plugin-postcss';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      tsconfigOverride: {
        compilerOptions: {
          jsx: 'react-jsx',
        },
      },
    }),
    babel({
      exclude: 'node_modules/**',
      presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
      babelHelpers: 'bundled',
    }),
    postcss({
      inject: true, // Inject CSS into the JavaScript bundle
      minimize: true, // Minify CSS for production
      extensions: ['.css'], // Process .css files
    }),
  ],
};