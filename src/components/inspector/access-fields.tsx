'use client';

// Owner: C. "Who can read" controls shared by the upload form and the Edit access dialog: the tier
// select, a sentence saying who that tier reaches, and officer positions for Officers. Checkboxes are
// named `allowedPositions`, so a form reads them with FormData.getAll.
import { fieldClass } from '@/components/inspector/field';
import type { Tier } from '@/lib/contracts';
import { tierOptions } from '@/lib/documents/library-view';

export function tierHint(tier: Tier): string {
  switch (tier) {
    case 'public': return 'Any signed-in student can read this document.';
    case 'members': return 'All club members can read this document.';
    case 'usg_internal': return 'Only USG reviewers and admins can read this document.';
    case 'officers': return 'The president always has access. Select additional officer positions.';
    default: { const exhaustive: never = tier; return exhaustive; }
  }
}

export function AccessFields({ orgKind, tier, onTierChange, positions, defaultPositions = [], disabled = false }: {
  readonly orgKind: 'usg' | 'rso';
  readonly tier: Tier;
  readonly onTierChange: (tier: Tier) => void;
  /** The org's officer positions; the president is always included and not listed. */
  readonly positions: ReadonlyArray<{ slug: string; name: string }>;
  readonly defaultPositions?: readonly string[];
  readonly disabled?: boolean;
}) {
  const options = tierOptions(orgKind);
  const choices = positions.filter((p) => p.slug !== 'president');
  return <>
    <label className="block space-y-1"><span className="font-semibold">Who can read</span>
      <select value={tier} disabled={disabled} onChange={(e) => { const option = options.find((t) => t.value === e.target.value); if (option) onTierChange(option.value); }} className={fieldClass}>
        {options.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
    </label>
    <p className="text-sm text-muted-foreground">{tierHint(tier)}</p>
    {tier === 'officers' && <fieldset className="space-y-2"><legend className="mb-2 font-semibold">Officer positions</legend>
      {choices.map((p) => <label key={p.slug} className="flex min-h-9 items-center gap-2"><input type="checkbox" name="allowedPositions" value={p.slug} defaultChecked={defaultPositions.includes(p.slug)} disabled={disabled} className="size-4 accent-primary" />{p.name}</label>)}
      {!choices.length && <p className="text-sm text-muted-foreground">This organization has no other officer positions.</p>}
    </fieldset>}
  </>;
}

/** The checked officer positions in a form, or none unless the tier is Officers. */
export function checkedPositions(form: HTMLFormElement, tier: Tier): string[] {
  if (tier !== 'officers') return [];
  return new FormData(form).getAll('allowedPositions').filter((p): p is string => typeof p === 'string');
}
