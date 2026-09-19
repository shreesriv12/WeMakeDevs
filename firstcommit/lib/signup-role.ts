import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

export type SignupRole =
  | "student"
  | "teacher"
  | "admin";

type RoleGrantPayload = {
  email: string;
  role: SignupRole;
  expiresAt: number;
};

const GRANT_TTL_MS =
  30 * 60 * 1000;

function secret() {
  const value =
    process.env
      .SIGNUP_ROLE_TOKEN_SECRET;

  if (!value) {
    throw new Error(
      "SIGNUP_ROLE_TOKEN_SECRET is not configured"
    );
  }

  if (value.length < 32) {
    throw new Error(
      "SIGNUP_ROLE_TOKEN_SECRET must be at least 32 characters"
    );
  }

  return value;
}

function sign(
  encodedPayload: string
) {
  return createHmac(
    "sha256",
    secret()
  )
    .update(encodedPayload)
    .digest("base64url");
}

export function createSignupRoleGrant(
  email: string,
  role: SignupRole
) {
  const payload: RoleGrantPayload = {
    email:
      email
        .trim()
        .toLowerCase(),

    role,

    expiresAt:
      Date.now() +
      GRANT_TTL_MS
  };

  const encodedPayload =
    Buffer.from(
      JSON.stringify(payload)
    ).toString("base64url");

  const signature =
    sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySignupRoleGrant(
  token: string
): RoleGrantPayload {
  const [
    encodedPayload,
    suppliedSignature
  ] = token.split(".");

  if (
    !encodedPayload ||
    !suppliedSignature
  ) {
    throw new Error(
      "Invalid signup role grant"
    );
  }

  const expectedSignature =
    sign(encodedPayload);

  const suppliedBuffer =
    Buffer.from(
      suppliedSignature,
      "base64url"
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "base64url"
    );

  if (
    suppliedBuffer.length !==
      expectedBuffer.length ||
    !timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    )
  ) {
    throw new Error(
      "Invalid signup role grant signature"
    );
  }

  let payload:
    | RoleGrantPayload
    | undefined;

  try {
    payload =
      JSON.parse(
        Buffer.from(
          encodedPayload,
          "base64url"
        ).toString("utf8")
      ) as RoleGrantPayload;
  } catch {
    throw new Error(
      "Invalid signup role grant payload"
    );
  }

  if (
    !payload.email ||
    ![
      "student",
      "teacher",
      "admin"
    ].includes(payload.role)
  ) {
    throw new Error(
      "Invalid signup role grant"
    );
  }

  if (
    payload.expiresAt <
    Date.now()
  ) {
    throw new Error(
      "Signup role grant expired. Please sign up again."
    );
  }

  return payload;
}