// Owner: A. Every route handler: getActor → one service call → JSON or ApiError (§14).
//
//   export const POST = route(async ({ actor, req, params }) => {
//     const body = await parseBody(req, z.object({ input: z.string().min(1) }));
//     return runAgent(actor, params.installationId, body.input);
//   });
import { z } from 'zod';
import { AppError, type Actor, type ApiError } from './contracts';
import { getActor } from './identity';

export interface RouteContext<P> {
  req: Request;
  actor: Actor;
  params: P;
}

export function route<P extends Record<string, string> = Record<string, string>>(
  handler: (ctx: RouteContext<P>) => Promise<unknown>,
) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      const actor = await getActor(req);
      const params = ctx?.params ? await ctx.params : ({} as P);
      const result = await handler({ req, actor, params });
      return Response.json(result ?? null);
    } catch (err) {
      if (err instanceof AppError) return Response.json(err.error, { status: err.status });
      throw err;
    }
  };
}

/** Parses a JSON body with zod; a bad body becomes ApiError `invalid`. */
export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError({ code: 'invalid', message: 'The request body must be JSON.' });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
    throw new AppError({ code: 'invalid', message: `${where}${issue?.message ?? 'Invalid request.'}` });
  }
  return parsed.data;
}

/** Throws unless the actor is signed in. Returns the user id. */
export function requireUser(actor: Actor): string {
  if (!actor.userId) {
    const error: ApiError = { code: 'unauthenticated', message: 'Choose a persona to sign in.' };
    throw new AppError(error);
  }
  return actor.userId;
}
