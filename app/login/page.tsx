"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import GoogleButton from "@/components/GoogleButton";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/format";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const urlError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      if (/not confirmed/i.test(error.message)) {
        setNeedsConfirm(true);
        setErr("Your email isn't confirmed yet — open the link we sent you, or resend it below.");
      } else if (/invalid/i.test(error.message)) {
        setErr("Wrong email or password. Forgot it? Reset below.");
      } else {
        setErr(error.message);
      }
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function resendConfirmation() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setErr(null);
      setInfo(`Confirmation email resent to ${email} — check spam/junk too.`);
    }
  }

  return (
    <>
      <TopBar title="Crew access" backHref="/" chip={false} />
      <main>
        <div className="hero-mini">
          <p className="kicker">Sign in</p>
          <h2>Welcome back, sailor.</h2>
          <p>Your orders and gangway windows, in one place.</p>
        </div>
        <div className="stack">
          {urlError && <p className="alert">{urlError}</p>}
          <GoogleButton next={next} />
          <div className="divider">or with email</div>
          <form onSubmit={submit} className="stack" style={{ padding: 0 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ship.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {err && <p className="alert">{err}</p>}
            {info && <p className="note">{info}</p>}
            {needsConfirm && (
              <button type="button" className="btn ghost" onClick={resendConfirmation} disabled={busy || !email}>
                Resend confirmation email
              </button>
            )}
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="linkline">
            <Link href={`/forgot-password?next=${encodeURIComponent(next)}`}>Forgot password?</Link>
          </p>
          <p className="linkline">
            First call at Santos?{" "}
            <Link href={`/signup?next=${encodeURIComponent(next)}`}>Create your account</Link>
          </p>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spin" />}>
      <LoginInner />
    </Suspense>
  );
}
