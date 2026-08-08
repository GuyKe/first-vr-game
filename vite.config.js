import { defineConfig } from "vite";
import mkcert from "vite-plugin-mkcert";

// WebXR requires a secure context. `localhost` is exempt, but testing on an
// actual Quest headset over the local network needs HTTPS — mkcert provides
// a locally-trusted cert for that (`npm run dev`, then open the printed
// https://<your-ip>:5173 URL in the Quest Browser).
export default defineConfig({
  plugins: [mkcert()],
  server: {
    host: true,
  },
});
