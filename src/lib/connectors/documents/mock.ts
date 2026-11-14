// Owner: D. No external document store yet: uploads go through documents.library (§9).
import type { DocumentSource } from '../../contracts';

export const noDocumentSource: DocumentSource = {
  async list() {
    return [];
  },
  async read(externalId) {
    throw new Error(`No external document source is connected (asked for ${externalId}).`);
  },
};
