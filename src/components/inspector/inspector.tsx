// Owner: C (WP-9, real by H10). STUB layout: the six inspector sections in order (ui-designer.md
// "Agent run page"). Final styling, chips and icons come in WP-9.
import type { AccessCell, RunInspector, Tier } from '@/lib/contracts';

const TIER_LABEL: Record<Tier, string> = {
  public: 'Public', members: 'Members', officers: 'Officers', usg_internal: 'USG internal',
};

const BLOCKED_LABEL: Record<AccessCell, string> = {
  allowed: 'Allowed',
  not_granted: 'Not granted',
  outside_sources: 'Outside agent sources',
  above_max_tier: 'Above agent max tier',
};

const money = (micro: number) => `$${(micro / 1_000_000).toFixed(2)}`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function Inspector({ inspector }: { inspector: RunInspector }) {
  return (
    <aside aria-label="Run inspector" className="w-96 shrink-0 border-l border-border px-4 text-sm">
      <Section title="Run grants">
        <ul>{inspector.runGrants.map((g) => <li key={g.grant}>{g.label}</li>)}</ul>
      </Section>
      <Section title="Sources">
        <ul>{inspector.sources.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
      </Section>
      <Section title="Documents">
        <p className="font-semibold">Permitted</p>
        <ul className="mb-2">
          {inspector.permitted.map((d) => (
            <li key={d.id}>{d.title} <span className="text-muted-foreground">· {TIER_LABEL[d.tier]}</span></li>
          ))}
        </ul>
        <p className="font-semibold">Read in this run</p>
        <ul className="mb-2">{inspector.readInRun.map((d) => <li key={d.id}>{d.title}</li>)}</ul>
        {inspector.blocked && (
          <>
            <p className="font-semibold">Blocked by rule</p>
            <ul>
              {inspector.blocked.map((d) => (
                <li key={d.id} className={d.title ? '' : 'text-muted-foreground'}>
                  {d.title ?? 'Restricted document'} <span className="text-muted-foreground">· {BLOCKED_LABEL[d.reason]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
      <Section title="Versions">
        <p>Template v{inspector.templateVersion}</p>
        {inspector.rulePack && <p>{inspector.rulePack.label} v{inspector.rulePack.version}</p>}
      </Section>
      <Section title="Billing">
        <p>Billed to {inspector.billedClub}</p>
        <p className="tabular-nums">Cost {money(inspector.costMicro)}</p>
        <ul>
          {Object.entries(inspector.quotaRemainingMicro).map(([scope, micro]) => (
            <li key={scope} className="tabular-nums">{scope}: {money(micro)} left</li>
          ))}
        </ul>
      </Section>
      <Section title="Audit">
        <p className="font-mono">#{inspector.auditEventId}</p>
      </Section>
    </aside>
  );
}
