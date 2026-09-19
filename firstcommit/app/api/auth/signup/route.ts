import {
  CognitoIdentityProviderClient,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";

import {
  z
} from "zod";

import {
  createSignupRoleGrant,
  type SignupRole
} from "@/lib/signup-role";

const signupSchema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(
          1,
          "Full name is required"
        )
        .max(100),

    email:
      z
        .string()
        .trim()
        .email(
          "Enter a valid email"
        ),

    password:
      z
        .string()
        .min(
          8,
          "Password must contain at least 8 characters"
        ),

    role:
      z.enum([
        "student",
        "teacher",
        "admin"
      ]),

    accessCode:
      z
        .string()
        .optional()
  });

function configuration() {
  const region =
    process.env.AWS_REGION ??
    process.env
      .NEXT_PUBLIC_AWS_REGION;

  const clientId =
    process.env
      .COGNITO_APP_CLIENT_ID ??
    process.env
      .NEXT_PUBLIC_COGNITO_APP_CLIENT_ID;

  if (
    !region ||
    !clientId
  ) {
    throw new Error(
      "Cognito signup configuration is unavailable"
    );
  }

  return {
    region,
    clientId
  };
}

function requiredAccessCode(
  role: SignupRole
) {
  if (
    role === "teacher"
  ) {
    return process.env
      .TEACHER_SIGNUP_CODE;
  }

  if (
    role === "admin"
  ) {
    return process.env
      .ADMIN_SIGNUP_CODE;
  }

  return undefined;
}

function verifyRolePermission(
  role: SignupRole,
  suppliedCode?: string
) {
  if (
    role === "student"
  ) {
    return;
  }

  const expectedCode =
    requiredAccessCode(role);

  if (!expectedCode) {
    throw new Error(
      `${role} signup is not configured`
    );
  }

  if (
    suppliedCode !==
    expectedCode
  ) {
    throw new Error(
      `Invalid ${role} access code`
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const input =
      signupSchema.parse(
        await request.json()
      );

    verifyRolePermission(
      input.role,
      input.accessCode
    );

    const {
      region,
      clientId
    } = configuration();

    const cognito =
      new CognitoIdentityProviderClient(
        {
          region
        }
      );

    const email =
      input.email
        .trim()
        .toLowerCase();

    const institutionId =
      process.env
        .DEFAULT_SIGNUP_INSTITUTION_ID ??
      "demo-institute";

    const classIds =
      process.env
        .DEFAULT_SIGNUP_CLASS_IDS ??
      "cn-b";

    await cognito.send(
      new SignUpCommand({
        ClientId:
          clientId,

        /*
         * Your Terraform user pool
         * uses email as the Cognito
         * username.
         */
        Username:
          email,

        Password:
          input.password,

        UserAttributes: [
          {
            Name:
              "email",
            Value:
              email
          },
          {
            Name:
              "name",
            Value:
              input.name
          },
          {
            Name:
              "custom:institution_id",
            Value:
              institutionId
          },
          {
            Name:
              "custom:class_ids",
            Value:
              classIds
          }
        ]
      })
    );

    const roleGrant =
      createSignupRoleGrant(
        email,
        input.role
      );

    return Response.json(
      {
        ok: true,

        username:
          email,

        role:
          input.role,

        roleGrant,

        message:
          "Account created. Check your email for the verification code."
      },
      {
        status: 201
      }
    );
  } catch (error) {
    console.error(
      "[auth:signup]",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create account"
      },
      {
        status: 400
      }
    );
  }
}