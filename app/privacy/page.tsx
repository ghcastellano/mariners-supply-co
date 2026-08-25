import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { CONTACT_EMAIL } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Mariners Supply collects, why customs requires it, who it is shared with — and what we never do with it.",
};

/**
 * Privacy nos mesmos blocos de texto da ficha (.pdp-block / .pdp-text
 * / .specs), pelo mesmo motivo do Terms: não crescer o CSS
 * compartilhado para renderizar parágrafo.
 *
 * A lista de dados é exatamente a que o cadastro grava em `profiles` —
 * política que enumera mais do que se coleta assusta à toa, e menos do
 * que se coleta é mentira. Se um campo entrar no cadastro, entra aqui.
 */
export default function PrivacyPage() {
  return (
    <main>
      <Breadcrumb trail={[{ label: "Privacy Policy" }]} />

      <p className="draftnote">
        <b>Operational draft.</b> This describes what we do with your data
        today, written by the people who run the store. It has not been reviewed
        by a lawyer yet and does not stand as a formal privacy notice.
      </p>

      <h1 className="pagettl">Privacy Policy</h1>
      <p className="pagelead">
        Short version: we collect what customs and the delivery require, and
        nothing else. We do not sell your data.
      </p>

      <section className="pdp-block">
        <h3>Who holds your data</h3>
        <p className="pdp-text">
          Mariners Supply, the online store of Mariner&apos;s Bar, at Porto de
          Santos, Brazil. Questions and requests go to{" "}
          <a className="alink" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="pdp-block">
        <h3>What we collect, and why</h3>
        <ul className="specs">
          <li>
            <b>Full name, rank, vessel (name, IMO, flag) and nationality</b> —
            required on the duty-free declaration we file with Brazilian customs
            for goods delivered on board. Without them the delivery cannot
            legally happen.
          </li>
          <li>
            <b>E-mail and WhatsApp number</b> — to confirm the order, tell you
            the delivery day and reach you if the window moves. Not used for
            marketing blasts.
          </li>
          <li>
            <b>Order history and store credit</b> — so a deposit from a
            cancelled call is still yours on the next one.
          </li>
          <li>
            <b>Referral code</b>, if you joined through one, so the credit lands
            on the right account.
          </li>
        </ul>
      </section>

      <section className="pdp-block">
        <h3>Payment data</h3>
        <p className="pdp-text">
          Card payments run through Stripe. Your card number never reaches our
          servers and we do not store it — we only see that a payment
          succeeded, and for how much.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Who else sees it</h3>
        <ul className="specs">
          <li>
            <b>Brazilian customs and the port authority</b> — the declaration:
            your name, rank, vessel and what is in the order.
          </li>
          <li>
            <b>The accredited ship chandler</b> doing the gangway delivery —
            your name, vessel and the goods, so they can find you.
          </li>
          <li>
            <b>Our payment, e-mail and hosting providers</b>, strictly to run
            the store.
          </li>
        </ul>
        <p className="pdp-text" style={{ marginTop: 10 }}>
          That is the whole list. We do not sell, rent or trade your data, and
          we do not hand it to advertisers.
        </p>
      </section>

      <section className="pdp-block">
        <h3>How long we keep it</h3>
        <p className="pdp-text">
          Customs and tax records are kept for as long as Brazilian law requires
          us to keep them — we cannot delete those on request. Everything else
          lives as long as your account does.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Cookies</h3>
        <p className="pdp-text">
          Only what the store needs: a session cookie so you stay signed in, and
          your cart. No advertising or cross-site tracking cookies.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Your rights</h3>
        <p className="pdp-text">
          Ask us for a copy of your data, a correction, or deletion of your
          account, and we will do it — subject to the customs records above.
          Write to{" "}
          <a className="alink" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          from the address on your account. How this maps onto the Brazilian
          LGPD in formal terms is part of the pending legal review.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Related</h3>
        <p className="pdp-text">
          <Link className="alink" href="/terms">
            Terms &amp; Conditions
          </Link>{" "}
          ·{" "}
          <Link className="alink" href="/faq">
            FAQ
          </Link>
        </p>
      </section>
    </main>
  );
}
