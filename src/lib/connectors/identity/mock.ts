// Owner: D. Persona identity (DEMO_MODE): the persona cookie holds the chosen user's id.
import type { IdentityProvider } from '../../contracts';
import { PERSONA_COOKIE, readCookie } from '../../identity/cookies';

export const personaIdentity: IdentityProvider = {
  async currentUserId(req) {
    return readCookie(req, PERSONA_COOKIE);
  },
};
