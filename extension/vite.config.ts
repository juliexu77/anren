import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import {
  copyFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
} from "fs";

// Vite config for the Anren extension (lives in anren repo, uses shared/ for types + API).
// Builds side-panel (React), copies public assets + manifest into dist.
export default defineConfig({
  plugins: [
    react(),
    {
      name: "extension-dist",
      closeBundle() {
        const out = path.resolve(__dirname, "dist");
        const publicDir = path.resolve(__dirname, "public");
        if (!existsSync(out)) mkdirSync(out, { recursive: true });

        // Copy manifest and add Supabase host permission
        const manifestPath = path.join(publicDir, "manifest.json");
        const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
        const hostPerms = new Set(manifest.host_permissions || []);
        hostPerms.add("https://*.supabase.co/*");
        manifest.host_permissions = [...hostPerms];
        writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));

        // Copy background and other public assets
        for (const name of ["background.js", "calendar-inject.js"]) {
          const src = path.join(publicDir, name);
          if (existsSync(src)) copyFileSync(src, path.join(out, name));
        }
        const iconsDir = path.join(publicDir, "icons");
        if (existsSync(iconsDir)) {
          const destIcons = path.join(out, "icons");
          if (!existsSync(destIcons)) mkdirSync(destIcons, { recursive: true });
          readdirSync(iconsDir).forEach((f) => {
            copyFileSync(path.join(iconsDir, f), path.join(destIcons, f));
          });
        }

        // Ensure side-panel.html references the built JS (Vite outputs sidePanel.js)
        const sidePanelPath = path.join(out, "side-panel.html");
        if (existsSync(sidePanelPath)) {
          let html = readFileSync(sidePanelPath, "utf-8");
          html = html.replace(/src="[^"]*"/, 'src="sidePanel.js"');
          writeFileSync(sidePanelPath, html);
        }
      },
    },
  ],
  root: ".",
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
        sidePanel: path.resolve(__dirname, "side-panel.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
  },
});
