import { Response, Request } from 'express';
import jwt from 'jsonwebtoken';

interface SSEClient {
  id: string;
  role?: string;
  userId?: string;
  res: Response;
}

let latestStateVersion = Date.now();
const activeClients = new Map<string, SSEClient>();

/**
 * Broadcasts a live synchronization event to all connected browsers/devices.
 * Delivers updates instantly (within milliseconds) without requiring page reload.
 */
export function notifyLiveSync(event: {
  type: string;
  entityId?: string;
  role?: string;
  metadata?: any;
}) {
  latestStateVersion = Date.now();
  const payload = JSON.stringify({
    ...event,
    version: latestStateVersion,
    timestamp: latestStateVersion,
  });

  const message = `event: safal_sync\ndata: ${payload}\n\n`;

  for (const [clientId, client] of activeClients.entries()) {
    try {
      client.res.write(message);
    } catch (err) {
      console.warn(`[LiveSync] Failed to write to client ${clientId}, removing:`, err);
      activeClients.delete(clientId);
    }
  }
}

/**
 * Returns current live state timestamp for heartbeat polling fallback.
 */
export function getLiveSyncVersion(): { version: number; clientCount: number } {
  return {
    version: latestStateVersion,
    clientCount: activeClients.size,
  };
}

/**
 * Handles incoming SSE connections from frontend devices.
 */
export function handleSSEConnection(req: Request, res: Response) {
  // Extract token from query or header for role identification
  let userRole = 'ANONYMOUS';
  let userId = '';
  const token = (req.query.token as string) || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'safal-enterprise-jwt-super-secret-key-2026';
      const decoded = jwt.verify(token, secret) as any;
      userRole = decoded.role || userRole;
      userId = decoded.id || userId;
    } catch {
      // Ignore invalid token, still allow connection for broadcast
    }
  }

  const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Essential SSE headers + disable Nginx proxy buffering
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Instructs Nginx NOT to buffer SSE packets
    'Access-Control-Allow-Origin': '*',
  });

  // Initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId, version: latestStateVersion })}\n\n`);

  activeClients.set(clientId, {
    id: clientId,
    role: userRole,
    userId,
    res,
  });

  // Keep-alive heartbeat ping every 15 seconds to prevent NAT/proxy timeouts
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      activeClients.delete(clientId);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    activeClients.delete(clientId);
  });
}
