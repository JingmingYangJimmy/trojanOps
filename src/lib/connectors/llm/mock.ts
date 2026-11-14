// Owner: D (adapter); the real provider is chosen in WP-13. Vendor SDKs are imported only under
// src/lib/connectors/llm/ (I5). The mock runtime never calls this.
import type { LLMProvider } from '../../contracts';

export const mockLlm: LLMProvider = {
  async complete() {
    throw new Error('The mock LLM provider does not answer; the mock runtime runs without a model.');
  },
  priceUsdPerMTok() {
    return { input: 0, output: 0 };
  },
};
