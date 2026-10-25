import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
function localApi(): Plugin {
  return {
    name: 'local-vercel-functions',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const route = req.url?.split('?')[0];
        if (!['/chat', '/health', '/contact', '/ratings', '/admin'].includes(route || '')) return next();
        let raw = '';
        try {
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 20000) { res.statusCode = 413; res.end(JSON.stringify({ error: 'Pesan terlalu panjang.' })); return; }
          }
          (req as any).body = raw ? JSON.parse(raw) : {};
          (req as any).ip = req.socket.remoteAddress;
          const response = res as any;
          response.status = (status: number) => { res.statusCode = status; return response; };
          response.json = (body: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
          const module = await server.ssrLoadModule(`/api${route}.js`);
          await module.default(req, response);
        } catch {
          if (!res.writableEnded) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Permintaan tidak valid.' })); }
        }
      });
    }
  };
}
export default defineConfig(({ mode }) => {
  const localEnv = { ...loadEnv(mode, process.cwd(), 'CHAT_'), ...loadEnv(mode, process.cwd(), 'UPSTASH_') };
  for (const [key, value] of Object.entries(localEnv)) if (process.env[key] === undefined) process.env[key] = value;
  return {
  plugins: [react(), localApi()],
  server: { host: '0.0.0.0', port: 4173, allowedHosts: ['terminal.local'], watch: { ignored: ['**/docs/**'] } },
  build: { target: 'es2022', emptyOutDir: true }
  };
});
