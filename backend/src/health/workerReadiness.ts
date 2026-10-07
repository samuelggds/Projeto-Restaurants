import { createServer } from 'node:http';
import { createCachedDatabaseReadiness } from './readiness.js';

export function createWorkerReadinessServer({
  runtimeReady,
  databaseReady = createCachedDatabaseReadiness(),
}: {
  runtimeReady: () => boolean;
  databaseReady?: () => Promise<{ ready: boolean }>;
}) {
  // Loopback only: this endpoint is for the container and deploy controller.
  // It checks the worker runtime, not completion of every scheduled business job.
  return createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    if (request.method !== 'GET' || request.url !== '/ready') {
      response.writeHead(404).end(JSON.stringify({ ready: false }));
      return;
    }
    void Promise.resolve()
      .then(async () => runtimeReady() && (await databaseReady()).ready && runtimeReady())
      .catch(() => false)
      .then((ready) => {
        response.writeHead(ready ? 200 : 503).end(JSON.stringify({ ready }));
      });
  });
}
