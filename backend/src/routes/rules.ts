import { Router, Request, Response } from 'express';
import Groq from 'groq-sdk';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const RULE_SCHEMA = `
interface Condition {
  field: 'amount' | 'merchant' | 'description' | 'account' | 'date_day';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex';
  value: string | number;
}

type Action =
  | { type: 'set_category'; category: string }       // category must be one of the CATEGORIES list
  | { type: 'add_tag'; tag: string }
  | { type: 'mark_investment'; investment_account_id: string }
  | { type: 'contribute_to_goal'; goal_id: string }
  | { type: 'ignore' }
  | { type: 'notify'; message: string }
  | { type: 'rename'; name: string };

interface Rule {
  name: string;
  description: string;
  conditions: Condition[];
  actions: Action[];
}
`;

const CATEGORIES = [
  'Food & Drink', 'Groceries', 'Shopping', 'Entertainment', 'Transportation',
  'Travel', 'Health & Medical', 'Personal Care', 'Bills & Utilities', 'Rent & Housing',
  'Investments', 'Transfers', 'Income', 'Education', 'Gifts & Donations', 'Business',
  'Government', 'Other',
];

const SYSTEM_PROMPT = `You are a financial rules engine assistant for BudgetBuddy, a Canadian budgeting app.
Your job is to convert natural language rule descriptions into structured JSON rules.

${RULE_SCHEMA}

Available categories: ${CATEGORIES.join(', ')}

Rules:
- amount is NEGATIVE for expenses/debits and POSITIVE for income/credits
- field "merchant" and "description" are compared case-insensitively
- Use "contains" for partial matches, "equals" for exact matches
- For investment transfers, use mark_investment action (set investment_account_id to "PLACEHOLDER" if unknown)
- name should be short and descriptive (3-8 words)
- description should be human-readable explanation of what the rule does

Respond ONLY with a JSON object matching this exact shape:
{
  "rule": {
    "name": "...",
    "description": "...",
    "conditions": [...],
    "actions": [...]
  },
  "confidence": 0.0 to 1.0,
  "clarification": "optional string if you need more info"
}`;

// ─── POST /api/rules/parse ────────────────────────────────────
router.post('/parse', async (req: Request, res: Response) => {
  const { text } = req.body as { text?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: 'Missing text field' });
    return;
  }

  if (text.length > 1000) {
    res.status(400).json({ error: 'Text too long (max 1000 chars)' });
    return;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      res.status(500).json({ error: 'No response from AI' });
      return;
    }

    const parsed = JSON.parse(raw) as {
      rule: {
        name: string;
        description: string;
        conditions: unknown[];
        actions: unknown[];
      };
      confidence: number;
      clarification?: string;
    };

    // Basic validation
    if (!parsed.rule?.conditions || !parsed.rule?.actions) {
      res.status(422).json({ error: 'AI returned invalid rule structure' });
      return;
    }

    res.json(parsed);
  } catch (err) {
    console.error('[Rules] parse error', err);
    if (err instanceof SyntaxError) {
      res.status(422).json({ error: 'AI returned invalid JSON' });
      return;
    }
    res.status(500).json({ error: 'Rule parsing failed' });
  }
});

export { router as rulesRouter };
