/**
 * Transporte SMTP dos e-mails transacionais.
 *
 * Usa o mesmo servidor que já autentica os e-mails de conta
 * (Hostinger, ahoy@marinerssupplyco.com), então SPF/DKIM do domínio
 * valem para tudo que sai daqui — nada de remetente emprestado que
 * cai em spam de tripulação.
 *
 * Sem SMTP configurado o app não quebra: emailConfigured fica false
 * e o disparo vira no-op silencioso. O pedido continua andando; o
 * e-mail é acessório do fluxo, não pré-requisito.
 */

import nodemailer, { type Transporter } from "nodemailer";
import { SITE_URL, CONTACT_EMAIL } from "./env.ts";
import { buildOrderEmail, type OrderEmailData } from "./emails.ts";

const HOST = process.env.SMTP_HOST;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const PORT = Number(process.env.SMTP_PORT ?? 465);
const FROM = process.env.SMTP_FROM ?? `Mariners Supply <${CONTACT_EMAIL}>`;

export const emailConfigured = Boolean(HOST && USER && PASS);

let cached: Transporter | null = null;

/** Devolve null quando falta configuração — o chamador decide o que fazer. */
function transport(): Transporter | null {
  if (cached) return cached;
  if (!HOST || !USER || !PASS) return null;

  cached = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 = TLS implícito; 587 = STARTTLS
    auth: { user: USER, pass: PASS },
    // Apertado de propósito: o webhook do Stripe precisa responder em
    // menos de 10s ou o evento conta como falho. Estourar aqui devolve
    // a reivindicação e o Stripe reentrega — sem e-mail perdido e sem
    // webhook vermelho.
    connectionTimeout: 5000,
    greetingTimeout: 4000,
    socketTimeout: 8000,
  });
  return cached;
}

export type SendResult = { sent: boolean; skipped?: string; error?: string };

export async function sendMail(msg: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const smtp = transport();
  if (!smtp) return { sent: false, skipped: "smtp_not_configured" };
  if (!msg.to || !msg.to.includes("@")) return { sent: false, skipped: "no_recipient" };
  try {
    await smtp.sendMail({
      from: FROM,
      to: msg.to,
      replyTo: CONTACT_EMAIL,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    return { sent: true };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

/**
 * Reivindica o envio no banco, monta e manda. Se o SMTP falhar,
 * devolve a reivindicação para que a próxima tentativa (retry do
 * Stripe, ou o admin clicando de novo) possa reenviar.
 *
 * O `rpc` entra por parâmetro porque quem chama tem um cliente
 * Supabase diferente: o webhook usa anon+segredo, o painel usa a
 * sessão do admin.
 */
export async function sendOrderEmail(
  rpc: {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  orderId: string,
  kind: OrderEmailData["kind"],
  secret?: string
): Promise<SendResult> {
  const args = { p_order: orderId, p_kind: kind, ...(secret ? { p_secret: secret } : {}) };

  const { data, error } = await rpc.rpc("claim_order_email", args);
  if (error) return { sent: false, error: "claim_failed" };

  const claim = data as (OrderEmailData & { claimed?: boolean; reason?: string }) | null;
  if (!claim?.claimed) return { sent: false, skipped: claim?.reason ?? "not_claimed" };

  const built = buildOrderEmail({ ...claim, kind }, SITE_URL);
  const result = await sendMail({
    to: claim.to_email,
    subject: built.subject,
    html: built.html,
    text: built.text,
  });

  if (!result.sent) {
    await rpc.rpc("release_order_email", args);
  }

  // E-mail que falha calado é o pior modo de falha aqui: o pedido
  // segue certo e ninguém descobre que o marinheiro nunca soube.
  // O log vai para o runtime da Vercel — sem endereço, que é dado
  // do cliente e não tem por que ficar em log.
  console.log(
    JSON.stringify({
      at: "order_email",
      kind,
      order: orderId,
      sent: result.sent,
      ...(result.skipped ? { skipped: result.skipped } : {}),
      ...(result.error ? { error: result.error } : {}),
    })
  );

  return result;
}
