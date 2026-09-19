"use client";

import {
  ChangePasswordCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand
} from "@aws-sdk/client-cognito-identity-provider";

import {
  FormEvent,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import styles from "./auth-session.module.css";

export type AuthRole =
  | "student"
  | "teacher"
  | "admin";

type AuthContextValue = {
  idToken:
    | string
    | null;

  role:
    AuthRole;

  loading:
    boolean;

  apiFetch: (
    input:
      | RequestInfo
      | URL,
    init?: RequestInit
  ) => Promise<Response>;

  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;

  signOut:
    () => void;
};

type Mode =
  | "sign-in"
  | "sign-up"
  | "confirm"
  | "forgot"
  | "reset";

type SignupRole =
  | "student"
  | "teacher"
  | "admin";

const AuthContext =
  createContext<
    | AuthContextValue
    | undefined
  >(undefined);

const idTokenKey =
  "shikshamesh.cognito.id-token";

const accessTokenKey =
  "shikshamesh.cognito.access-token";

const pendingSignupKey =
  "shikshamesh.pending-signup";

function roleFromToken(
  token: string | null
): AuthRole {
  if (!token) {
    return "student";
  }

  try {
    const encodedPayload =
      token
        .split(".")[1]
        .replaceAll(
          "-",
          "+"
        )
        .replaceAll(
          "_",
          "/"
        );

    const payload =
      JSON.parse(
        atob(
          encodedPayload.padEnd(
            Math.ceil(
              encodedPayload.length /
                4
            ) * 4,
            "="
          )
        )
      ) as Record<
        string,
        unknown
      >;

    const groups =
      Array.isArray(
        payload[
          "cognito:groups"
        ]
      )
        ? (
            payload[
              "cognito:groups"
            ] as unknown[]
          )
        : [];

    if (
      groups.includes(
        "admin"
      )
    ) {
      return "admin";
    }

    if (
      groups.includes(
        "teacher"
      )
    ) {
      return "teacher";
    }

    return "student";
  } catch {
    return "student";
  }
}

function homeForRole(
  role: AuthRole
) {
  if (
    role === "admin"
  ) {
    return "/admin";
  }

  if (
    role === "teacher"
  ) {
    return "/teacher";
  }

  return "/";
}

function configuration() {
  const region =
    process.env
      .NEXT_PUBLIC_AWS_REGION;

  const clientId =
    process.env
      .NEXT_PUBLIC_COGNITO_APP_CLIENT_ID;

  if (
    !region ||
    !clientId
  ) {
    throw new Error(
      "Cognito browser configuration is unavailable"
    );
  }

  return {
    region,
    clientId
  };
}

function cognito() {
  return new CognitoIdentityProviderClient(
    {
      region:
        configuration()
          .region
    }
  );
}

export function AuthSessionProvider({
  children
}: {
  children:
    ReactNode;
}) {
  const [
    idToken,
    setIdToken
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading
  ] =
    useState(true);

  useEffect(
    () => {
      setIdToken(
        sessionStorage.getItem(
          idTokenKey
        )
      );

      setLoading(false);
    },
    []
  );

  const value =
    useMemo<AuthContextValue>(
      () => ({
        idToken,

        role:
          roleFromToken(
            idToken
          ),

        loading,

        apiFetch: (
          input,
          init = {}
        ) =>
          fetch(
            input,
            {
              ...init,

              headers: {
                ...init.headers,

                ...(idToken
                  ? {
                      authorization:
                        `Bearer ${idToken}`
                    }
                  : {})
              }
            }
          ),

        changePassword:
          async (
            previousPassword,
            proposedPassword
          ) => {
            const accessToken =
              sessionStorage.getItem(
                accessTokenKey
              );

            if (
              !accessToken
            ) {
              throw new Error(
                "Please sign out and sign in again before changing your password"
              );
            }

            await cognito().send(
              new ChangePasswordCommand(
                {
                  AccessToken:
                    accessToken,

                  PreviousPassword:
                    previousPassword,

                  ProposedPassword:
                    proposedPassword
                }
              )
            );
          },

        signOut:
          () => {
            sessionStorage.removeItem(
              idTokenKey
            );

            sessionStorage.removeItem(
              accessTokenKey
            );

            sessionStorage.removeItem(
              pendingSignupKey
            );

            setIdToken(
              null
            );

            window.location.assign(
              "/"
            );
          }
      }),
      [
        idToken,
        loading
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  const value =
    useContext(
      AuthContext
    );

  if (!value) {
    throw new Error(
      "useAuthSession must be used inside AuthSessionProvider"
    );
  }

  return value;
}

export function SignInPanel() {
  const {
    idToken,
    role,
    loading,
    signOut
  } =
    useAuthSession();

  const [
    mode,
    setMode
  ] =
    useState<Mode>(
      "sign-in"
    );

  const [
    username,
    setUsername
  ] =
    useState("");

  const [
    email,
    setEmail
  ] =
    useState("");

  const [
    name,
    setName
  ] =
    useState("");

  const [
    password,
    setPassword
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] =
    useState("");

  const [
    code,
    setCode
  ] =
    useState("");

  const [
    signupRole,
    setSignupRole
  ] =
    useState<SignupRole>(
      "student"
    );

  const [
    roleAccessCode,
    setRoleAccessCode
  ] =
    useState("");

  const [
    roleGrant,
    setRoleGrant
  ] =
    useState("");

  const [
    error,
    setError
  ] =
    useState("");

  const [
    notice,
    setNotice
  ] =
    useState("");

  const [
    submitting,
    setSubmitting
  ] =
    useState(false);

  useEffect(
    () => {
      try {
        const stored =
          sessionStorage.getItem(
            pendingSignupKey
          );

        if (!stored) {
          return;
        }

        const pending =
          JSON.parse(
            stored
          ) as {
            username?: string;
            roleGrant?: string;
          };

        if (
          pending.username &&
          pending.roleGrant
        ) {
          setUsername(
            pending.username
          );

          setEmail(
            pending.username
          );

          setRoleGrant(
            pending.roleGrant
          );

          setMode(
            "confirm"
          );
        }
      } catch {
        sessionStorage.removeItem(
          pendingSignupKey
        );
      }
    },
    []
  );

  const clear =
    () => {
      setError("");
      setNotice("");
    };

  const choose =
    (
      next: Mode
    ) => {
      clear();
      setMode(next);
    };

  async function authenticateWithPassword(
    usernameValue: string,
    passwordValue: string
  ) {
    const {
      clientId
    } =
      configuration();

    const result =
      await cognito().send(
        new InitiateAuthCommand(
          {
            AuthFlow:
              "USER_PASSWORD_AUTH",

            ClientId:
              clientId,

            AuthParameters: {
              USERNAME:
                usernameValue,

              PASSWORD:
                passwordValue
            }
          }
        )
      );

    const id =
      result
        .AuthenticationResult
        ?.IdToken;

    const access =
      result
        .AuthenticationResult
        ?.AccessToken;

    if (
      !id ||
      !access
    ) {
      throw new Error(
        "Sign-in needs account confirmation or a password update."
      );
    }

    sessionStorage.setItem(
      idTokenKey,
      id
    );

    sessionStorage.setItem(
      accessTokenKey,
      access
    );

    sessionStorage.removeItem(
      pendingSignupKey
    );

    const signedInRole =
      roleFromToken(id);

    window.location.assign(
      homeForRole(
        signedInRole
      )
    );
  }

  async function signIn(
    event:
      FormEvent
  ) {
    event.preventDefault();

    clear();

    setSubmitting(true);

    try {
      await authenticateWithPassword(
        username
          .trim()
          .toLowerCase(),

        password
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Sign-in failed"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function signUp(
    event:
      FormEvent
  ) {
    event.preventDefault();

    clear();

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match"
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/auth/signup",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  name,

                  email,

                  password,

                  role:
                    signupRole,

                  accessCode:
                    roleAccessCode ||
                    undefined
                }
              )
          }
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not create account"
        );
      }

      setUsername(
        body.username
      );

      setEmail(
        body.username
      );

      setRoleGrant(
        body.roleGrant
      );

      sessionStorage.setItem(
        pendingSignupKey,
        JSON.stringify(
          {
            username:
              body.username,

            roleGrant:
              body.roleGrant
          }
        )
      );

      setCode("");

      setNotice(
        "Account created. Check your email for the confirmation code."
      );

      setMode(
        "confirm"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create account"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmAccount(
    event:
      FormEvent
  ) {
    event.preventDefault();

    clear();

    if (!roleGrant) {
      setError(
        "Signup session expired. Please create the account again."
      );

      return;
    }

    if (!password) {
      setError(
        "Enter your password so you can be signed in automatically after verification."
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/auth/confirm",
          {
            method:
              "POST",

            headers: {
              "content-type":
                "application/json"
            },

            body:
              JSON.stringify(
                {
                  username:
                    username
                      .trim()
                      .toLowerCase(),

                  code,

                  roleGrant
                }
              )
          }
        );

      const body =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          body.error ??
            "Could not confirm account"
        );
      }

      /*
       * Group assignment is complete,
       * so obtain a fresh Cognito token.
       * cognito:groups will now contain
       * the verified role.
       */
      await authenticateWithPassword(
        username
          .trim()
          .toLowerCase(),

        password
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm account"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function resend() {
    clear();

    setSubmitting(true);

    try {
      const {
        clientId
      } =
        configuration();

      await cognito().send(
        new ResendConfirmationCodeCommand(
          {
            ClientId:
              clientId,

            Username:
              username
                .trim()
                .toLowerCase()
          }
        )
      );

      setNotice(
        "A new confirmation code was sent."
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not resend confirmation code"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function forgot(
    event:
      FormEvent
  ) {
    event.preventDefault();

    clear();

    setSubmitting(true);

    try {
      const {
        clientId
      } =
        configuration();

      await cognito().send(
        new ForgotPasswordCommand(
          {
            ClientId:
              clientId,

            Username:
              username
                .trim()
                .toLowerCase()
          }
        )
      );

      setNotice(
        "Cognito sent a reset code to your verified contact."
      );

      setMode(
        "reset"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start recovery"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function reset(
    event:
      FormEvent
  ) {
    event.preventDefault();

    clear();

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match"
      );

      return;
    }

    setSubmitting(true);

    try {
      const {
        clientId
      } =
        configuration();

      await cognito().send(
        new ConfirmForgotPasswordCommand(
          {
            ClientId:
              clientId,

            Username:
              username
                .trim()
                .toLowerCase(),

            ConfirmationCode:
              code,

            Password:
              password
          }
        )
      );

      setConfirmPassword("");
      setCode("");

      setNotice(
        "Password reset. You can sign in now."
      );

      setMode(
        "sign-in"
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reset password"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p>
        Checking sign-in session…
      </p>
    );
  }

  if (idToken) {
    return (
      <div className="session">
        <span>
          Signed in as{" "}
          <b>{role}</b>
        </span>

        <a
          href={homeForRole(
            role
          )}
        >
          Dashboard
        </a>

        <a href="/account">
          Account
        </a>

        <button
          onClick={
            signOut
          }
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <section
      className={`${styles.root} composer sign-in`}
    >
      <span className="eyebrow">
        SHIKSHAMESH ACCESS
      </span>

      <h2>
        {mode ===
        "sign-up"
          ? "Create your account"
          : mode ===
              "confirm"
            ? "Confirm your email"
            : mode ===
                  "forgot" ||
                mode ===
                  "reset"
              ? "Recover your account"
              : "Welcome back"}
      </h2>

      {(
        mode ===
          "sign-in" ||
        mode ===
          "sign-up"
      ) && (
        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode ===
              "sign-in"
                ? "active"
                : "secondary"
            }
            onClick={() =>
              choose(
                "sign-in"
              )
            }
          >
            Sign in
          </button>

          <button
            type="button"
            className={
              mode ===
              "sign-up"
                ? "active"
                : "secondary"
            }
            onClick={() =>
              choose(
                "sign-up"
              )
            }
          >
            Create account
          </button>
        </div>
      )}

      {mode ===
        "sign-in" && (
        <form
          onSubmit={
            signIn
          }
        >
          <label htmlFor="username">
            Email
          </label>

          <input
            id="username"
            type="email"
            autoComplete="username"
            value={
              username
            }
            onChange={(
              event
            ) =>
              setUsername(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <button
            disabled={
              submitting
            }
          >
            {submitting
              ? "Signing in…"
              : "Sign in"}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() =>
              choose(
                "forgot"
              )
            }
          >
            Forgot password?
          </button>
        </form>
      )}

      {mode ===
        "sign-up" && (
        <form
          onSubmit={
            signUp
          }
        >
          <label htmlFor="signup-name">
            Full name
          </label>

          <input
            id="signup-name"
            autoComplete="name"
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="signup-email">
            Email
          </label>

          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={
              email
            }
            onChange={(
              event
            ) =>
              setEmail(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="signup-role">
            Account role
          </label>

          <select
            id="signup-role"
            value={
              signupRole
            }
            onChange={(
              event
            ) => {
              setSignupRole(
                event
                  .target
                  .value as SignupRole
              );

              setRoleAccessCode(
                ""
              );
            }}
          >
            <option value="student">
              Student
            </option>

            <option value="teacher">
              Teacher
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          {signupRole !==
            "student" && (
            <>
              <label htmlFor="role-code">
                {signupRole ===
                "teacher"
                  ? "Teacher access code"
                  : "Admin access code"}
              </label>

              <input
                id="role-code"
                type="password"
                autoComplete="off"
                value={
                  roleAccessCode
                }
                onChange={(
                  event
                ) =>
                  setRoleAccessCode(
                    event
                      .target
                      .value
                  )
                }
                required
              />
            </>
          )}

          <label htmlFor="signup-password">
            Password
          </label>

          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="signup-confirm">
            Confirm password
          </label>

          <input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={
              confirmPassword
            }
            onChange={(
              event
            ) =>
              setConfirmPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <button
            disabled={
              submitting
            }
          >
            {submitting
              ? "Creating account…"
              : `Create ${signupRole} account`}
          </button>
        </form>
      )}

      {mode ===
        "confirm" && (
        <form
          onSubmit={
            confirmAccount
          }
        >
          <label htmlFor="confirm-username">
            Email
          </label>

          <input
            id="confirm-username"
            type="email"
            value={
              username
            }
            onChange={(
              event
            ) =>
              setUsername(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="confirmation-code">
            Confirmation code
          </label>

          <input
            id="confirmation-code"
            autoComplete="one-time-code"
            value={code}
            onChange={(
              event
            ) =>
              setCode(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="confirmation-password">
            Password
          </label>

          <input
            id="confirmation-password"
            type="password"
            autoComplete="current-password"
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <button
            disabled={
              submitting
            }
          >
            {submitting
              ? "Confirming…"
              : "Confirm and sign in"}
          </button>

          <button
            type="button"
            className="secondary"
            disabled={
              submitting
            }
            onClick={
              resend
            }
          >
            Resend code
          </button>
        </form>
      )}

      {mode ===
        "forgot" && (
        <form
          onSubmit={
            forgot
          }
        >
          <label htmlFor="recovery-username">
            Email
          </label>

          <input
            id="recovery-username"
            type="email"
            value={
              username
            }
            onChange={(
              event
            ) =>
              setUsername(
                event
                  .target
                  .value
              )
            }
            required
          />

          <button
            disabled={
              submitting
            }
          >
            Send reset code
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() =>
              choose(
                "sign-in"
              )
            }
          >
            Back to sign in
          </button>
        </form>
      )}

      {mode ===
        "reset" && (
        <form
          onSubmit={
            reset
          }
        >
          <label htmlFor="reset-code">
            Reset code
          </label>

          <input
            id="reset-code"
            autoComplete="one-time-code"
            value={code}
            onChange={(
              event
            ) =>
              setCode(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="reset-password">
            New password
          </label>

          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={
              password
            }
            onChange={(
              event
            ) =>
              setPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <label htmlFor="reset-confirm">
            Confirm new password
          </label>

          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={
              confirmPassword
            }
            onChange={(
              event
            ) =>
              setConfirmPassword(
                event
                  .target
                  .value
              )
            }
            required
          />

          <button
            disabled={
              submitting
            }
          >
            Reset password
          </button>
        </form>
      )}

      {notice && (
        <p className="notice">
          {notice}
        </p>
      )}

      {error && (
        <p className="error">
          {error}
        </p>
      )}
    </section>
  );
}