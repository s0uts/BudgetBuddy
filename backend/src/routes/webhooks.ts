import { Router, Request, Response } from 'express';
import { WebhookType } from 'plaid';

const router = Router();

// ─── POST /api/webhooks/plaid ────────────────────────────────
// Called by Plaid when transactions update
// Body is raw buffer (we used express.raw in index.ts)
router.post('/plaid', async (req: Request, res: Response) => {
  const body = req.body instanceof Buffer
    ? JSON.parse(req.body.toString())
    : req.body;

  const { webhook_type, webhook_code, item_id } = body;

  console.log(`[Webhook] ${webhook_type}/${webhook_code} for item ${item_id}`);

  // For now, acknowledge receipt.
  // In production, validate Plaid-Verification-Id header against Plaid's JWKS endpoint
  // and queue a sync job for the affected user.

  if (webhook_type === WebhookType.Transactions) {
    switch (webhook_code) {
      case 'SYNC_UPDATES_AVAILABLE':
      case 'DEFAULT_UPDATE':
        // TODO: queue a sync job for this item_id
        // The full sync endpoint handles incremental sync via cursor
        console.log(`[Webhook] Sync needed for item ${item_id}`);
        break;
      case 'TRANSACTIONS_REMOVED':
        console.log(`[Webhook] Transactions removed for item ${item_id}`);
        break;
    }
  }

  res.status(200).json({ received: true });
});

export { router as webhooksRouter };
