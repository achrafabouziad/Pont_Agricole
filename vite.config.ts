import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin de synchronisation locale en temps réel entre tous les appareils du réseau local
// (Téléphone mobile en WiFi, Ordinateur Admin, et fenêtres de navigation)
function localSyncPlugin(): Plugin {
  const syncDir = path.resolve(process.cwd(), '.sync_data');
  const clientsFile = path.join(syncDir, 'clients.json');
  const deletedFile = path.join(syncDir, 'deleted_clients.json');
  const presenceFile = path.join(syncDir, 'presence.json');
  const ordersFile = path.join(syncDir, 'orders.json');
  const productsFile = path.join(syncDir, 'products.json');

  const ensureDir = () => {
    if (!fs.existsSync(syncDir)) {
      try {
        fs.mkdirSync(syncDir, { recursive: true });
      } catch {}
    }
  };

  const readJson = (filePath: string, fallback: any) => {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch {}
    return fallback;
  };

  const writeJson = (filePath: string, data: any) => {
    try {
      ensureDir();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write sync file', filePath, e);
    }
  };

  const normalizePhone = (raw: string) => {
    let digits = (raw || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('2120') && digits.length === 13) digits = '212' + digits.slice(4);
    if (digits.startsWith('0') && digits.length === 10) return '212' + digits.slice(1);
    if ((digits.startsWith('6') || digits.startsWith('7') || digits.startsWith('5')) && digits.length === 9)
      return '212' + digits;
    return digits;
  };

  return {
    name: 'pont-agricole-dev-sync',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/sync/')) {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const readBody = (callback: (body: any) => void) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk) => chunks.push(chunk));
          req.on('end', () => {
            try {
              const str = Buffer.concat(chunks).toString('utf8');
              const parsed = str ? JSON.parse(str) : {};
              callback(parsed);
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
        };

        // 1. ENDPOINT CLIENTS
        if (url.startsWith('/api/sync/clients')) {
          if (req.method === 'GET') {
            const clients = readJson(clientsFile, []);
            res.statusCode = 200;
            res.end(JSON.stringify(clients));
            return;
          }

          if (req.method === 'POST') {
            readBody((body) => {
              const existingClients = readJson(clientsFile, []);
              const incoming = Array.isArray(body) ? body : body.clients ? body.clients : [body];

              for (const inc of incoming) {
                if (!inc || !inc.businessName) continue;
                const incNormPhone = normalizePhone(inc.phone || '');
                const existingIdx = existingClients.findIndex((c: any) => {
                  if (inc.id && c.id === inc.id) return true;
                  if (inc.ownerId && c.ownerId === inc.ownerId) return true;
                  const cNormPhone = normalizePhone(c.phone || '');
                  if (incNormPhone && cNormPhone && incNormPhone === cNormPhone) return true;
                  if (inc.email && c.email && inc.email.toLowerCase().trim() === c.email.toLowerCase().trim()) return true;
                  return false;
                });

                if (existingIdx >= 0) {
                  existingClients[existingIdx] = {
                    ...existingClients[existingIdx],
                    ...inc,
                    updatedAt: new Date().toISOString(),
                  };
                } else {
                  existingClients.unshift({
                    ...inc,
                    id: inc.id || `biz-${Date.now()}`,
                    createdAt: inc.createdAt || new Date().toISOString(),
                  });
                }
              }

              writeJson(clientsFile, existingClients);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: existingClients.length, clients: existingClients }));
            });
            return;
          }

          if (req.method === 'PUT') {
            readBody((body) => {
              const existingClients = readJson(clientsFile, []);
              const targetId = body.id || body.businessId;
              let found = false;
              for (let i = 0; i < existingClients.length; i++) {
                if (existingClients[i].id === targetId || existingClients[i].ownerId === targetId) {
                  existingClients[i] = { ...existingClients[i], ...body, updatedAt: new Date().toISOString() };
                  found = true;
                  break;
                }
              }
              if (found) {
                writeJson(clientsFile, existingClients);
              }
              res.statusCode = 200;
              res.end(JSON.stringify({ success: found }));
            });
            return;
          }

          if (req.method === 'DELETE') {
            const urlObj = new URL(url, 'http://localhost');
            const targetId = urlObj.searchParams.get('id');
            const existingClients = readJson(clientsFile, []);
            const filtered = existingClients.filter((c: any) => c.id !== targetId && c.ownerId !== targetId);
            writeJson(clientsFile, filtered);

            if (targetId) {
              const deleted = readJson(deletedFile, []);
              if (!deleted.includes(targetId)) {
                deleted.push(targetId);
                writeJson(deletedFile, deleted);
              }
            }

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: filtered.length }));
            return;
          }
        }

        // 1b. ENDPOINT COMPTES CLIENTS SUPPRIMÉS (EXPULSION INSTANTANÉE MULTI-APPAREILS)
        if (url.startsWith('/api/sync/deleted-clients')) {
          if (req.method === 'GET') {
            const deleted = readJson(deletedFile, []);
            res.statusCode = 200;
            res.end(JSON.stringify(deleted));
            return;
          }
          if (req.method === 'POST') {
            readBody((body) => {
              const deleted = readJson(deletedFile, []);
              const id = body.id || body.clientId;
              const ownerId = body.ownerId;
              if (id && !deleted.includes(id)) deleted.push(id);
              if (ownerId && !deleted.includes(ownerId)) deleted.push(ownerId);
              writeJson(deletedFile, deleted);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: deleted.length }));
            });
            return;
          }
        }

        // 2. ENDPOINT PRÉSENCE
        if (url.startsWith('/api/sync/presence')) {
          if (req.method === 'GET') {
            const presence = readJson(presenceFile, {});
            res.statusCode = 200;
            res.end(JSON.stringify(presence));
            return;
          }
          if (req.method === 'POST') {
            readBody((body) => {
              const presence = readJson(presenceFile, {});
              const nowIso = new Date().toISOString();
              if (body.userId) presence[body.userId] = nowIso;
              if (body.businessId) presence[body.businessId] = nowIso;
              if (body.phone) {
                const norm = normalizePhone(body.phone);
                if (norm) presence[norm] = nowIso;
              }
              writeJson(presenceFile, presence);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, presence }));
            });
            return;
          }
        }

        // 3. ENDPOINT COMMANDES
        if (url.startsWith('/api/sync/orders')) {
          if (req.method === 'GET') {
            const orders = readJson(ordersFile, []);
            res.statusCode = 200;
            res.end(JSON.stringify(orders));
            return;
          }
          if (req.method === 'POST') {
            readBody((body) => {
              const orders = readJson(ordersFile, []);
              const incoming = Array.isArray(body) ? body : [body];
              for (const ord of incoming) {
                if (!ord || !ord.id) continue;
                const idx = orders.findIndex((o: any) => o.id === ord.id);
                if (idx >= 0) orders[idx] = { ...orders[idx], ...ord };
                else orders.unshift(ord);
              }
              writeJson(ordersFile, orders);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: orders.length }));
            });
            return;
          }
          if (req.method === 'DELETE') {
            const urlObj = new URL(url, 'http://localhost');
            const targetId = urlObj.searchParams.get('id');
            const orders = readJson(ordersFile, []);
            const filtered = orders.filter((o: any) => o.id !== targetId);
            writeJson(ordersFile, filtered);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: filtered.length }));
            return;
          }
        }

        // 4. ENDPOINT PRODUITS (SYNCHRONISATION MULTI-APPAREILS LOCAL / WIFI)
        if (url.startsWith('/api/sync/products')) {
          if (req.method === 'GET') {
            const products = readJson(productsFile, []);
            res.statusCode = 200;
            res.end(JSON.stringify(products));
            return;
          }
          if (req.method === 'POST') {
            readBody((body) => {
              const products = readJson(productsFile, []);
              const incoming = Array.isArray(body) ? body : [body];
              for (const prod of incoming) {
                if (!prod || !prod.id) continue;
                const idx = products.findIndex((p: any) => p.id === prod.id);
                if (idx >= 0) {
                  products[idx] = { ...products[idx], ...prod };
                } else {
                  products.unshift(prod);
                }
              }
              writeJson(productsFile, products);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, count: products.length, products }));
            });
            return;
          }
          if (req.method === 'DELETE') {
            const urlObj = new URL(url, 'http://localhost');
            const targetId = urlObj.searchParams.get('id');
            const products = readJson(productsFile, []);
            const filtered = products.filter((p: any) => p.id !== targetId);
            writeJson(productsFile, filtered);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, count: filtered.length }));
            return;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return {
    server: {
      host: true,
      port: 5173,
    },
    preview: {
      host: true,
      port: 5173,
    },
    plugins: [react(), localSyncPlugin()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
  };
});

