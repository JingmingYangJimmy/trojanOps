'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/contracts';
import { createClubTemplate } from '@/lib/distribution/create-template';
import { getActor } from '@/lib/identity';
import { NEW_TEMPLATE_MODELS } from '@/app/usg/templates/template-config';

export async function createClubAgentAction(orgId: string, _previous: { readonly error: string | null }, form: FormData): Promise<{ readonly error: string | null }> {
  const actor = await getActor();
  const officers = form.get('access') === 'positions';
  try {
    await createClubTemplate(actor, orgId, {
      name: form.get('name'),
      version: {
        purpose: form.get('purpose'), systemPrompt: form.get('systemPrompt'),
        ...(officers
          ? { audience: 'positions', usableBy: form.getAll('usableBy'), maxTier: 'officers' }
          : { audience: 'members', usableBy: [], maxTier: 'members' }),
        sourceKinds: form.getAll('sourceKinds'),
        tools: [], modelIds: NEW_TEMPLATE_MODELS.modelIds, defaultModelId: NEW_TEMPLATE_MODELS.defaultModelId, changelog: 'First version.',
      },
    });
  } catch (error) {
    if (error instanceof AppError) return { error: error.error.message };
    throw error;
  }
  revalidatePath(`/org/${orgId}`, 'layout');
  revalidatePath('/me/agents');
  redirect(`/org/${orgId}/admin?created=1#club-agents`);
}
