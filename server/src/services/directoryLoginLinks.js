// Shared sign-in link issuing (directory-migration.md §6.3.1) — the magic-link
// email path and the SMS `me` command both mint tokens here so cooldown,
// TTL, hashing, and supersede rules stay identical across transports.
//
// One ordering difference from the old controller flow: a fresh token
// supersedes the member's other unused tokens at issue time rather than after
// the send, so a failed delivery can't leave two live links.

import crypto from 'crypto';
import defaultPrisma from '../db/client.js';

const LINK_TTL_MS = 30 * 60 * 1000;        // link valid for 30 minutes
const REQUEST_COOLDOWN_MS = 60 * 1000;     // at most one link per member per minute
const IS_PROD = process.env.NODE_ENV === 'production';

// → { link, tokenId } on success, { cooldown: true } when a token for this
// member was minted within the last 60s.
export async function issueLoginLink(member, prisma = defaultPrisma) {
  const recent = await prisma.directoryLoginToken.findFirst({
    where: { memberId: member.id, createdAt: { gt: new Date(Date.now() - REQUEST_COOLDOWN_MS) } },
  });
  if (recent) return { cooldown: true };

  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const link = `${base}/directory/verify?token=${raw}`;
  // Raw tokens only ever surface in local dev logs — never in production.
  if (!IS_PROD) console.log(`[directory] magic link for ${member.email ?? member.id}: ${link}`);

  const token = await prisma.directoryLoginToken.create({
    data: { memberId: member.id, tokenHash, expiresAt: new Date(Date.now() + LINK_TTL_MS) },
  });

  // A fresh link supersedes any earlier outstanding ones for this member.
  await prisma.directoryLoginToken.updateMany({
    where: { memberId: member.id, usedAt: null, id: { not: token.id } },
    data: { usedAt: new Date() },
  });

  return { link, tokenId: token.id };
}

// Removes an unissued token — e.g. when delivery (email send) fails and the
// link would be unusable anyway.
export async function revokeLoginToken(tokenId, prisma = defaultPrisma) {
  await prisma.directoryLoginToken.delete({ where: { id: tokenId } }).catch(() => {});
}
