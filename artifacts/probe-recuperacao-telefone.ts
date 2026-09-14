import { createRequire } from 'node:module';
import service from '../backend/src/modules/auth/services/RequestPasswordResetService.js';
import users from '../backend/src/modules/auth/repositories/UserRepository.js';
import codes from '../backend/src/modules/auth/repositories/PasswordResetCodeRepository.js';

const require = createRequire(new URL('../backend/package.json', import.meta.url));
const mailer = require('nodemailer');
const originals = { lookup: users.findByPhone, claim: codes.claim, transport: mailer.createTransport };
const environment = { NODE_ENV: 'test', SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'mailer@example.test', SMTP_PASS: 'test-only', SMTP_AUTH_TYPE: 'basic' };
const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));

async function main() {
  const messages: Array<{ to: unknown; subject: unknown }> = [];
  let lookup = '';
  let claims = 0;
  Object.assign(process.env, environment);
  users.findByPhone = async (phone) => {
    lookup = phone;
    return { id: 1, authVersion: 1, email: 'test-account@example.test', resetPasswordCodeHash: null, resetPasswordCodeExpiresAt: null, resetPasswordLockedUntil: null } as any;
  };
  codes.claim = async () => { claims++; return true; };
  mailer.createTransport = () => ({ sendMail: async (message: any) => { messages.push({ to: message.to, subject: message.subject }); return {}; } });
  try {
    const response = await service.execute({ phone: '(11) 99999-9999' });
    console.log(JSON.stringify({ scenario: 'phone-is-lookup-email-is-delivery', lookup, claims, emailCalls: messages.length, recipient: messages[0]?.to, response }));
  } finally {
    users.findByPhone = originals.lookup;
    codes.claim = originals.claim;
    mailer.createTransport = originals.transport;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
