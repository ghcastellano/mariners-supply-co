"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/TopBar";
import GoogleButton from "@/components/GoogleButton";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/format";

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setErr("Password needs at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    if (data.session) {
      // confirmação de email desligada no projeto — entra direto
      router.push(next);
      router.refresh();
      return;
    }
    setSent(true);
  }

  return (
    <>
      <TopBar title="Create account" backHref="/login" chip={false} />
      <main>
        {sent ? (
          <>
            <div className="okwrap">
              <div className="okring">✉️</div>
              <h2>Confirm your email</h2>
              <p>
                We sent a confirmation link to <span className="mono">{email}</span>.
              </p>
            </div>
            <div className="stack" style={{ marginTop: 18 }}>
              <p className="note">
                Open the link on this phone to activate your account and keep your kit. No email in
                5 minutes? Check spam / junk — ship Wi-Fi can be slow.
              </p>
              <p className="linkline">
                Already confirmed? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="hero-mini">
              <p className="kicker">Crew account</p>
              <h2>Join the crew list.</h2>
              <p>One account for every call at Santos — orders, credit and gangway windows.</p>
            </div>
            <div className="stack">
              <GoogleButton next={next} />
              <div className="divider">or with email</div>
              <form onSubmit={submit} className="stack" style={{ padding: 0 }}>
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="As on your seaman's book"
                  />
                </div>
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
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="min. 6 characters"
                  />
                </div>
                {err && <p className="alert">{err}</p>}
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </button>
                <p className="finehint">
                  You&apos;ll get a confirmation email — open it to activate the account.
                </p>
              </form>
              <p className="linkline">
                Already aboard? <Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
              </p>
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="spin" />}>
      <SignupInner />
    </Suspense>
  );
}
