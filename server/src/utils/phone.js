// Canonical phone storage for the directory: "NNN-NNN-NNNN" for 10-digit
// NANP numbers — the format existing phone-list rows already use, and what
// the SMS subsystem matches Twilio's `From` against. A leading "1" country
// code is stripped; anything that doesn't reduce to 10 digits (one-digit
// placeholders, malformed text, non-NANP numbers) is stored as null.
export function canonicalPhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
}
