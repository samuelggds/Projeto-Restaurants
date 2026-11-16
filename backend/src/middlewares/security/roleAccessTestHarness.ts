import express, { type RequestHandler, type Request } from 'express';
import type { AddressInfo } from 'node:net';

/**
 * Runs the real authorization middleware across a local HTTP boundary.
 *
 * Test identities are injected before the middleware: this validates role and
 * restaurant membership policies, not login/JWT verification.
 */
export async function probeRoleAccess(
  guard: RequestHandler,
  identity: Request['user'],
): Promise<{ status: number; body: unknown }> {
  const app = express();

  app.use((req, _res, next) => {
    req.user = identity;
    next();
  });
  app.get('/protected', guard, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>((resolve, reject) => {
      if (server.listening) return resolve();
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('A porta HTTP do teste não está disponível.');
    }

    const url = `http://127.0.0.1:${(address as AddressInfo).port}/protected`;
    const response = await fetch(url);
    const body: unknown = await response.json();
    return { status: response.status, body };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}
