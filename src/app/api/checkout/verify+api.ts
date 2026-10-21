// Confirms with FastSpring that the buyer really completed the order before Kardza marks it paid.
import { findCompletedOrder } from '@/server/fastspring';

export async function POST(request: Request) {
  const { account, productId, since } = (await request.json()) as { account: string; productId: string; since: number };
  try {
    const orderId = await findCompletedOrder(account, productId, since);
    return Response.json({ ok: !!orderId, orderId });
  } catch (e) {
    return Response.json({ ok: false, error: String(e).slice(0, 200) }, { status: 502 });
  }
}
