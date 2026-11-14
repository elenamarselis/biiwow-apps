// Create the single invited account (public sign-up is disabled).
//   npm run invite -- you@example.com                 → sends an invite email (set a password via the link)
//   npm run invite -- you@example.com --password '…'  → creates the account with that password, no email
import { admin, arg } from './env';

async function main() {
  const email = process.argv.slice(2).find((a) => a.includes('@'));
  if (!email) throw new Error('Usage: npm run invite -- you@example.com [--password "at least 10 characters"]');
  const password = arg('password');
  const sb = admin();
  if (password) {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    console.log(`Created ${data.user.email}. Sign in with that password.`);
  } else {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const { data, error } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/auth/callback?next=/settings` });
    if (error) throw error;
    console.log(`Invite sent to ${data.user.email}.`);
  }
}
main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
