/**
 * Email service using MailerSend
 * Handles sending verification emails and other transactional emails
 */

import { MailerSend, EmailParams, Recipient } from "mailersend";
import env from "./env";

const mailersend = new MailerSend({
  apiKey: env.MAILERSEND_API_KEY,
});

export async function sendVerificationEmail(
  email: string,
  verificationToken: string
) {
  const verificationUrl = `${env.HOST_URL}/api/auth/verify-email?token=${verificationToken}`;

  try {
    const params = new EmailParams()
      .setFrom({
        email: env.FROM_EMAIL,
        name: "AuthForge",
      })
      .setTo([
        new Recipient(email),
      ])
      .setSubject("Verify your email address")
      .setHtml(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px;">Verify Your Email Address</h1>
              <p style="margin-bottom: 20px;">Thank you for registering! Please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}"
                   style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Verify Email
                </a>
              </div>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #7f8c8d; font-size: 12px; word-break: break-all;">
                ${verificationUrl}
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                This link will expire in 24 hours.
              </p>
              <p style="color: #7f8c8d; font-size: 14px;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `);

    await mailersend.email.send(params);
    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  const resetUrl = `${env.HOST_URL}/reset-password?token=${resetToken}`;

  try {
    const params = new EmailParams()
      .setFrom({
        email: env.FROM_EMAIL,
        name: "AuthForge",
      })
      .setTo([
        new Recipient(email),
      ])
      .setSubject("Reset your password")
      .setHtml(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px;">Reset Your Password</h1>
              <p style="margin-bottom: 20px;">We received a request to reset your password. Click the button below to set a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #7f8c8d; font-size: 12px; word-break: break-all;">
                ${resetUrl}
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                This link will expire in 24 hours.
              </p>
              <p style="color: #7f8c8d; font-size: 14px;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
          </body>
        </html>
      `);

    await mailersend.email.send(params);
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}

export async function sendInvitationEmail(
  email: string,
  organizationName: string,
  invitationToken: string
) {
  const acceptUrl = `${env.HOST_URL}/accept-invitation?token=${invitationToken}`;

  try {
    const params = new EmailParams()
      .setFrom({
        email: env.FROM_EMAIL,
        name: "AuthForge",
      })
      .setTo([
        new Recipient(email),
      ])
      .setSubject(`You're invited to join ${organizationName}`)
      .setHtml(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f4f4f4; padding: 20px; border-radius: 10px;">
              <h1 style="color: #2c3e50; margin-bottom: 20px;">You're invited!</h1>
              <p style="margin-bottom: 20px;">You've been invited to join <strong>${organizationName}</strong> on AuthForge.</p>
              <p style="margin-bottom: 20px;">Click the button below to accept this invitation. If you don't have an account yet, you'll be able to create one during this process.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${acceptUrl}"
                   style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #7f8c8d; font-size: 12px; word-break: break-all;">
                ${acceptUrl}
              </p>
              <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                This invitation will expire in 7 days.
              </p>
              <p style="color: #7f8c8d; font-size: 14px;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
      `);

    await mailersend.email.send(params);
    return { success: true };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
}
