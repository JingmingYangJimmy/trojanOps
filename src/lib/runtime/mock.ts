// Owner: A. The mock runtime (§7): no model call. Lists the accessible documents, quotes the first
// sentence of up to three and adds the rule-pack line. Cost follows the chosen demo model class;
// a version with Cite sources off gets the same answer without citations (decision 30).
import { z } from 'zod';
import type { AgentResult, AgentRuntime } from '../contracts';
import { priceMicro } from '../gateway/prices';
import { mockHandoff } from './mock-handoff';

function firstSentence(text: string): string {
  const start = text.search(/^[^#\s].*/m);
  const paragraph = text.slice(Math.max(0, start)).split(/\n\s*\n/)[0].trim();
  return (paragraph.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0] ?? paragraph).trim();
}
/** A document above version 1 is named with its version, e.g. "USG Funding Department Guidelines (v2)". */
const titled = (d: { title: string; version?: number }) => (d.version && d.version > 1 ? `${d.title} (v${d.version})` : d.title);

/** Citations off (decision 30): the same answer without citations or their [n] markers. */
function withoutCitations(result: AgentResult): AgentResult {
  return { ...result, reply: result.reply.replace(/ ?\[\d+\]/g, ''), citations: [] };
}

export const mockRuntime: AgentRuntime = {
  async run(agent, actor, input, context) {
    const result = await answer(agent, actor, input, context);
    return agent.settings?.citeSources === false ? withoutCitations(result) : result;
  },
};

const answer: AgentRuntime['run'] = async (agent, _actor, input, { accessibleDocuments: docs }) => {
  const usage = { model: `demo-${agent.modelClass}`, inputTokens: 0, outputTokens: 0, costMicro: priceMicro(agent.modelClass) };
  if (agent.settings?.searchKnowledge === false) {
    return { reply: "**Placeholder answer.** The demo runtime doesn't call a model.\n\nThis agent answers without reading club documents.", citations: [], proposedActions: [], usage };
  }
  const financeRequest = /finance|financial|budget|expenses|sponsor/i.test(input);
  const handoffCase = agent.templateSlug === 'hacksc-handoff' || agent.templateSlug === 'handoff'
    || docs.some((doc) => doc.bodyMd.includes('## Previous event process'));
  if (financeRequest && handoffCase) {
    const financeDocs = docs.filter((doc) => /finance|financial|budget|expenses|sponsor/i.test(doc.title));
    if (financeDocs.length === 0) return { ...mockHandoff(input, []), proposedActions: [], usage };
    return {
      reply: ['**Demo answer · Mock runtime, no model call.**', ...financeDocs.map((doc, index) =>
        `### ${titled(doc)}\n\n${doc.bodyMd}\n\n[${index + 1}]`)].join('\n\n'),
      citations: financeDocs.map((doc) => ({ documentId: doc.id, quote: doc.bodyMd })),
      proposedActions: agent.tools.includes('submit_to_queue') && /\bsubmit\b/i.test(input) ? [{ tool: 'submit_to_queue', args: {} }] : [],
      usage,
    };
  }
  if (agent.templateSlug === 'hacksc-handoff' || docs.some((doc) => doc.bodyMd.includes('## Previous event process'))) {
    return {
      ...mockHandoff(input, docs), proposedActions: [],
      usage,
    };
  }
  const cited = docs.slice(0, 3);
  const lines = [
    "**Placeholder answer.** The demo runtime doesn't call a model.",
    cited.length ? `Here is the first sentence of each ${agent.settings?.citeSources === false ? '' : 'cited '}document this run could read:` : 'This run has no permitted documents to cite.',
    ...cited.map((d, i) => `${i + 1}. **${titled(d)}:** ${firstSentence(d.bodyMd)} [${i + 1}]`),
  ];
  if (agent.rulePack) {
    const pack = z.object({ annualCapUsd: z.number() }).safeParse(agent.rulePack.content);
    if (pack.success) lines.push(`${agent.rulePack.label} v${agent.rulePack.version} · annual cap $${pack.data.annualCapUsd.toLocaleString('en-US')}`);
  }
  return {
    reply: lines.join('\n\n'),
    citations: cited.map((d) => ({ documentId: d.id, quote: firstSentence(d.bodyMd) })),
    proposedActions: docs.length && agent.tools.includes('submit_to_queue') && /\bsubmit\b/i.test(input) ? [{ tool: 'submit_to_queue', args: {} }] : [],
    usage: { model: `demo-${agent.modelClass}`, inputTokens: 0, outputTokens: 0, costMicro: priceMicro(agent.modelClass) },
  };
};
