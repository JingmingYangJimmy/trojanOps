// Owner: D. Internal queue in place of EngageSC funding applications.
import { randomUUID } from 'node:crypto';
import type { ApplicationSink } from '../../contracts';

const queue: Array<{ externalId: string; application: unknown }> = [];

export const internalApplications: ApplicationSink = {
  async submit(application) {
    const externalId = `internal-${randomUUID()}`;
    queue.push({ externalId, application });
    return { externalId };
  },
};
