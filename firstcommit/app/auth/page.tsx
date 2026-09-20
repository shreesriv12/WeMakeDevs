"use client";

import Link from "next/link";
import { SignInPanel, useAuthSession } from "@/components/auth-session";
import styles from "./auth-page.module.css";

export default function AuthPage() {
  const { idToken, loading, role } = useAuthSession();

  if (loading) {
    return <main className={styles.page}><div className={styles.signedIn}><p>Checking sign-in session…</p></div></main>;
  }

  if (idToken) {
    const dashboard = role === "teacher" || role === "admin" ? "/teacher" : "/";
    return (
      <main className={styles.page}>
        <section className={styles.signedIn}>
          <div>
            <span className={styles.kicker}>YOU’RE ALREADY SIGNED IN</span>
            <h1>Welcome back.</h1>
            <p>Your ShikshaMesh learning workspace is ready.</p>
            <Link className="primary-link" href={dashboard}>Open dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <Link className={styles.brand} href="/">← ShikshaMesh</Link>

        <span className={styles.kicker}>LEARNING, CONNECTED</span>
        <h1 className={styles.title}>Learn from<br />your notes.<br />Together.</h1>
        <p className={styles.copy}>
          Your course material becomes a focused learning space — grounded tutoring,
          active practice and collaborative study in one place.
        </p>

        <div className={styles.features} aria-label="ShikshaMesh highlights">
          <div className={styles.feature}>
            <div className={styles.icon} aria-hidden="true">▤</div>
            <div><strong>Course-grounded AI</strong><span>Answers from your own approved materials</span></div>
          </div>
          <div className={styles.feature}>
            <div className={styles.icon} aria-hidden="true">◎</div>
            <div><strong>Learn together</strong><span>Join live classes and collaborative study rooms</span></div>
          </div>
          <div className={styles.feature}>
            <div className={styles.icon} aria-hidden="true">↗</div>
            <div><strong>Practise actively</strong><span>Quizzes, AI interviews, canvas and learning tools</span></div>
          </div>
        </div>

        <div className={styles.quote}>“A learning space built around what you’re actually studying.”</div>
      </section>

      <section className={styles.panelArea} aria-label="Account access">
        <SignInPanel />
      </section>
    </main>
  );
}
