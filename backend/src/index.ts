import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { plaidRouter } from './routes/plaid';
import { stocksRouter } from './routes/stocks';
import { rulesRouter } from './routes/rules';
import { webhooksRouter } from './routes/webhooks';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Security ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:8081').split(','),
  credentials: true,
}));

// ─── Body parsing ──────────────────────────────────────────
// Webhooks need raw body for signature verification
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());

// ─── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// ─── Routes ────────────────────────────────────────────────
app.use('/api/plaid', plaidRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/webhooks', webhooksRouter);

// ─── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handler ─────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[BudgetBuddy API] running on port ${PORT}`);
});

export default app;
