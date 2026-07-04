/** Phone → tel:/sms: hrefs. Keeps a leading + and digits; drops spaces/dashes. */
function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}

export function smsHref(phone: string): string {
  return `sms:${normalizePhone(phone)}`;
}
