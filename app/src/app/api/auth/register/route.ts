import { NextRequest } from "next/server";
import prisma from "@/app/lib/db";
import { sendVerificationEmail } from "@/app/lib/email";
import { userWithMembershipsSelect } from "@/app/lib/prisma-helpers";
import { hashPassword } from "@/app/lib/crypto-helpers";
import { generateApiCredentials, generateVerificationToken } from "@/app/lib/token-helpers";
import { handleValidationError, handleRouteError, createSuccessMessageResponse } from "@/app/lib/route-helpers";
import { registerSchema } from "@/app/lib/schemas";

export async function POST(req: NextRequest) {
  let user;
  let credentials;
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = registerSchema.safeParse(body);
    const validationError = handleValidationError(validationResult);
    if (validationError) return validationError;

    // Use validated data (now type-safe!)
    if (!validationResult.success) {
      throw new Error("Validation should have been caught earlier");
    }
    const { email, password, name, orgName } = validationResult.data;
    const hashedPassword = await hashPassword(password);
    user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });
    const org = await prisma.organization.create({
      data: {
        name: orgName,
      },
    });
    const role = await prisma.role.create({
      data: {
        name: "admin",
      },
    });
    await prisma.role.create({
      data: {
        name: "user",
      },
    });
    await prisma.membership.create({
      data: {
        userId: user.id,
        roleId: role.id,
        orgId: org.id,
      },
    });
    user = await prisma.user.findUnique({
      where: { id: user.id },
      select: userWithMembershipsSelect,
    });

    if (!user) {
      throw new Error("Failed to retrieve user after creation");
    }

    // Generate API credentials
    const { clientId: apiKey, clientSecret: apiSecret } = generateApiCredentials();
    const encodedAPISecret = await hashPassword(apiSecret);
    await prisma.apiCredential.create({
      data: {
        orgId: org.id,
        clientId: apiKey,
        clientSecret: encodedAPISecret,
      },
    });
    credentials = { clientId: apiKey, clientSecret: apiSecret };

    // Generate email verification token
    const { token: verificationToken, expiresAt } = generateVerificationToken();

    // Create verification token in database
    await prisma.verificationToken.create({
      data: {
        token: verificationToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);
  } catch (e: unknown) {
    return handleRouteError(e);
  }
  return createSuccessMessageResponse(
    "Registration successful! Please check your email to verify your account.",
    { user, credentials },
    201
  );
}
