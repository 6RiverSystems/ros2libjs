import { resolve } from 'path';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import dts from 'vite-plugin-dts';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    }),
    checker({
      typescript: true
    }),
    nodePolyfills(),
  ],
  build: {
    minify: false,
    terserOptions: {
      compress: false,
      mangle: false,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/RosLib.js'),
      name: 'ROSLIB',
      // the proper extensions will be added
      fileName: 'RosLib',
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['eventemitter3', 'ws', 'src/util/decompressPng.js'],
      output: {
        globals: { eventemitter3: 'EventEmitter3' }
      }
    },
  },
  test: {
    include: [
      '{src,test}/**\/*.{test,spec}.?(c|m)[jt]s?(x)',
      './test/examples/*.js',
    ],
    exclude: ['dist'],
    environmentMatchGlobs: [
      // React example requires DOM emulation
      ['examples/react-example/**', 'jsdom']
    ]
  }
})
