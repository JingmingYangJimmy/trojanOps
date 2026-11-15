'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AppError } from '@/lib/contracts';
import { createUsgTemplate } from '@/lib/distribution/create-template';
import { distribute } from '@/lib/distribution/distribute';
import { getActor } from '@/lib/identity';
import { NEW_TEMPLATE_MODELS } from './template-config';

export async function createTemplateAction(_previous: { readonly error: string | null }, form: FormData): Promise<{ readonly error: string | null }> {
  let templateId: string;
  const actor = await getActor();
  const officers = form.get('access') !== 'members';
  try {
    const created = await createUsgTemplate(actor, {
      name: form.get('name'), target: form.get('target'), distribution: form.get('distribution'),
      version: {
        purpose: form.get('purpose'), systemPrompt: form.get('systemPrompt'),
        ...(officers ? { audience: 'positions', usableBy: ['treasurer', 'president'], maxTier: 'officers' } : { audience: 'members', usableBy: [], maxTier: 'members' }),
        sourceKinds: form.getAll('sourceKinds'),
        tools: [], modelIds: NEW_TEMPLATE_MODELS.modelIds, defaultModelId: NEW_TEMPLATE_MODELS.defaultModelId, changelog: 'First version.',
      },
    });
    templateId = created.templateId;
  } catch (error) {
    if (error instanceof AppError) return { error: error.error.message };
    throw error;
  }
  // A default template can go out with its first version. If distribution fails, the template page
  // shows it undistributed with its Distribute action, so creation still lands there.
  if (form.get('distributeNow') === 'on' && form.get('distribution') === 'default') {
    try { await distribute(actor, templateId); } catch (error) { if (!(error instanceof AppError)) throw error; }
  }
  revalidatePath('/usg/templates');
  redirect(`/usg/templates/${templateId}`);
}
