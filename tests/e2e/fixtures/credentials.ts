export type LoginCredential = {
  label: string;
  email: string;
  password: string;
  roleNumber?: number;
};

export function getLoginCredentials(): LoginCredential[] {
  const credentials: LoginCredential[] = [];

  if (process.env.E2E_LOGIN_EMAIL && process.env.E2E_LOGIN_PASSWORD) {
    credentials.push({
      label: "default",
      email: process.env.E2E_LOGIN_EMAIL,
      password: process.env.E2E_LOGIN_PASSWORD,
    });
  }

  const roleEmails = Object.keys(process.env)
    .map((key) => key.match(/^E2E_LOGIN_EMAIL_ROLE_(\d+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b);

  for (const roleNumber of roleEmails) {
    const email = process.env[`E2E_LOGIN_EMAIL_ROLE_${roleNumber}`];
    const password = process.env[`E2E_LOGIN_PASSWORD_ROLE_${roleNumber}`];

    if (!email || !password) {
      continue;
    }

    credentials.push({
      label: `rol_${roleNumber}`,
      email,
      password,
      roleNumber,
    });
  }

  return credentials;
}

export function getFirstCredential(): LoginCredential | null {
  const credentials = getLoginCredentials();
  return credentials.length > 0 ? credentials[0] : null;
}
