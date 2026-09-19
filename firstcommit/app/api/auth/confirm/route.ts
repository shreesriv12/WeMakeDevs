import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";

import {
  z
} from "zod";

import {
  verifySignupRoleGrant
} from "@/lib/signup-role";

const confirmSchema =
  z.object({
    username:
      z
        .string()
        .email(),

    code:
      z
        .string()
        .trim()
        .min(1),

    roleGrant:
      z
        .string()
        .min(1)
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

  const userPoolId =
    process.env
      .COGNITO_USER_POOL_ID;

  if (
    !region ||
    !clientId ||
    !userPoolId
  ) {
    throw new Error(
      "Cognito confirmation configuration is unavailable"
    );
  }

  return {
    region,
    clientId,
    userPoolId
  };
}

function alreadyConfirmed(
  error: unknown
) {
  if (
    !(error instanceof Error)
  ) {
    return false;
  }

  return (
    error.name ===
      "NotAuthorizedException" &&
    error.message
      .toLowerCase()
      .includes("confirmed")
  );
}

export async function POST(
  request: Request
) {
  try {
    const input =
      confirmSchema.parse(
        await request.json()
      );

    const username =
      input.username
        .trim()
        .toLowerCase();

    const grant =
      verifySignupRoleGrant(
        input.roleGrant
      );

    if (
      grant.email !==
      username
    ) {
      return Response.json(
        {
          error:
            "Signup role grant does not belong to this account"
        },
        {
          status: 403
        }
      );
    }

    const {
      region,
      clientId,
      userPoolId
    } = configuration();

    const cognito =
      new CognitoIdentityProviderClient(
        {
          region
        }
      );

    /*
     * Confirm the email first.
     *
     * We tolerate an already-confirmed
     * account so that the request can
     * safely be retried if group
     * assignment previously failed.
     */
    try {
      await cognito.send(
        new ConfirmSignUpCommand(
          {
            ClientId:
              clientId,

            Username:
              username,

            ConfirmationCode:
              input.code
          }
        )
      );
    } catch (error) {
      if (
        !alreadyConfirmed(
          error
        )
      ) {
        throw error;
      }
    }

    /*
     * This is privileged and therefore
     * happens ONLY on the server.
     */
    await cognito.send(
      new AdminAddUserToGroupCommand(
        {
          UserPoolId:
            userPoolId,

          Username:
            username,

          GroupName:
            grant.role
        }
      )
    );

    return Response.json(
      {
        ok: true,

        role:
          grant.role,

        message:
          "Account confirmed and role assigned."
      }
    );
  } catch (error) {
    console.error(
      "[auth:confirm]",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not confirm account"
      },
      {
        status: 400
      }
    );
  }
}