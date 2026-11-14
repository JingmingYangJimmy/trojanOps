// The only place that reads the system clock (I9). Everything else calls now().
//
// Real time by default. With DEMO_MODE=1 and DEMO_NOW set, time starts at DEMO_NOW when the process
// starts (or when setDemoNow() is called from /api/demo/clock) and then advances in real time.

const systemNow = () => Date.now();

type Anchor = { demoMs: number; realMs: number };
// On globalThis so route handlers and pages (separate module instances in Next.js) share one clock.
const state = globalThis as unknown as { trojanopsClock?: Anchor | null };

function demoAnchor(): Anchor | null {
  if (state.trojanopsClock) return state.trojanopsClock;
  if (process.env.DEMO_MODE !== '1' || !process.env.DEMO_NOW) return null;
  const demoMs = Date.parse(process.env.DEMO_NOW);
  if (Number.isNaN(demoMs)) throw new Error(`DEMO_NOW is not a valid date: ${process.env.DEMO_NOW}`);
  state.trojanopsClock = { demoMs, realMs: systemNow() };
  return state.trojanopsClock;
}

export function now(): Date {
  const a = demoAnchor();
  return new Date(a ? a.demoMs + (systemNow() - a.realMs) : systemNow());
}

/** Demo only: jump the clock to `date`; it keeps running from there. */
export function setDemoNow(date: Date): void {
  if (process.env.DEMO_MODE !== '1') throw new Error('setDemoNow needs DEMO_MODE=1');
  state.trojanopsClock = { demoMs: date.getTime(), realMs: systemNow() };
}

/** Tests only: forget the anchor so the next now() re-reads DEMO_NOW. */
export function resetClockForTests(): void {
  state.trojanopsClock = null;
}

export const clock = { now, setDemoNow };
