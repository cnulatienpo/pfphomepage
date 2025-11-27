import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [react(), vue()],
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        react: "src/react.tsx",
        vue: "src/vue.ts",
        styles: "src/styles.css"
      },
      name: "ConstructionFX",
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external: ["react", "react/jsx-runtime", "vue"]
    }
  }
});
