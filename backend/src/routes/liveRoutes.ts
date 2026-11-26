import { Router } from 'express';
import { handleSSEConnection, getLiveSyncVersion, notifyLiveSync } from '../services/liveSyncService.js';

const router = Router();

// Server-Sent Events stream for instant realtime push updates
router.get('/stream', handleSSEConnection);

// Fast heartbeat check endpoint (returns current state version timestamp)
router.get('/heartbeat', (_req, res) => {
  res.json(getLiveSyncVersion());
});

// Broadcast ping endpoint for testing or client-initiated triggers
router.post('/broadcast', (req, res) => {
  const { type = 'MANUAL_SYNC', entityId, metadata } = req.body || {};
  notifyLiveSync({ type, entityId, metadata });
  res.json({ success: true, version: getLiveSyncVersion() });
});

export default router;
