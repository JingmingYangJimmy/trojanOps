// Owner: D (WP-10, real by H9). Picks each connector from CONNECTOR_* (read at startup) (§9, I12).
// STUB: listConnectors reports static status; WP-10 records it in the connectors table.
import type {
  ApplicationSink, ConnectorKind, ConnectorStatus, DocumentSource, IdentityProvider, LLMProvider, RosterSource,
} from '../contracts';
import { internalApplications } from './applications/mock';
import { noDocumentSource } from './documents/mock';
import { personaIdentity } from './identity/mock';
import { mockLlm } from './llm/mock';
import { csvRoster } from './roster/mock';

export interface Connectors {
  identity: IdentityProvider;
  roster: RosterSource;
  documents: DocumentSource;
  llm: LLMProvider;
  applications: ApplicationSink;
}

const DEFAULTS: Record<ConnectorKind, string> = {
  identity: 'persona',
  roster: 'csv',
  documents: 'upload',
  llm: 'mock',
  applications: 'internal',
};

export function connectorImplementation(kind: ConnectorKind): string {
  return process.env[`CONNECTOR_${kind.toUpperCase()}`] ?? DEFAULTS[kind];
}

let cached: Connectors | null = null;

export function getConnectors(): Connectors {
  if (cached) return cached;
  for (const kind of Object.keys(DEFAULTS) as ConnectorKind[]) {
    const impl = connectorImplementation(kind);
    if (impl !== DEFAULTS[kind]) throw new Error(`CONNECTOR_${kind.toUpperCase()}=${impl} is not implemented yet`);
  }
  cached = {
    identity: personaIdentity,
    roster: csvRoster,
    documents: noDocumentSource,
    llm: mockLlm,
    applications: internalApplications,
  };
  return cached;
}

/** What the integrations panel shows. Every hackathon implementation is a mock. */
export async function listConnectors(): Promise<ConnectorStatus[]> {
  return (Object.keys(DEFAULTS) as ConnectorKind[]).map((kind) => ({
    kind,
    implementation: connectorImplementation(kind),
    isMock: true,
    status: 'ok',
    lastSyncAt: null,
  }));
}
