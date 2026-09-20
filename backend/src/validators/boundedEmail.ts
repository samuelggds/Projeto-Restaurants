/** A bounded, linear structural check for normalized commercial email addresses. */
export function isBoundedEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254 || /\s/u.test(value)) return false;
  const at = value.indexOf('@');
  if (at < 1 || at > 64 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return dot > 0 && dot < domain.length - 1;
}
