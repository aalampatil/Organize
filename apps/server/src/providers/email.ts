import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import type { Environment } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import type { EmailGateway } from './contracts.js';
export type { EmailGateway } from './contracts.js';

export function createEmailGateway(env: Environment): EmailGateway {
  const smtp =
    env.EMAIL_PROVIDER === 'mailtrap' && env.MAILTRAP_USER && env.MAILTRAP_PASSWORD
      ? nodemailer.createTransport({
          host: env.MAILTRAP_HOST,
          port: env.MAILTRAP_PORT,
          secure: env.MAILTRAP_PORT === 465,
          auth: { user: env.MAILTRAP_USER, pass: env.MAILTRAP_PASSWORD },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 10_000,
        })
      : null;
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
  return {
    async sendCode(email, code) {
      const message = {
        from: env.EMAIL_FROM,
        to: email,
        subject: `${code} is your Organize sign-in code`,
        text: `Your Organize sign-in code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
      };
      try {
        if (env.EMAIL_PROVIDER === 'mailtrap' && smtp) {
          await smtp.sendMail(message);
          return;
        }
        if (env.EMAIL_PROVIDER === 'resend' && resend) {
          const { error } = await resend.emails.send(message);
          if (!error) return;
        }
      } catch {
        /* Provider errors never reveal credentials or codes. */
      }
      throw new AppError(
        503,
        'Email delivery is unavailable. Check the server email configuration and try again.',
        'EMAIL_UNAVAILABLE',
      );
    },
  };
}
