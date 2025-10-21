import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/db";
import errorMessage from "@/app/lib/errorMessage";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendVerificationEmail } from "@/app/lib/email";

const registerSchema = z.object({
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(72, "Password must be less than 72 characters"),
  name: z.string().min(1, "Name is required").max(100),
  orgName: z.string().min(1, "Organization name required").max(100),
});

export async function POST(req: NextRequest) {
  let user;
  let credentials;
  try {
    const body = await req.json();

    // Validate input with Zod
    const validationResult = registerSchema.safeParse(body);

    if (!validationResult.success) {
      // Extract user-friendly error messages
      const errors = validationResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    // Use validated data (now type-safe!)
    const { email, password, name, orgName } = validationResult.data;
    const hashedPassword = await bcrypt.hash(password, 10);
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
      include: {
        memberships: {
          include: {
            organization: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error("Failed to retrieve user after creation");
    }

    const apiKey = randomBytes(16).toString("hex"); // client_id
    const apiSecret = randomBytes(32).toString("hex"); // client_secret
    const encodedAPISecret = await bcrypt.hash(apiSecret, 10);
    await prisma.apiCredential.create({
      data: {
        orgId: org.id,
        clientId: apiKey,
        clientSecret: encodedAPISecret,
      },
    });
    credentials = { clientId: apiKey, clientSecret: apiSecret };

    // Generate email verification token
    const verificationToken = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

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
    const message = errorMessage(e);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
  return NextResponse.json({
    success: true,
    data: { user, credentials },
    message:
      "Registration successful! Please check your email to verify your account.",
  });
}
