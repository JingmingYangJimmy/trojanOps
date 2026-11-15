// Owner: B. The configuration editor's draft: the POST body for /api/templates/:id/versions (the
// same shape as versionDraftSchema), its validation, and the fields that differ from the current version.
import type { Audience, Tier } from '@/lib/contracts';
import { orderedModelIds, type ModelId } from '@/lib/gateway/models';
import type { UsgPositionOption, UsgVersion } from '@/lib/distribution/usg-view';
import { AUDIENCES, audienceLabel, NEW_TEMPLATE_MODELS, plural, SOURCE_KINDS, sourceName, TIERS, toolOption } from '../template-config';

export interface EditorState {
  purpose: string; audience: Audience; usableBy: string[]; maxTier: Tier; sourceKinds: string[]; tools: string[];
  modelIds: ModelId[]; defaultModelId: ModelId; systemPrompt: string; rulePackSlug: string; changelog: string;
  searchKnowledge: boolean; citeSources: boolean; temperature: number;
}
export interface VersionBody {
  purpose: string; audience: Audience; usableBy: string[]; maxTier: Tier; sourceKinds: string[]; tools: string[];
  modelIds: ModelId[]; defaultModelId: ModelId; systemPrompt: string; rulePackSlug: string | null; changelog: string;
  searchKnowledge: boolean; citeSources: boolean; temperature: number;
}
/** Capabilities and temperature of a template with no published version. */
export const NEW_VERSION_DEFAULTS = { searchKnowledge: true, citeSources: true, temperature: 0.3 } as const;
/** One decimal place, so 0.1 steps compare and print cleanly ("0.3"). */
export const roundTemperature = (value: number) => Math.round(value * 10) / 10;
export const temperatureLabel = (value: number) => roundTemperature(value).toFixed(1);
export const initialState = (latest: UsgVersion | undefined): EditorState => ({
  purpose: latest?.purpose ?? '', audience: latest?.audience ?? 'members', usableBy: latest?.usableBy ?? [],
  maxTier: latest?.maxTier ?? 'members', sourceKinds: latest?.sourceKinds ?? [], tools: latest?.tools ?? [],
  modelIds: latest?.modelIds ?? [...NEW_TEMPLATE_MODELS.modelIds], defaultModelId: latest?.defaultModelId ?? NEW_TEMPLATE_MODELS.defaultModelId,
  systemPrompt: latest?.systemPrompt ?? '', rulePackSlug: latest?.rulePackSlug ?? '', changelog: '',
  searchKnowledge: latest?.searchKnowledge ?? NEW_VERSION_DEFAULTS.searchKnowledge, citeSources: latest?.citeSources ?? NEW_VERSION_DEFAULTS.citeSources,
  temperature: latest?.temperature ?? NEW_VERSION_DEFAULTS.temperature,
});
/** The request body, unchanged from the slug-based form: positions only for a positions audience, Public for All students.
 * `rulePackSlug` has no control and is carried over from the current version. */
export const toBody = (s: EditorState): VersionBody => ({
  purpose: s.purpose.trim(), audience: s.audience, usableBy: s.audience === 'positions' ? s.usableBy : [],
  maxTier: s.audience === 'public' ? 'public' : s.maxTier, sourceKinds: s.sourceKinds, tools: s.tools,
  modelIds: orderedModelIds(s.modelIds), defaultModelId: s.defaultModelId,
  systemPrompt: s.systemPrompt, rulePackSlug: s.rulePackSlug.trim() || null, changelog: s.changelog,
  searchKnowledge: s.searchKnowledge, citeSources: s.citeSources, temperature: roundTemperature(s.temperature),
});

export type EditorField = 'purpose' | 'usableBy' | 'sourceKinds' | 'modelIds' | 'systemPrompt' | 'temperature';
export function validate(s: EditorState): Partial<Record<EditorField, string>> {
  const errors: Partial<Record<EditorField, string>> = {};
  if (!s.purpose.trim()) errors.purpose = 'Say in one sentence what it does, for example “Checks a funding request against the USG funding rules before you submit it.”';
  if (s.audience === 'positions' && !s.usableBy.length) errors.usableBy = 'Choose at least one position, or choose All members.';
  if (s.sourceKinds.some(k => !SOURCE_KINDS.some(o => o.slug === k))) errors.sourceKinds = 'Use only the knowledge sources listed here.';
  if (!s.modelIds.length) errors.modelIds = 'Offer at least one model.';
  else if (!s.modelIds.includes(s.defaultModelId)) errors.modelIds = 'Choose a default model from the models you offer.';
  if (!s.systemPrompt.trim()) errors.systemPrompt = 'Write the system prompt the agent follows before every request.';
  if (!Number.isFinite(s.temperature) || s.temperature < 0 || s.temperature > 1) errors.temperature = 'Set the temperature between 0 and 1.';
  return errors;
}

export interface FieldChange { field: string; before: string; after: string; detail?: string }
export interface ChangeContext { positions: UsgPositionOption[] }
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(x => b.includes(x));
const list = (values: string[], name: (v: string) => string) => values.length ? values.map(name).join(', ') : 'None';
const audienceName = (a: Audience) => AUDIENCES.find(x => x.slug === a)?.name ?? a;
/** "182 words": the system prompt's length, as the builder and the review show it. */
export const words = (text: string) => plural(text.trim() ? text.trim().split(/\s+/).length : 0, 'word');

/** Each setting whose value differs from `before` (the current version), in the editor's order. */
export function versionChanges(before: UsgVersion | undefined, after: VersionBody, ctx: ChangeContext): FieldChange[] {
  const changes: FieldChange[] = []; const none = 'Not set';
  const add = (field: string, differs: boolean, from: string, to: string, detail?: string) => { if (differs) changes.push({ field, before: from, after: to, ...(detail ? { detail } : {}) }); };
  const onOff = (on: boolean) => on ? 'On' : 'Off';
  add('Description', before?.purpose !== after.purpose, before?.purpose ?? none, after.purpose);
  add('System prompt', before?.systemPrompt !== after.systemPrompt, before ? words(before.systemPrompt) : none, `${words(after.systemPrompt)}, edited`, after.systemPrompt);
  add('Search knowledge', before?.searchKnowledge !== after.searchKnowledge, before ? onOff(before.searchKnowledge) : none, onOff(after.searchKnowledge));
  add('Cite sources', before?.citeSources !== after.citeSources, before ? onOff(before.citeSources) : none, onOff(after.citeSources));
  add('Knowledge sources', !sameSet(before?.sourceKinds ?? [], after.sourceKinds), list(before?.sourceKinds ?? [], sourceName), list(after.sourceKinds, sourceName));
  add('Reads up to', before?.maxTier !== after.maxTier, before ? TIERS[before.maxTier].name : none, TIERS[after.maxTier].name);
  add('Tools', !sameSet(before?.tools ?? [], after.tools), list(before?.tools ?? [], t => toolOption(t).name), list(after.tools, t => toolOption(t).name));
  add('Models', !sameSet(before?.modelIds ?? [], after.modelIds), list(orderedModelIds(before?.modelIds ?? []), id => id), list(after.modelIds, id => id));
  add('Default model', before?.defaultModelId !== after.defaultModelId, before?.defaultModelId ?? none, after.defaultModelId);
  add('Temperature', !before || roundTemperature(before.temperature) !== roundTemperature(after.temperature),
    before ? temperatureLabel(before.temperature) : none, temperatureLabel(after.temperature));
  add('Audience', before?.audience !== after.audience, before ? audienceName(before.audience) : none, audienceName(after.audience));
  add('Positions', !sameSet(before?.usableBy ?? [], after.usableBy),
    before?.usableBy.length ? audienceLabel('positions', before.usableBy, ctx.positions) : 'None', after.usableBy.length ? audienceLabel('positions', after.usableBy, ctx.positions) : 'None');
  return changes;
}

const and = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** The one-line consequence for the review step: who gets the version, and when. */
export function reachSentences(body: VersionBody, installedCount: number, ctx: ChangeContext): string[] {
  const who = body.audience === 'public' ? 'All students' : body.audience === 'members' ? 'All members' : and(body.usableBy.map(slug => audienceLabel('positions', [slug], ctx.positions)));
  return [`Reaches ${who} in ${plural(installedCount, 'club')} on the next run; pinned installations keep their version.`];
}
