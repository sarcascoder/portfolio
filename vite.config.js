import { defineConfig } from 'vite';
import { resolve } from 'path';
import obfuscator from 'rollup-plugin-obfuscator';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        projects: resolve(__dirname, 'projects.html'),
        services: resolve(__dirname, 'services.html'),
      },
      output: {
        // Split heavy vendor code into its own chunk. Three.js + the GLB
        // loader make up ~680KB of the previous monolithic main.js.
        // Putting them in a separate chunk means repeat visitors can cache
        // three-vendor.js across deploys and only re-fetch the app layer.
        manualChunks: {
          'three-vendor': ['three', 'three/examples/jsm/loaders/GLTFLoader.js'],
        },
      },
    },
    // Raise the warning-free chunk limit since the three-vendor chunk will
    // legitimately be ~680KB. Terser + gzip brings that to ~150KB on the wire.
    chunkSizeWarningLimit: 750,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        // Strip all console.* calls (not just .log) and tell Terser these are
        // pure so it can drop their entire argument expression trees.
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        // Two passes squeezes ~3-5% more compression out at the cost of
        // slightly longer build time.
        passes: 2,
      },
      format: {
        comments: false,
      },
    },
  },
  plugins: [
    obfuscator({
      // global:false processes each MODULE instead of the merged chunk, which
      // makes the `exclude` filter actually skip node_modules code. Third-party
      // libs (Three.js, GLTFLoader) are public open-source — nothing to
      // protect — and running the obfuscator over them was bloating the vendor
      // chunk ~3x because of controlFlowFlattening + deadCodeInjection + RC4
      // string encoding. App code is still obfuscated.
      global: false,
      exclude: [/node_modules/],
      options: {
        // Obfuscation is kept for IP protection, but the three runtime-hot
        // options below were dropped because they burn CPU on every function
        // call — invisible to users but a major continuous-heat source on
        // interactive sites like this one. The bundle still looks obfuscated
        // (hex identifiers, encoded string array, number expressions,
        // splitStrings, rotated array, selfDefending) — just without the
        // execution-path mangling that turned every function into a
        // switch-state machine.
        compact: true,
        // controlFlowFlattening:  was true — dropped. Turned every function
        //                          into a switch(state) loop that costs
        //                          ~2-3× per call.
        // deadCodeInjection:      was true — dropped. Padded every function
        //                          with unreachable branches the engine still
        //                          had to parse + JIT.
        // debugProtection:        was true — dropped. Ran a polling anti-
        //                          debugger check loop in the background.
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        rotateStringArray: true,
        selfDefending: true,
        stringArray: true,
        // RC4 decoded strings at every access; base64 is trivially cheaper
        // and strings are still not directly readable.
        stringArrayEncoding: ['base64'],
        splitStrings: true,
      },
    }),
  ],
});
