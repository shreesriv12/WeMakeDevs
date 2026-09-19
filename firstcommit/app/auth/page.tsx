"use client";

import Link from "next/link";
import { SignInPanel, useAuthSession } from "@/components/auth-session";

export default function AuthPage() {
  const { idToken, loading, role } = useAuthSession();

  if (loading) return <main><p>Checking sign-in session…</p></main>;

  if (idToken) {
    const dashboard = role === "teacher" || role === "admin" ? "/teacher" : "/";
    return <main className="auth-page"><section className="auth-intro"><span className="eyebrow">YOU’RE ALREADY SIGNED IN</span><h1>Welcome back.</h1><p>Your ShikshaMesh learning workspace is ready.</p><Link className="primary-link" href={dashboard}>Open dashboard</Link></section></main>;
  }

  return <main className="auth-page"><section className="auth-intro"><Link className="brand-return" href="/">← ShikshaMesh</Link><span className="eyebrow">LEARNING, CONNECTED</span><h1>Learn from your notes. Together.</h1><p>Sign in to access your course-aware tutor, quizzes, interview practice, collaborative canvas, and live classes.</p></section><SignInPanel /></main>;
}
