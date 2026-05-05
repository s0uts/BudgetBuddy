import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY;
const PRICE_CACHE = new Map<string, { price: number; timestamp: number; data: object }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface StockQuote {
  ticker: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  name: string;
}

async function fetchFromTwelveData(ticker: string): Promise<StockQuote | null> {
  if (!TWELVE_DATA_KEY) return null;

  try {
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(ticker)}&apikey=${TWELVE_DATA_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { price?: string; status?: string };
    if (!data.price) return null;

    // Also fetch quote for change data
    const quoteUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(ticker)}&apikey=${TWELVE_DATA_KEY}`;
    const quoteRes = await fetch(quoteUrl);
    const quoteData = await quoteRes.json() as {
      name?: string;
      currency?: string;
      change?: string;
      percent_change?: string;
    };

    return {
      ticker: ticker.toUpperCase(),
      price: parseFloat(data.price),
      currency: quoteData.currency ?? 'CAD',
      change: parseFloat(quoteData.change ?? '0'),
      changePercent: parseFloat(quoteData.percent_change ?? '0'),
      name: quoteData.name ?? ticker,
    };
  } catch {
    return null;
  }
}

// Fallback: yfinance-style Yahoo Finance unofficial API
async function fetchFromYahoo(ticker: string): Promise<StockQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            previousClose?: number;
            currency?: string;
            longName?: string;
            shortName?: string;
          };
        }>;
        error?: unknown;
      };
    };
    const result = data.chart?.result?.[0];
    if (!result?.meta?.regularMarketPrice) return null;

    const price = result.meta.regularMarketPrice;
    const prevClose = result.meta.previousClose ?? price;
    const change = price - prevClose;

    return {
      ticker: ticker.toUpperCase(),
      price,
      currency: result.meta.currency ?? 'CAD',
      change,
      changePercent: prevClose > 0 ? (change / prevClose) * 100 : 0,
      name: result.meta.longName ?? result.meta.shortName ?? ticker,
    };
  } catch {
    return null;
  }
}

async function getQuote(ticker: string): Promise<StockQuote | null> {
  const cached = PRICE_CACHE.get(ticker.toUpperCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data as StockQuote;
  }

  // Twelve Data returns USD for Canadian .TO tickers — use Yahoo for those
  const isCanadian = ticker.toUpperCase().endsWith('.TO');
  const quote = isCanadian
    ? await fetchFromYahoo(ticker)
    : await fetchFromTwelveData(ticker) ?? await fetchFromYahoo(ticker);
  if (quote) {
    PRICE_CACHE.set(ticker.toUpperCase(), {
      price: quote.price,
      timestamp: Date.now(),
      data: quote,
    });
  }
  return quote;
}

// ─── GET /api/stocks/:ticker ─────────────────────────────────
router.get('/:ticker', async (req: Request, res: Response) => {
  const { ticker } = req.params;
  const quote = await getQuote(ticker);
  if (!quote) {
    res.status(404).json({ error: `Could not fetch price for ${ticker}` });
    return;
  }
  res.json(quote);
});

// ─── GET /api/stocks/batch?tickers=XEQT.TO,VEQT.TO ─────────
router.get('/', async (req: Request, res: Response) => {
  const tickersParam = req.query.tickers as string | undefined;
  if (!tickersParam) {
    res.status(400).json({ error: 'Missing tickers query parameter' });
    return;
  }

  const tickers = tickersParam.split(',').map((t) => t.trim()).filter(Boolean);
  const quotes = await Promise.all(tickers.map(getQuote));
  res.json(quotes.filter(Boolean));
});

export { router as stocksRouter };
