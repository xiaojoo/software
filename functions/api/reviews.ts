import { findSoftware, json, normalizeReviewContent, type PagesContext, type SafeReviewNode } from '../_shared';

interface ReviewRow {
  id: string;
  software_id: string;
  rating: number;
  content: string;
  rich_content: string | null;
  created_at: string;
}

export async function onRequestGet({ request, env }: PagesContext) {
  const id = new URL(request.url).searchParams.get('software') ?? '';
  if (!findSoftware(id)) return json({ error: 'Unknown software.' }, 400);
  if (!env.DB) return json({ reviews: [] });
  try {
    const { results } = await env.DB.prepare('SELECT id, software_id, rating, content, rich_content, created_at FROM reviews WHERE software_id = ? AND is_hidden = 0 ORDER BY created_at DESC LIMIT 100').bind(id).all<ReviewRow>();
    const reviews = results.map((review) => {
      let content: SafeReviewNode[] = [{ type: 'text', text: review.content }];
      if (review.rich_content) {
        try {
          content = JSON.parse(review.rich_content) as SafeReviewNode[];
        } catch {
          // Fall back to the plain text column if an old or damaged rich-text value is found.
        }
      }
      return { id: review.id, softwareId: review.software_id, rating: review.rating, content, createdAt: review.created_at };
    });
    return json({ reviews });
  } catch {
    return json({ error: 'Unable to load reviews.' }, 503);
  }
}

export async function onRequestPost({ request, env }: PagesContext) {
  let body: { softwareId?: unknown; rating?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }
  const id = typeof body.softwareId === 'string' ? body.softwareId : '';
  const rating = Number(body.rating);
  if (!findSoftware(id)) return json({ error: 'Unknown software.' }, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'Choose a rating from 1 to 5.' }, 400);
  let normalized: ReturnType<typeof normalizeReviewContent>;
  try {
    const content = typeof body.content === 'string' ? [{ type: 'text', text: body.content }] : body.content;
    normalized = normalizeReviewContent(content);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid review content.' }, 400);
  }
  if (!env.DB) return json({ error: 'Database is not configured.' }, 503);
  const review = { id: crypto.randomUUID(), softwareId: id, rating, content: normalized.tree, createdAt: new Date().toISOString() };
  try {
    await env.DB.prepare('INSERT INTO reviews (id, software_id, rating, content, rich_content, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(review.id, id, rating, normalized.text, JSON.stringify(normalized.tree), review.createdAt).run();
    return json({ review }, 201);
  } catch {
    return json({ error: 'Unable to save this review.' }, 503);
  }
}
