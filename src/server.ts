import http from 'http';
import * as erpSurface from './index';

const PORT = parseInt(process.env.PORT || '8080', 10);

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  // Health check
  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'healthy', service: 'erp-surface' }));
    return;
  }

  // Main API endpoint
  if (url.pathname === '/v1/erpsurface') {
    if (req.method === 'GET') {
      // Return registry statistics and available surfaces
      const stats = erpSurface.registry.getStatistics();
      const surfaces = erpSurface.registry.getAll();

      res.writeHead(200);
      res.end(JSON.stringify({
        service: 'erp-surface',
        version: '0.1.0',
        statistics: stats,
        surfaces: surfaces.map((s: erpSurface.RegistryEntry) => ({
          id: s.surfaceId,
          name: s.name,
          domain: s.domain,
          version: s.version
        }))
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          const { action, surfaceId, operationId, input } = payload;

          if (action === 'getSurface' && surfaceId) {
            const surface = erpSurface.registry.get(surfaceId);
            if (surface) {
              res.writeHead(200);
              res.end(JSON.stringify({ success: true, surface }));
            } else {
              res.writeHead(404);
              res.end(JSON.stringify({ success: false, error: 'Surface not found' }));
            }
            return;
          }

          if (action === 'simulate' && surfaceId && operationId) {
            const surface = erpSurface.registry.get(surfaceId);
            if (!surface) {
              res.writeHead(404);
              res.end(JSON.stringify({ success: false, error: 'Surface not found' }));
              return;
            }

            // Return simulation acknowledgment
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              simulation: {
                surfaceId,
                operationId,
                input,
                status: 'simulated',
                timestamp: new Date().toISOString()
              }
            }));
            return;
          }

          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid action' }));
        } catch (e) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // 404 for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found', path: url.pathname }));
});

server.listen(PORT, () => {
  console.log(`ERP Surface API running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET  /health        - Health check`);
  console.log(`  GET  /v1/erpsurface - List surfaces and stats`);
  console.log(`  POST /v1/erpsurface - Surface operations`);
});
