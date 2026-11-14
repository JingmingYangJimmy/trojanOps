// Owner: B. STUB data until WP-5 resolves installations from the DB (real by H6–H7). Mirrors the §8
// seeded templates and installations. recruiting-qa starts disabled (D3 publishes it).
import type { EffectiveAgent } from '../contracts';
import { INSTALLATION, ORG, SOURCE } from '@db/seed/ids';

export const FIXTURE_CLUB_NAMES: Record<string, string> = {
  [ORG.usg]: 'USG',
  [ORG.startup]: 'Startup Club',
  [ORG.archery]: 'Archery Club',
  [ORG.dance]: 'Dance Club',
};

const usgFundingV1 = {
  slug: 'usg-funding',
  version: 1,
  label: 'Demo rule pack',
  content: {
    annualCapUsd: 8000,
    fundedEventsPerSemester: 4,
    vendorLeadTimeInstructionalWeeks: 6,
    deadline: 'Wednesday 11:59 PM PT',
  },
};

const fundingPrecheck = (installationId: string, orgId: string, financeSourceId: string): EffectiveAgent => ({
  installationId,
  orgId,
  templateSlug: 'funding-precheck',
  name: 'Funding pre-check',
  templateVersion: 1,
  status: 'enabled',
  purpose: 'Checks a funding request against the USG funding rules before you submit it.',
  audience: 'positions',
  usableBy: ['treasurer', 'president'],
  maxTier: 'officers',
  sourceIds: [SOURCE.usg.rulebook, financeSourceId],
  tools: [],
  modelClass: 'standard',
  systemPrompt: 'You check club funding requests against the USG rule pack.',
  rulePack: usgFundingV1,
});

const initialAgents = (): Record<string, EffectiveAgent> => ({
  [INSTALLATION.startupFundingPrecheck]: fundingPrecheck(INSTALLATION.startupFundingPrecheck, ORG.startup, SOURCE.startup.finance),
  [INSTALLATION.archeryFundingPrecheck]: fundingPrecheck(INSTALLATION.archeryFundingPrecheck, ORG.archery, SOURCE.archery.finance),
  [INSTALLATION.danceFundingPrecheck]: fundingPrecheck(INSTALLATION.danceFundingPrecheck, ORG.dance, SOURCE.dance.finance),
  [INSTALLATION.startupRecruitingQa]: {
    installationId: INSTALLATION.startupRecruitingQa,
    orgId: ORG.startup,
    templateSlug: 'recruiting-qa',
    name: 'Recruiting Q&A',
    templateVersion: 1,
    status: 'disabled',
    purpose: 'Answers questions about joining Startup Club.',
    audience: 'public',
    usableBy: [],
    maxTier: 'public',
    sourceIds: [SOURCE.startup.public],
    tools: [],
    modelClass: 'economy',
    systemPrompt: 'You answer prospective members’ questions about Startup Club.',
  },
  [INSTALLATION.startupHandoff]: {
    installationId: INSTALLATION.startupHandoff,
    orgId: ORG.startup,
    templateSlug: 'handoff',
    name: 'Club handoff',
    templateVersion: 1,
    status: 'enabled',
    purpose: 'Helps incoming officers catch up on decisions, events and budgets.',
    audience: 'members',
    usableBy: [],
    maxTier: 'officers',
    sourceIds: [SOURCE.startup.public, SOURCE.startup.minutes, SOURCE.startup.archive, SOURCE.startup.finance],
    tools: [],
    modelClass: 'standard',
    systemPrompt: 'You brief club members on what happened before they joined.',
  },
  [INSTALLATION.danceShowcaseQa]: {
    installationId: INSTALLATION.danceShowcaseQa,
    orgId: ORG.dance,
    templateSlug: 'showcase-qa',
    name: 'Showcase Q&A',
    templateVersion: 1,
    status: 'enabled',
    purpose: 'Answers questions about the Dance Club spring showcase.',
    audience: 'public',
    usableBy: [],
    maxTier: 'public',
    sourceIds: [SOURCE.dance.public],
    tools: [],
    modelClass: 'economy',
    systemPrompt: 'You answer questions about the spring showcase.',
  },
  [INSTALLATION.usgReviewAssistant]: {
    installationId: INSTALLATION.usgReviewAssistant,
    orgId: ORG.usg,
    templateSlug: 'usg-review-assistant',
    name: 'USG review assistant',
    templateVersion: 1,
    status: 'enabled',
    purpose: 'Helps USG reviewers check funding applications against the rules.',
    audience: 'positions',
    usableBy: ['reviewer', 'admin'],
    maxTier: 'usg_internal',
    sourceIds: [SOURCE.usg.rulebook, SOURCE.usg.usg_internal],
    tools: [],
    modelClass: 'standard',
    systemPrompt: 'You help USG reviewers apply the funding rules.',
  },
});

// On globalThis so a publish from a route handler shows on pages (separate module instances).
const store = globalThis as unknown as { trojanopsAgentsStub?: Record<string, EffectiveAgent> };
export const FIXTURE_AGENTS: Record<string, EffectiveAgent> = (store.trojanopsAgentsStub ??= initialAgents());

/** Tests only: undo in-memory publishes. */
export function resetDistributionFixtures(): void {
  store.trojanopsAgentsStub = initialAgents();
  Object.keys(FIXTURE_AGENTS).forEach((k) => delete FIXTURE_AGENTS[k]);
  Object.assign(FIXTURE_AGENTS, store.trojanopsAgentsStub);
  store.trojanopsAgentsStub = FIXTURE_AGENTS;
}
