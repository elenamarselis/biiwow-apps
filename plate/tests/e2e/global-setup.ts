import { admin, USERS } from './util';

export default async function globalSetup() {
  const sb = admin();
  const { data } = await sb.auth.admin.listUsers();
  for (const u of Object.values(USERS)) {
    if (!data.users.find((x) => x.email === u.email)) {
      const { error } = await sb.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true });
      if (error) throw error;
    }
  }
}
