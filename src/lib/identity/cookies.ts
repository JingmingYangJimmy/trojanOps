// Owner: A. Session cookies (DEMO_MODE persona identity). Never holds grants (I3).
export const PERSONA_COOKIE = 'trojanops_persona';   // user id of the chosen persona
export const ACTIVE_ORG_COOKIE = 'trojanops_org';    // active org id

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}
