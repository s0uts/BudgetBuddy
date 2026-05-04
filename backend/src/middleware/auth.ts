import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Service-role client — used only on the backend
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Middleware: validates the Supabase JWT from Authorization header.
 * Sets req.userId on success, returns 401 on failure.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as AuthenticatedRequest).userId = user.id;
  (req as AuthenticatedRequest).userEmail = user.email ?? '';
  next();
}
