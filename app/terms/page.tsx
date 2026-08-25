import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "@/components/Breadcrumb";
import { CONTACT_EMAIL } from "@/lib/env";
import { DEPOSIT_PCT } from "@/lib/money";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "How an order with Mariners Supply works — deposit, balance at the gangway, credit for a diverted call.",
};

/**
 * Terms na estrutura de blocos de texto que a ficha de produto já usa
 * (.pdp-block / .pdp-text / .specs): reaproveitar as classes existentes
 * evita crescer o CSS compartilhado só para renderizar parágrafo.
 *
 * O aviso de rascunho fica ANTES do título, não no rodapé da página:
 * um termo que ainda não passou por advogado não pode ser lido como
 * contrato fechado, e quem rola até o fim já leu tudo.
 *
 * Texto escrito do zero para a operação de Santos — nada copiado de
 * concorrente. Copiar termo alheio é herdar obrigação que não é nossa.
 */
export default function TermsPage() {
  return (
    <main>
      <Breadcrumb trail={[{ label: "Terms & Conditions" }]} />

      <p className="draftnote">
        <b>Operational draft.</b> This text describes how we actually work
        today, in plain language. It has not been reviewed by a lawyer yet and
        does not stand as a contract. If something here matters to a decision
        you are making, write to us first.
      </p>

      <h1 className="pagettl">Terms &amp; Conditions</h1>
      <p className="pagelead">Last reviewed by the crew, not by counsel.</p>

      <section className="pdp-block">
        <h3>Who we are</h3>
        <p className="pdp-text">
          Mariners Supply is the online store of Mariner&apos;s Bar, at Porto de
          Santos, Brazil. Orders are placed here and handled by the same people
          who run the counter — there is no third-party marketplace between us
          and you.
        </p>
      </section>

      <section className="pdp-block">
        <h3>What we sell, and to whom</h3>
        <p className="pdp-text">
          Provisions, personal care, electronics, connectivity (eSIM and
          top-ups), tobacco and general ship&apos;s stores, sold to seafarers on
          vessels calling at Santos and to anyone collecting at our counter.
          Goods delivered on board go out duty-free and are declared to
          Brazilian customs; that declaration is why an account with your real
          name, rank, vessel and nationality is required before you can order.
        </p>
      </section>

      <section className="pdp-block">
        <h3>How an order works</h3>
        <ul className="specs">
          <li>
            You pay a {DEPOSIT_PCT}% deposit when you place the order. That is
            what reserves the stock and pays for the chandler&apos;s delivery
            slot.
          </li>
          <li>
            The remaining {100 - DEPOSIT_PCT}% is paid at the gangway, when you
            check the goods and sign for them.
          </li>
          <li>
            Prices are in US dollars. Any R$ figure shown is a reference at the
            current rate — it is not the amount charged.
          </li>
          <li>
            The delivery day comes from the port grid on{" "}
            <Link className="alink" href="/ports">
              Ports &amp; delivery schedule
            </Link>
            , not from your vessel&apos;s ETA.
          </li>
        </ul>
      </section>

      <section className="pdp-block">
        <h3>If your vessel skips Santos</h3>
        <p className="pdp-text">
          The deposit becomes store credit for the full amount, held on your
          account and usable on a later call. Nothing is forfeited and you do
          not have to justify the diversion — schedules change, that is the
          trade. If you would rather have the money back than the credit, write
          to us and we sort it out case by case.
        </p>
      </section>

      <section className="pdp-block">
        <h3>What we cannot promise</h3>
        <ul className="specs">
          <li>
            On-board delivery depends on an accredited ship chandler and on the
            terminal allowing access on the day. We do not control either.
          </li>
          <li>
            If your vessel stays alongside for less than the minimum on the port
            grid, the delivery may not be possible — the order then becomes
            credit or moves to counter pickup.
          </li>
          <li>
            If an item is out of stock when we pack, we remove it and the amount
            returns to your credit. We do not substitute products without
            asking.
          </li>
        </ul>
      </section>

      <section className="pdp-block">
        <h3>Cancellations and returns</h3>
        <p className="pdp-text">
          Cancel any time before the goods leave our counter and the deposit
          stays as credit. After delivery, we take back anything that arrived
          damaged, wrong or short — tell us at the gangway or the same day.
          Sealed personal-care items, food and digital codes already issued
          cannot be returned once handed over or redeemed.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Where disputes are settled</h3>
        <p className="pdp-text">
          We operate under Brazilian law, in Santos, São Paulo. The precise
          wording of this clause is one of the things pending legal review.
        </p>
      </section>

      <section className="pdp-block">
        <h3>Contact</h3>
        <p className="pdp-text">
          <a className="alink" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          · Mariner&apos;s Bar, Porto de Santos, Brazil. See also the{" "}
          <Link className="alink" href="/faq">
            FAQ
          </Link>{" "}
          and our{" "}
          <Link className="alink" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
