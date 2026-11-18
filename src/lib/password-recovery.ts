export const MIN_ACCOUNT_PASSWORD_LENGTH = 8;

export function accountRecoveryRedirect(origin: string): string {
  return new URL("/conta", origin).toString();
}

export function validateNewAccountPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_ACCOUNT_PASSWORD_LENGTH) return `A senha precisa ter pelo menos ${MIN_ACCOUNT_PASSWORD_LENGTH} caracteres.`;
  if (password !== confirmation) return "As senhas não coincidem.";
  return null;
}
