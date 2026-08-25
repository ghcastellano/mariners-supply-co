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
}: {
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
}) {
  const [country, setCountry] = useState("BR");
  const [local, setLocal] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setCountry(detectCountry());
  }, []);

  useEffect(() => {
    onChange(buildPhone(country, local) ?? "");
    // onChange muda a cada render do pai; depender dele reentraria em laço
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, local]);

  const valid = Boolean(buildPhone(country, local));
  const showError = required && touched && local.length > 0 && !valid;

  return (
    <div className="field">
      <label htmlFor="wa">
        WhatsApp {required ? "" : "(optional)"}
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
          {required
            ? "How we reach you if you're not at the gangway — the only channel that works from a ship."
            : "Optional, but it's how we reach you at the gangway."}
        </p>
      )}
      <input type="hidden" name="contact_whatsapp" value={value} />
    </div>
  );
}
