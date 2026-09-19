"use client";
import { FormEvent, useState } from "react";
import { SignInPanel, useAuthSession } from "@/components/auth-session";
import { MasteryConsent } from "@/components/mastery-consent";
export default function AccountPage() {
  const { idToken, loading, changePassword } = useAuthSession(); const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState(""); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setMessage(""); if (next !== confirm) return setError("New passwords do not match"); try { await changePassword(current, next); setCurrent(""); setNext(""); setConfirm(""); setMessage("Password changed successfully."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not change password"); } }
  if (loading) return <main><p>Checking sign-in session…</p></main>;
  if (!idToken) return <main><section className="hero"><span className="eyebrow">ACCOUNT</span><h1>Sign in to manage your account.</h1></section><SignInPanel /></main>;
  return <main><section className="hero"><span className="eyebrow">ACCOUNT</span><h1>Your ShikshaMesh account</h1><a href="/">Student experience</a></section><SignInPanel /><form className="composer teacher-form" onSubmit={submit}><h2>Change password</h2><label htmlFor="current-password">Current password</label><input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} required /><label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(event) => setNext(event.target.value)} required /><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} required /><button>Change password</button>{message && <p>{message}</p>}{error && <p className="error">{error}</p>}</form><MasteryConsent /></main>;
}
