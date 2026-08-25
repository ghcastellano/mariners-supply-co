import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../../../lib/env.ts";

// Webhook do Stripe: confirma o depósito quando o pagamento aprova.
// A assinatura do evento é verificada com o signing secret; o mesmo
// segredo autoriza a função confirm_stripe_deposit no banco (que por
// sua vez dispara o crédito Captain do padrinho, se houver).
export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !signingSecret) {
    // 503 DE PROPÓSITO — o oposto do cron. Aqui devolver 200 faria o
    // Stripe marcar o evento como entregue e a confirmação de pagamento
    // se perderia para sempre: o cliente pagaria e o pedido ficaria
    // "aguardando depósito". Com 5xx o Stripe reentrega por até 3 dias,
    // dando tempo de corrigir a configuração sem perder dinheiro.
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "missing signature" }, { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = new Stripe(secretKey).webhooks.constructEvent(body, signature, signingSecret);
  } catch {
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  // completed cobre cartão/wallet; async_payment_succeeded cobre PIX
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id ?? session.client_reference_id;

    if (orderId && session.payment_status === "paid") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { error } = await supabase.rpc("confirm_stripe_deposit", {
        p_order: orderId,
        p_secret: signingSecret,
      });
      if (error) {
        // 500 faz o Stripe reentregar o evento
        return Response.json({ error: "db update failed" }, { status: 500 });
      }
    }
  }

  return Response.json({ received: true });
}
