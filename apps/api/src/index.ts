import * as http from 'http';
import { handleApiRequest } from './routes.js';

const PORT = parseInt(process.env.PORT || '8000', 10);

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method || 'GET';

  let body: any = null;
  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    const buffers: Buffer[] = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const dataStr = Buffer.concat(buffers).toString('utf-8');
    if (dataStr) {
      try {
        body = JSON.parse(dataStr);
      } catch {
        body = dataStr;
      }
    }
  }

  try {
    const result = await handleApiRequest(method, pathname + url.search, body);
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.data));
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`[API] Afterbell REST API listening on http://localhost:${PORT}`);
});
