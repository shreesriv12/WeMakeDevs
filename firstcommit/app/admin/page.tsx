"use client";

import {
  SignInPanel,
  useAuthSession
} from "@/components/auth-session";

export default function AdminPage() {
  const {
    idToken,
    role,
    loading
  } =
    useAuthSession();

  if (loading) {
    return (
      <main>
        <p>
          Checking sign-in session…
        </p>
      </main>
    );
  }

  if (!idToken) {
    return (
      <main>
        <section className="hero">
          <span className="eyebrow">
            SHIKSHAMESH ADMIN
          </span>

          <h1>
            Administrator sign-in required.
          </h1>
        </section>

        <SignInPanel />
      </main>
    );
  }

  if (role !== "admin") {
    return (
      <main>
        <section className="hero">
          <span className="eyebrow">
            ACCESS DENIED
          </span>

          <h1>
            Administrator access required.
          </h1>

          <p>
            Your current role is{" "}
            <b>{role}</b>.
          </p>

          <a
            href={
              role ===
              "teacher"
                ? "/teacher"
                : "/"
            }
          >
            Return to your dashboard
          </a>
        </section>

        <SignInPanel />
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <span className="eyebrow">
          SHIKSHAMESH ADMIN
        </span>

        <h1>
          Administration dashboard
        </h1>

        <p>
          Manage ShikshaMesh institution
          workflows and teacher operations.
        </p>

        <a href="/teacher">
          Open teacher operations →
        </a>
      </section>

      <SignInPanel />

      <section className="result">
        <span className="eyebrow">
          ADMINISTRATOR
        </span>

        <h2>
          Role verified by Cognito
        </h2>

        <p>
          Your ID token contains the
          administrator Cognito group.
        </p>
      </section>
    </main>
  );
}