import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const AUDIENCE_NAME = 'GoodBotAI Newsletter';

async function getOrCreateAudience(): Promise<string | null> {
  try {
    const res = await fetch('https://api.resend.com/audiences', {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` }
    });
    const data = await res.json();
    const existing = (data.data || []).find((a: any) => a.name === AUDIENCE_NAME);
    if (existing) return existing.id;

    const create = await fetch('https://api.resend.com/audiences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: AUDIENCE_NAME })
    });
    const created = await create.json();
    return created.id || null;
  } catch (e) {
    console.error('Resend audience error:', e);
    return null;
  }
}

router.post('/', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email required' });
    return;
  }

  if (!RESEND_API_KEY) {
    res.status(500).json({ error: 'Newsletter not configured' });
    return;
  }

  try {
    const audienceId = await getOrCreateAudience();
    if (!audienceId) {
      res.status(500).json({ error: 'Could not create audience' });
      return;
    }

    const result = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, unsubscribed: false })
    });
    const data = await result.json();

    if (!result.ok) {
      if (data.error?.message?.includes('already exists')) {
        res.json({ success: true, message: 'Already subscribed!' });
        return;
      }
      res.status(500).json({ error: data.error?.message || 'Failed' });
      return;
    }

    res.json({ success: true, message: 'Subscribed! Check your inbox to confirm.' });
  } catch (e) {
    console.error('Newsletter error:', e);
    res.status(500).json({ error: 'Service error' });
  }
});

export default router;
