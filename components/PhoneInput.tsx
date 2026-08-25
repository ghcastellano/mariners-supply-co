"use client";

import { useEffect, useState } from "react";
import { COUNTRIES, buildPhone, detectCountry, dialOf } from "@/lib/countries";

/**
 * WhatsApp com seletor de país. O país é adivinhado pela língua ou pelo
 * fuso do aparelho — o tripulante filipino já abre em +63 sem tocar em
 * nada. O <select> nativo é de propósito: no celular vira a roda do
 * sistema, que é mais rápida que qualquer combobox custom.
 */
export default function PhoneInput({
  value,
  onChange,
  required,
  label = "WhatsApp",
  hint,
}: {
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
  /** A espec chama este campo de "Telephone number"; a operação chama de WhatsApp. */
  label?: string;
  hint?: string;
}) {
  const [country, setCountry] = useState("BR");
  const [local, setLocal] = useState("");
  const [touched, setTouched] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    // Num formulário de EDIÇÃO o campo precisa nascer com o número
    // salvo. Sem isto o componente montava vazio e disparava
    // onChange("") — quem entrasse só para trocar o porto apagaria o
    // telefone sem perceber. Semeia uma vez: depois disso quem manda é
    // o que a pessoa está digitando.
    if (seeded) return;
    const e164 = (value ?? "").trim();
    if (e164.startsWith("+")) {
      const match = [...COUNTRIES]
        .filter((c) => e164.startsWith(c.dial))
        .sort((a, b) => b.dial.length - a.dial.length)[0];
      if (match) {
        setCountry(match.code);
        setLocal(e164.slice(match.dial.length));
        setSeeded(true);
        return;
      }
    }
    setCountry(detectCountry());
    setSeeded(true);
  }, [value, seeded]);

  useEffect(() => {
    if (!seeded) return; // não avisa o pai antes de terminar de semear
    onChange(buildPhone(country, local) ?? "");
    // onChange muda a cada render do pai; depender dele reentraria em laço
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, local, seeded]);

  const valid = Boolean(buildPhone(country, local));
  const showError = required && touched && local.length > 0 && !valid;

  return (
    <div className="field">
      <label htmlFor="wa">
        {label} {required ? "" : "(optional)"}
      </label>
      <div className="phone-row">
        <select
          className="phone-country"
          aria-label="Country code"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code + c.dial} value={c.code}>
              {c.flag} {c.code} {c.dial}
            </option>
          ))}
        </select>
        <div className="phone-number">
          <span className="phone-dial">{dialOf(country)}</span>
          <input
            id="wa"
            inputMode="tel"
            autoComplete="tel-national"
            required={required}
            value={local}
            onBlur={() => setTouched(true)}
            onChange={(e) => setLocal(e.target.value.replace(/[^\d\s-]/g, ""))}
            placeholder="912 345 678"
          />
        </div>
      </div>
      {showError ? (
        <p className="finehint" style={{ color: "var(--danger)" }}>
          That number looks too short — include the area code, without the leading 0.
        </p>
      ) : (
        <p className="finehint">
          {hint ??
            (required
              ? "How we reach you if you're not at the gangway — the only channel that works from a ship."
              : "Optional, but it's how we reach you at the gangway.")}
        </p>
      )}
      <input type="hidden" name="contact_whatsapp" value={value} />
    </div>
  );
}
