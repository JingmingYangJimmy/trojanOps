// Owner: A. Session cookies (DEMO_MODE persona identity). Never holds grants (I3).
export const PERSONA_COOKIE = 'trojanops_persona';   // user id of the chosen persona
export const ACTIVE_ORG_COOKIE = 'trojanops_org';    // active org id

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k !== name) continue;
    try {
      return decodeURIComponent(v.join('='));
    } catch {
      return null; // malformed encoding: treat as absent
    }
  }
  return null;
}

/** Options for the cookies the /api/session routes write. */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
} as const;
