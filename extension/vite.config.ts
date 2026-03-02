import { defineConfig } from "vite";
import path from "path";
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, unlinkSync, rmdirSync } from "fs";

export default defineConfig({
  root: __dirname,
  base: "./",
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "src/popup.html"),
        background: path.resolve(__dirname, "src/background.ts"),
        content: path.resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [
    {
      name: "copy-manifest",
      closeBundle() {
        const out = path.resolve(__dirname, "dist");
        if (!existsSync(out)) mkdirSync(out, { recursive: true });
        copyFileSync(
          path.resolve(__dirname, "manifest.json"),
          path.resolve(out, "manifest.json")
        );
        // Move popup.html to dist root and fix script path (Chrome needs relative path)
        const popupInSrc = path.join(out, "src", "popup.html");
        if (existsSync(popupInSrc)) {
          let html = readFileSync(popupInSrc, "utf-8");
          html = html.replace(/src="[^"]*popup\.js"/, 'src="popup.js"');
          writeFileSync(path.join(out, "popup.html"), html);
          unlinkSync(popupInSrc);
          try { rmdirSync(path.join(out, "src")); } catch {}
        }
      },
    },
  ],
});
