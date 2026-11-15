import { baseSlug } from '@/lib/documents/fixtures';
// Topic tags for the agents a student sees, by template slug (a console-created `<name>-<uuid>` slug
// matches on `<name>`). A slug without an entry gets no tags.
const TAGS: Readonly<Record<string, readonly string[]>> = {
  'funding-precheck': ['Funding', 'Budget'],
  'sponsorship-and-funding': ['Sponsors', 'Budget'],
  'event-planning': ['Events', 'Planning'],
  'recruiting-qa': ['Recruiting', 'FAQ'],
  'showcase-qa': ['Events', 'Performances'],
  handoff: ['Onboarding', 'Minutes'],
  'usg-review-assistant': ['Funding', 'Review'],
  'meeting-recap': ['Meetings', 'Decisions'],
  'event-retrospective': ['Events', 'Archive'],
  'archery-getting-started': ['Archery', 'Joining'],
  'audition-guide': ['Auditions', 'Performances'],
};

export function agentTags(templateSlug: string): readonly string[] {
  const slug = Object.hasOwn(TAGS, templateSlug) ? templateSlug : baseSlug(templateSlug);
  return Object.hasOwn(TAGS, slug) ? TAGS[slug] : [];
}
