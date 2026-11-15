# Chat and knowledge-base UX research

Scope: what a credible agent chat page and knowledge-base (RAG) pages look like in 2026, and how our
permission tiers, per-run grants, inspector and quota should show up in them. Recommendations are
sized for a demo on the mock runtime tomorrow, with the post-WP-13 shape noted separately.

Source tags: `[S12]` points to the source list at the end. "(summary)" means the claim comes from a
search-engine summary of that page because the page itself refused automated fetches. `unverified`
means no primary source was found.

---

## 1. Bottom line

1. **No university platform and no student-org product found has what we have.** Campus AI
   platforms offer a builder plus coarse sharing (private, invited people, whole campus). None found
   offers club-scoped agents, position-based document tiers, a per-run explanation of access, or
   club-billed quota. The student-engagement vendors (CampusGroups, Anthology Engage) offer no
   student-facing assistant; CampusGroups' only AI feature is an admin analytics tool [S25]
   (summary). The niche is open, so the demo should lead with the permission story, not with
   chat polish.
2. **The chat page needs about eight small fixes to stop looking unfinished.** None needs a
   contract change: Enter to send, copy, visible numbered sources, retry on error, starters in the
   empty state, a privacy line, a quota line by the composer, and a plain statement that each run
   stands alone. Skip streaming, stop, thumbs, attachments and a conversation sidebar for tomorrow.
3. **Show access in three places on every answer**:
   - before the first run, a scope line ("what this agent can read, as you");
   - on each citation, a tier chip plus a reason;
   - on the answer, the highest tier it read, a pattern Microsoft 365 Copilot uses with
     sensitivity labels [S65][S66] (summary).

   Glean, Open WebUI and the campus platforms filter silently. We explain.
4. **For the knowledge-base pages, copy Dify's vocabulary and layout but tie every number to
   permissions.** For tomorrow:
   - a document detail panel: who can read it, which agents can read it and why, and how often
     runs cited it;
   - an upload confirmation that names who gains access.

   After WP-13: a Retrieval test that runs "as" a position and lists the chunks that permissions
   kept out.

---

## 2. Feature matrix

Priority means priority for a credible chat demo tomorrow:
- **Must**: missing it looks broken or dishonest.
- **Nice**: cheap polish.
- **Skip**: not for tomorrow.
- **Ours**: a differentiator we already have or should extend.

The Open WebUI / LibreChat column stands for the campus deployments built on them: Stanford AI
Playground runs on LibreChat [S14] (summary), and Duke's MyGPT Builder is a dedicated Open WebUI
instance [S15].

| Feature | ChatGPT | Claude.ai | Gemini Notebook (NotebookLM) | Open WebUI / LibreChat | Dify web app | Glean | Us today | Priority |
|---|---|---|---|---|---|---|---|---|
| Streaming tokens | Yes | Yes | Yes | Yes | Yes | Yes | No (single JSON response) | Skip (mock answers instantly; needed at WP-13) |
| Stop generating | Yes | Yes | Yes | Yes | Yes ("Stop Run" [S53]) | Yes | No | Skip |
| Regenerate / run again | Yes; edit history moved behind "See versions" in 2026 [S29] (community reports) | Yes | Yes | Yes, plus fork [S40] | Yes ("Regenerate" [S53]) | Yes | No | Nice: "Run again" shows the cost of the new run |
| Edit and resend | Yes | Yes | No | Yes [S40] | Yes | Yes | No | Nice: "Edit" on the last "You" turn puts its text back in the composer |
| Copy answer | Yes | Yes | Yes; "Save to note" [S33] | Yes | Yes ("Copy" [S53]) | Yes | No | **Must** |
| Markdown and code rendering | Yes | Yes | Yes | Yes | Yes | Yes | Plain text only | Skip now; **must** at WP-13 (safe Markdown, no raw HTML) |
| Inline citation markers | Yes; hover shows a preview on desktop [S26] (summary) | Yes, web search | Numbered; hover shows the full quote [S33] | Yes, web and RAG [S37] | "CITATIONS" block under the answer [S53] | Yes | No | **Must**, as numbered chips after the answer (the mock can't place markers inline) |
| Quote preview | Hover | Hover | Hover shows the quote; click scrolls the source to it [S33][S34] | Click shows the chunk | Popover: "Characters:", "Retrieval count:", "Retrieval Score:", "Link to Knowledge" [S53] | Yes | Quote hidden behind a disclosure | **Must**: show the quote on hover or focus of the chip |
| Source panel | "Sources" sidebar [S26][S27] (summary) | Yes | Sources panel with per-source checkboxes [S33] | Source list under the answer [S37] | Citations block | Results list | Inspector "Read in this run" | **Ours**: link chip to inspector row (cross-highlight) |
| Jump to passage | No | No | Yes [S33] | Partial | No | Opens the document | No | Nice: highlight the verified quote in the document panel (§5.2) |
| Starters and empty state | GPT conversation starters [S67] | Project and suggested prompts | Suggested questions | Prompt suggestions | "Opener Message" and "Opening Questions" [S53] | Suggested prompts | "No runs yet…" text, no starters | **Must**: 3 starters per agent |
| Follow-up suggestions | Some | No | Yes | Follow-up prompts | "Follow-up" / "Try to ask" [S53] | Yes | No | Skip |
| Conversation list and history | Yes | Yes | Per notebook; "Chat history is kept private to you" [S33] | Yes; temporary chats, archive, search [S12][S40] | "Pinned" / "Recent" [S53] | Yes | Memory only; "Leaving this page clears the conversation" | Skip a sidebar; Nice after demo: "Your recent runs" (own runs only) |
| Multi-turn context | Yes | Yes | Yes | Yes | Yes | Yes | **No**: each run is single-turn | **Must**: say so in the UI (§4) |
| Privacy statement in UI | Settings | Settings | In help | Stanford states data stays in Stanford systems [S12] | No | No | No | **Must**: one line, see §4 |
| Feedback (thumbs) | Yes | Yes | Yes | Yes; feeds an admin leaderboard [S39] | "Provide Feedback" [S53] | Yes | No | Skip (needs a table; schema is frozen) |
| File attachments | Yes | Yes | Sources only | Yes | Optional | Yes | No | Skip: it bypasses the document permission model |
| Enter sends, Shift+Enter newline | Yes | Yes | Yes | Yes | Yes | Yes | Ctrl+Enter sends; Enter adds a newline | **Must**: Enter sends, Shift+Enter newline, Ctrl/Cmd+Enter kept, IME guard |
| Error with retry | "Retry" | "Retry" | Retry | Retry | Retry | Retry | Banner with "Dismiss" only | **Must**: "Try again" re-sends the last message (not for quota or permission errors) |
| Usage shown before the limit | Plan page | Usage page shows session use and time left [S30] (summary) | No | LibreChat balance as credits, currency or percent [S41] | No | No | Quota left appears in the inspector only after a run | **Must**: quota line by the composer |
| Limit reached message | Yes | Warning near the limit, then the time you can resume [S30][S31] (summary) | Yes | Yes | No | No | §11 copy in the error banner | **Ours**: add the reset time and who can raise it |
| Model choice | Yes | Yes | No | Yes, plus side-by-side compare [S12][S36] | Set by the builder | No | Set by USG and the template | Skip a picker; Nice: show "Model class: Economy" in the inspector |
| Assistant scope statement | GPT description | Project knowledge list | Source list | Admin-defined | Knowledge list in the builder only | No | Inspector placeholder before the first run | **Must**, see §6.1 |
| Permission-aware retrieval | Enterprise connectors | Enterprise connectors | Per notebook | User access applies on top of model scope; "silently excluded" [S38] | Dataset-level "Only me / All team members / Partial team members" [S53] | Query-time check against mirrored ACLs [S61][S62] | RLS on run grants, sources and max tier | **Ours** |
| Explains why a document was or wasn't read | No | No | No | No | No | Admin "Document lookup" only [S63] | Inspector "Blocked by rule" (president, USG) and preview matrix | **Ours**: extend to every citation |
| Access label per citation | No | No | No | No | No | No | Tier chip in inspector only | **Ours**: chip on each citation plus "highest tier read" on the answer (Copilot pattern [S65]) |
| Cost per answer | No | No | No | Admin token stats [S40] | No | No | "Read 3 documents · $0.01" | **Ours**: keep |
| Human confirmation of writes | Some | Some | No | Some | No | Some | Pending actions with Confirm / Reject | **Ours**: keep |
| Named progress | "Searching…" | Tool steps | No | Status steps | "Thinking…" [S53] | Steps | "Checking access" | **Ours**: add a finished-run trace (§4) |

Perplexity was in the brief. Its numbered inline citations and expandable source list match ChatGPT
and Gemini. Every page found about it was third-party, so its details are `unverified` and it has
no column.

---

## 3. University platforms

| Platform | Builder and grounding | Citations | Sharing / access scopes | History and privacy | Limits shown | Models |
|---|---|---|---|---|---|---|
| ASU CreateAI Builder and CreateAI Chat [S1][S2][S3][S5] | Chat: 40+ models, "Pre-loaded with ASU knowledge", uploads. Builder: no-code; knowledge base of files, URLs, Google Drive; "Top K"; retrieval type "Chunk / Neighbor / Document" | Not documented | Private; named people by ASURITE; or the toggle "Allow everyone at Arizona State University to view", which lists the project in the Marketplace with no review step | Files students upload in chat are session-only and never join the bot's knowledge base [S4] (summary) | Not documented | 50+ LLMs; students get fewer |
| U-M Maizey / U-M GPT [S6][S7][S8][S9] (summary; ITS pages block automated fetches) | Maizey: up to 50 data sources per project; weekly or monthly reindexing | Maizey cites retrieved material; a "Return data sources in responses?" setting exists | Project-based | Not documented | U-M GPT: about 25 prompts per hour for the top model (75/hour on older pages), 10 images per hour, 10 files of 10MB per conversation | Several |
| Harvard AI Sandbox [S10][S11] | Multi-model; files | Not documented | Harvard only | 2023 launch: prompts "viewable only to that individual"; the current privacy statement lists chat history among the data Harvard may access (summary). The two conflict. | Vendor rate limits forced a phased rollout | Several vendors |
| Stanford AI Playground (LibreChat) [S12][S13][S14] | Agents list ("Financial Info Navigator", "Admin Guide Search"…); "Upload for File Search"; memories on by default | Web search adds linked sources | Shareable links, visible to signed-in Stanford users only | Temporary chats deleted after 30 days; archive; "Clear all chats"; feedback ratings never train models | Not on the page | Several vendors, mid-chat switching, side-by-side compare |
| Duke [S15][S16] | MyGPT Builder is a dedicated Open WebUI instance; uploads under 4MB; AI Gateway on LiteLLM | Open WebUI defaults | Individuals and groups (classes, departments) | Not documented | Not documented | Several |
| UC San Diego TritonGPT [S17] | Prebuilt assistants ("UC San Diego Assistant", "Fund Manager Coach") with a listed source collection; Projects | "Responses include links so you can review the source directly" | "Department-specific or private assistants may only appear for authorized users"; data "continues to depend on your assigned permissions" | Not documented | Not documented | Not documented |
| UC Irvine ZotGPT Creator [S18][S19] | Up to 10 assistants per staff member; students get "Limited creation rights" | "Cites the exact page number in every answer" | "Invite Only" / "UCI Internal" / "Public (Approval Required)" | ClassChat lets instructors oversee student conversations | "Set usage limits with guardrails" (no values given) | GPT-4.1, Claude Sonnet 4.6, Mistral 3 Large |
| NYU [S23] (summary) | Gemini, NotebookLM, Gems; "NYU Private GenAI" for approved research use | Vendor defaults | Shared class notebooks | Signed in with an NYU NetID, Gemini and NotebookLM don't train on, log or save your data | Not documented | Vendor models |
| UF NaviGator [S24] | Chat, Toolkit, Assistant, Builder | Not documented | Not documented | Conversations inactive for 366 days are deleted; "Deleted conversations cannot be restored" | Not documented | Several |
| USC [S20][S21][S22] | ChatGPT Edu (since Jan 13, 2026), Copilot Chat, Gemini with Gems, Gemini Notebook (50 sources per notebook), Enterprise Claude bought per department, **Trojan AI Gateway** (test environment with ITS-paid monthly credits; production billed to the sponsoring department) | Vendor defaults | Vendor workspaces | Policy bars confidential data | ChatGPT Edu: Deep Research 5 per day, images 3 per day | Vendor models |

What this means for us:

- **Every campus builder shares at the same coarse scopes:** private, invited people, the whole
  campus, sometimes public with approval. Our three audiences map onto these directly: All
  students, All members, named positions. Use the ZotGPT and ASU wording as evidence that admins
  will recognise the model.
- **Nobody tiers documents inside one assistant.** TritonGPT comes closest, with assistants that
  appear only to authorised users and data that "depends on your assigned permissions" [S17]. Even
  there, the assistant either appears or doesn't; it never says which documents it left out.
- **Privacy language is a selling point on campus.** Universities state it plainly: Harvard
  (viewable only to that individual), Gemini Notebook (history private to you), Stanford (data stays
  in Stanford systems). I15 is already this promise, so put it on the page.
- **The counter-example is ZotGPT ClassChat,** where instructors oversee student conversations
  [S19] (summary). Our answer: presidents and USG see run metadata, never questions or answers.
  Say so.
- **Limits are shown as counts per hour or per day.** U-M GPT counts prompts per hour; ChatGPT Edu
  counts per day. Nobody shows money or who pays. Our "$0.04 left today, billed to Startup Club" is
  new. Keep it in dollars, because that is the unit USG allocates.
- **Gemini Notebook is the new name of NotebookLM** in USC's and Google's own pages [S20][S33].
  Use "Gemini Notebook (formerly NotebookLM)" in any slide.

---

## 4. Chat page: changes for tomorrow

All of these fit `RunWorkspace` and `Transcript` (stream C), are reused by `/directory/[installationId]`
(D), and need no change to `contracts.ts` or §14 routes unless noted.

1. **Keyboard.**
   - Enter sends. Shift+Enter adds a newline. Ctrl/Cmd+Enter keeps working.
   - Ignore Enter while `event.nativeEvent.isComposing` is true, or Chinese and Japanese IME users
     send half-typed text.
   - Hint text: "Enter to run · Shift+Enter for a new line". This matches ChatGPT, Claude and
     RAGFlow [S59].
2. **Say that runs stand alone.** The contract is single-turn, but users of every product in the
   matrix expect memory.
   - Under the composer, replace the current hint with: "Each run answers on its own. The agent
     doesn't see earlier messages."
   - Optional section title above the transcript: "Runs in this session".
   - Multi-turn needs `AgentRuntime.run(… input: string …)` to take messages: a contract PR for
     after the demo.
3. **Privacy line**, replacing "Leaving this page clears the conversation":
   - "Only you can see what you ask and what the agent answers. Startup Club's president and USG
     see that you ran it, when, what it cost and which documents it read."
   - That matches `agent_runs_meta`, which keeps every column except `input` and `output` (I15).
   - Keep "Leaving this page clears these runs" as a second sentence while the transcript is
     memory-only.
4. **Numbered sources, visible by default.**
   - After each answer, list sources as chips: `[1] Recruiting FAQ · Public`,
     `[2] Meeting minutes 2026-10-08 · Members`.
   - Hover or focus opens a popover with the title, the tier chip, the quote, and one line of why
     (§6.2).
   - Clicking a chip highlights the matching row under "Read in this run" in the inspector.
   - Keep "Demo runtime: placeholder answer" as its own neutral chip. Don't hide the sources
     behind it.
   - Popovers use `shadow-overlay` and a 4px radius. Chips are buttons with a visible focus ring.
     Escape closes.
5. **Copy.** A ghost "Copy" button under each answer. After a click, the label reads "Copied" for
   2 seconds, announced in the existing `aria-live` region. Copy the reply text, plus the source
   titles when there are any.
6. **Retry.**
   - When the run fails with `network` or a 5xx, the banner gets a "Try again" button that re-sends
     the failed "You" turn's text, which is still in the transcript.
   - No retry for `quota_exceeded`, `forbidden` or `unauthenticated`; those keep their own copy.
7. **Quota by the composer**, from `remaining()`, read server-side when the page loads:
   - Line: "Quota left: $0.04 today · about $0.01 per run · billed to Startup Club".
   - At 80% or more used, add the attention chip "80% used".
   - When blocked, the §11 message plus its fix:
     - `student_daily`: "It resets at midnight PT."
     - `member`: "Ask your president to raise it."
   - Claude also shows the time you can resume [S30] (summary). We have it for `student_daily`
     (midnight PT); for monthly scopes, use "resets Dec 1, 2026".
8. **Empty state with starters.**
   - Lines: "Club handoff answers from the Startup Club documents you can read: minutes, past
     events, public pages and, for officers, finance." Then "Try:".
   - Then three buttons that fill the composer without sending:
     - Recruiting Q&A: "When is the next info session?", "Do I need experience to join?"
     - Club handoff: "What did we decide at the Oct 8 meeting?"
   - Dify calls these "Opening Questions" [S53]; GPTs call them conversation starters.
   - With no contract field yet, keep a small `starters` map keyed by template slug in the page,
     marked `TODO(verify):`. After the demo, add `starters` to the template version.
9. **A finished-run trace instead of fake streaming.**
   - The gateway returns one response, so don't animate steps that already happened.
   - After a run, show a three-line trace at the top of the inspector, built from `RunInspector`:
     - "Checked access · 2 grants: Any signed-in student, Startup Club · Member"
     - "Read 3 of 4 permitted documents"
     - "Billed Startup Club $0.01 · audit #1042"
   - It plays the role of Dify's "TRACING" view and fits the progress-naming rule.

Nice-to-have, if time is left:
- "Edit" on the last "You" turn.
- "Run again" (the label shows "$0.01").
- "Model class: Economy" in the inspector's Versions section. The data is in `EffectiveAgent`, not
  in `RunInspector`, so it needs an inspector contract field.

Skip for tomorrow:
- streaming;
- stop;
- thumbs (needs a table);
- attachments, which would bypass tiers;
- a conversation sidebar;
- share links, which conflict with I15.

---

## 5. Knowledge-base pages: patterns worth copying

### 5.1 What the references do (current UI strings where verified)

**Dify, classic Knowledge** (UI strings from the main branch [S53]; docs [S42]–[S48])

- **Creation is a three-step wizard:**
  1. "Data Source";
  2. "Document Processing": "General" or "Parent-child" chunk mode, "Delimiter" (`\n\n` for
     paragraphs), "Maximum chunk length", "Chunk overlap" (10–25% advised), "Text Pre-processing
     Rules", "Index Method" ("High Quality" / "Economical"), "Retrieval Setting";
  3. "Execute & Finish".

  The right side shows "Preview Chunk" with "{count} Estimated chunks". Chunk mode can't change
  after creation; length and delimiter can [S42].
- **Parent-child:** "Child-chunk for Retrieval" and "Parent-chunk for Context". Search runs over
  child chunks and returns the parent. The parent is "Paragraph" or "Full Doc"; Full Doc reads
  only the first 10,000 tokens [S42].
- **Retrieval settings:**
  - "Vector Search", "Full-Text Search", "Hybrid Search";
  - for Hybrid, "Weighted Score" with "Semantic" / "Keyword" sliders, or a "Rerank Model";
  - "Top K" defaults to 3 and "Score Threshold" to 0.5. The docs say both apply only in the
    rerank phase [S43][S47].
- **Indexing progress:** "Embedding waiting...", "Embedding processing...", "Embedding
  completed", "Embedding paused", "Embedding error", with "Pause" and "Resume". A plan-limit
  error says why and what to do: "Document received, but estimated vector storage is … above
  your plan limit … so no vectors were written" [S53].
- **Document list:**
  - Columns: "NAME", "CHUNKING MODE", "WORDS", "RETRIEVAL COUNT", "UPLOAD TIME", "STATUS",
    "ACTION".
  - Statuses: "Queuing", "Indexing", "Paused", "Error", "Available", "Enabled", "Disabled",
    "Archived".
  - Actions: "Chunking Settings", "Sync", "Archive", "Download", "Delete", "Generate summary".
  - Empty state: "There is no documentation yet" [S53].
  - Inactive documents are auto-disabled after 7 or 30 days, depending on plan [S45].
- **Chunk list:**
  - Cards show "Chunk-NN", a character count, "Retrieval count", "KEYWORDS" and an "EDITED"
    marker.
  - Each chunk has an enable/disable switch, plus "Add Chunk", "Batch add" (CSV) and a status
    filter. A disabled chunk can't be edited.
  - Parent-child adds "Regenerate child chunks" with an overwrite warning [S45][S53].
- **Retrieval Test** ("hit testing"):
  - Input: "Source text", "Up to 200 characters", placeholder "a short declarative sentence is
    recommended", button "Test", and a "Retrieval Setting" override that lasts only for the
    session.
  - Results: "{n} Retrieved Chunks", each with a score and "Open" for "Chunk Detail";
    parent-child adds "Hit {n} child chunks".
  - Empty: "Retrieval Testing results will show here".
  - "Records" table: "Source", "Query Content", "Time". It logs both test queries and real app
    retrievals [S44][S53].
- **Metadata:**
  - Built-in fields: `document_name`, `uploader`, `upload_date`, `last_update_date`, `source`.
  - Custom fields are String, Number or Time.
  - App-level filtering: "Disabled", "Automatic" or "Manual", with typed operators and AND/OR
    [S46][S47].
- **In the app:** turn on "Citations and Attributions" ("Show source document and attributed
  section of the generated content"). The answer then gets a "CITATIONS" block. Hovering a
  document shows its segments with "Characters:", "Retrieval count:", "Retrieval Score:",
  "Vector hash:" and "Link to Knowledge" [S53].
- **Permissions are per knowledge base:** "Only me", "All team members", "Partial team members".
  The no-access empty state names who to ask: "No accessible knowledge bases. Contact the resource
  maintainer or your Workspace Owner to request access" [S53]. Access is never per end user or
  per document.

**Dify, Agent Knowledge Base (beta, 2026)** [S49]–[S52]

- A reasoning model builds "Contents" (an outline) and "Section summaries". Chunks are capped at
  1,200 characters; a table gets one chunk per row.
- Status "Ready"; actions "Sync now" and "Re-index".
- "Retrieval depth": "Fast", "Deep" (follows a knowledge graph) or "Research" (splits the
  question into sub-questions).
- The "Retrieval Test" page has "Keep golden question", where you tick the chunks that must come
  back and choose all or any. "Make bad case" records "Retrieval miss" or "Low score". Bad cases
  wait under "Quality" > "Bad cases" with "Replay".

**RAGFlow** [S54]–[S59]

- The parse method is a per-document template: "General", "Q&A", "Manual", "Table", "Paper",
  "Book", "Laws", "Presentation", "Picture", "One", "Audio", "Email".
- **Document list:** "Name", "Upload date", "Enabled", "Chunks", "Metadata", "Parse", "Action".
  - Parse status: waiting, running, completed, failed or canceled, with a "Logs" view.
- **Chunk view:** chunks on one side, the original document on the other. Clicking a chunk's
  text scrolls the preview to its source location. Each chunk carries keywords, questions, tags
  and an enabled state.
- **Retrieval testing:**
  - Settings: "Similarity threshold" (default 20%), "Keyword similarity weight", "Rerank model",
    "Cross-language search", "Metadata", "Rerank candidates" (64–256), "Top N", and a "File"
    filter on the results.
  - Its debugging order is worth copying as help text: parsing → chunk → metadata → retrieval
    parameters.
- **Chat:**
  - "Show citations" switch.
  - "Empty Response" sets a fixed reply when retrieval finds nothing, e.g. "No relevant content
    was found in the dataset…".
  - Files uploaded in chat are "supplemental context only and are not automatically added to a
    Dataset".
- Dataset permissions are "Only me" or "Team".

**FastGPT** [S60]

- Source filenames under the answer open a "Chunk Reader" with the matched excerpt highlighted,
  "1/2" navigation between matches, and "Open original" / "Go to knowledge base".
- Share links have visitor permissions: "View citation snippets", "View full citation" and
  "Download/open source original text". Citation depth is set per audience, which is the closest
  match to our tiers.

**Gemini Notebook (NotebookLM)** [S33][S34]

- Hovering a citation shows the full quoted text; selecting it opens the quote in context in
  the source viewer.
- Source checkboxes choose which sources the answer may use.
- "Save to note" keeps citations.
- Chat history is private to you even in a shared notebook.

**Open WebUI** [S37][S38]

- Knowledge attaches to a model, folder or chat ("scoped access"). "The user's own access still
  applies on top." Files the user can't read "are silently excluded from results."
- Each attachment is "Using Focused Retrieval" or "Using Entire Document".
- Admin settings: "Chunk Size", "Chunk Overlap", "Chunk Min Size Target", Markdown header
  splitting, hybrid BM25 plus reranker, relevance threshold.

**Glean** [S61]–[S64]

- Permissions are checked at query time against ACLs mirrored from each source. "A coworker with
  different permissions … might see different responses for the same query."
- Admins have "Document lookup": enter a "Document URL" and optionally a "User", then see "Last
  crawled", "Last indexed", "Document visibility on Glean" and "Document access".

**Microsoft 365 Copilot and Copilot Studio** [S65][S66] (summary)

- Each citation shows the source file's sensitivity label, and the latest response shows the
  highest-priority label among the sources it used.
- Copilot Studio agents show a shield with the highest label used, plus a label on each cited
  file.

### 5.2 Our screens

Ground rules from the spec:
- No retrieval code before WP-13.
- Chunks, when they exist, copy the document's `read_grants` and get the same RLS (§17).
- Every quote is checked as a substring of its document (§17).

So for tomorrow, build only what uses data we already have.

**A. Documents table, `/org/[orgId]/documents` (C). Tomorrow.**

- **Add "Who can read".** Use the audience vocabulary: "All students" (Public), "All members"
  (Members), "Treasurer, President" (Officers with positions). It replaces raw tier as the main
  cell; the tier chip stays.
- **Add "Agents".** Show "2 of 4 agents" as a link to the document panel (B). Computed with
  `explainAccess` against each installation.
- **Add "Cited, last 30 days"**, right-aligned and tabular. Count `cited_document_ids` in
  `agent_runs_meta`: metadata only, so I15-safe. This is Dify's "RETRIEVAL COUNT", tied to real
  runs.
  - `TODO(verify):` the query belongs to C, and president-only visibility should match the audit
    view's rule.
- **Leave out a Status column until WP-13.** A permanent "Ready" would be fake. At WP-13 use icon
  plus word:
  - "Queued" (clock);
  - "Indexing · 12 of 30 chunks";
  - "Ready" (check);
  - "Failed": say why and how to fix, e.g. "Couldn't read page 3. Upload a text-based PDF.";
  - "Disabled".

**B. Document panel. Tomorrow, as a Sheet on the documents page; no new §14 route.**

Open it from a row click or the "Agents" link. Sections:
1. **Header:** title; tier chip; source ("Finance"); version; "Uploaded Nov 14, 2026, 3:10 PM PT
   by Sam". Use the seed's own names.
2. **Who can read it:** "Treasurer, President of Startup Club". Below: "Members without these
   positions see it as Restricted document."
3. **Agents that can read it:** one row per installation, with the decision chip and a reason.
   - "Funding pre-check · Allowed · within its Finance source and Officers max tier".
   - "Club handoff · Allowed for Treasurer and President runs only".
   - "Recruiting Q&A · Outside agent sources · this public agent reads the Public source only".
   - "Event planning · Outside agent sources · reads Minutes and Archive only".
   - Seed note: no seed document hits "Above agent max tier". An Officers document in Minutes
     would show it for Event planning (max tier Members).
   - Same labels and icons as `access-labels.ts`.
4. **Cited in runs:** "Cited in 7 runs since Nov 1, 2026. Last cited Nov 15, 2026, 10:42 AM PT
   by Club handoff". No user names or run content.
5. **Text:** the document body. When opened from a citation, highlight the verified quote
   (NotebookLM and FastGPT pattern) and scroll to it. Only link a citation here when the viewer
   can open this club's library. Lee, a non-member using a directory agent, gets the quote
   popover only.

**C. Upload confirmation. Tomorrow; strongest cheap differentiator.**

Before "Upload", show who gains access, using the rule "say who gains access before publishing".
- "Spring 2026 budget will be readable by Treasurer and President."
- "Agents that will be able to read it: Funding pre-check, Club handoff (Treasurer and President
  runs only)."
- "Recruiting Q&A and Event planning can't read it: outside agent sources."

This is Dify's step 3 "Execute & Finish", turned from an indexing receipt into an access
receipt.

**D. Permission preview, `/org/[orgId]/preview` (C). Tomorrow, small additions.**

- **Row header click → "What Member sees":** the Documents section of the inspector (Permitted /
  Not granted) for that row, so the preview and a real run look the same.
- **Optional "Access checks" panel** listing the §10 visibility contract rows for this club as
  pass/fail. It is Dify's "golden questions" idea applied to permissions.
  - Example: "Casey (member) · Club handoff → Meeting minutes Allowed, Spring 2026 budget Not
    granted · Matches database".
  - It proves `explainAccess` agrees with RLS live on stage.
  - `TODO(verify):` needs a server-side run of `listAccessibleDocuments` per persona; owner C.

**E. Retrieval test. After WP-13; sketch only.** Dify's "Retrieval Test", run as a person.

Left column (form, max 640px):
- "Agent": select, e.g. Club handoff.
- "Test as": select with "Any signed-in student", "Member", "Treasurer", "President". These are
  the same subjects as the preview matrix.
- "Question": textarea, up to 200 characters. Help text: "Ask it the way a member would."
- "Retrieval settings · this test only": collapsed; Top K 3, score threshold 0.5. Same names as
  Dify; changes are session-only.
- Primary button: "Test retrieval".

Right column:
- Header: "3 chunks retrieved for Member".
- Cards: rank, score (tabular), document title + tier chip, chunk text with the matched passage
  bold, and "Open in document", which goes to panel B with the chunk highlighted.
- **"Kept out by permissions"** (the differentiator), president and USG only, with titles under
  the viewer's RLS:
  - "2 chunks scored higher but were not available to Member: Spring 2026 budget (Officers · Not
    granted)."
  - For a public agent: "1 chunk from Meeting minutes 2026-10-08 is outside Recruiting Q&A's
    sources."
- Empty state: "No chunks scored above 0.5 for Member. Lower the threshold for this test, or check
  that the answer is in a document Member can read."
- "Records": session-only table with "Time", "Agent", "Tested as", "Question", "Chunks". No
  storage until a table is agreed, because questions are user content.

**F. Chunk list. After WP-13.** Dify chunk cards plus RAGFlow's split view.

- Header line: "18 chunks · inherit Officers · Treasurer, President". Say it once; chunks never
  carry their own access.
- Cards: "Chunk 03 · 412 characters · Retrieved 7 times", an Enabled switch, and "Edited" when
  changed.
- Clicking a card scrolls the source text to it.
- Chunk settings stay in one collapsed "Chunk settings" block: "Delimiter", "Maximum chunk
  length", "Chunk overlap". Same labels as Dify; "General" mode only. Parent-child is not worth
  it for single-page club documents.

---

## 6. What fits our angle: "why this agent could or couldn't read this"

Principle: **say what the agent can reach, as this person, before, during and after the run.
Never reveal a title the viewer can't read.** Glean, Open WebUI and the campus platforms filter
silently [S38][S62]. Copilot labels sensitivity but doesn't explain grants [S65]. Explaining the
path is ours.

### 6.1 Before the first run: a scope line under the page header (everyone)

Build it from `EffectiveAgent` (sources, max tier) and the capped grants (`capGrants`). No
document titles, so nothing leaks.

- Casey · Club handoff: "Reads Startup Club's Public, Minutes, Archive and Finance documents.
  Runs as you (Startup Club · Member), so it reads Public and Members documents. Officer
  documents need an officer position."
- Lee · Recruiting Q&A (directory): "This public agent reads only Startup Club's Public
  documents, whoever runs it. Runs billed to Startup Club."
- Taylor · Funding pre-check: "Reads Startup Club's Finance documents and the USG rulebook, up to
  the Officers tier. Runs as you: Startup Club · Treasurer."
- These match the seed's `sourceKinds` and `maxTier` per template. `TODO(verify):` the display
  names of sources.

Fill the inspector's "Run grants" and "Sources" sections before the first run too. They don't
depend on the input. This replaces the placeholder and makes the inspector useful at zero
clicks.

### 6.2 On each citation: tier chip plus one line of why

The popover adds a reason by tier. It can be derived from the tier and `runGrants` labels with no
contract change. At WP-13, add the matched grant to `RunInspector.permitted` for an exact reason.

| Tier | Reason line |
|---|---|
| Public | "Public: readable by any signed-in student." |
| Members | "Members: readable through your Startup Club membership." |
| Officers | "Officers: readable through your Treasurer position." |
| USG internal | "USG internal: readable through your USG position." |

### 6.3 On each answer: the highest tier it read (Copilot pattern)

A chip beside "Read 3 documents · $0.01", using the tier's own icon and the lock icon:
- "Uses Members information";
- "Uses Officers information".

Shown only when that tier is above Public. Hover text: "This answer quotes Spring 2026 budget
(Officers). Check before sharing it outside the officer team." It costs one `max()` over
`readInRun` tiers and reminds users not to paste officer answers into a public group chat.

### 6.4 Blocked documents

- **President and USG admin:** this already ships in "Blocked by rule". Add one line per reason,
  naming who can change it:
  - "Not granted: change who can read it on Documents."
  - "Above agent max tier: set by the USG template. Ask USG to change it."
  - "Outside agent sources: add the source in the catalog, if the template allows it."

  This follows the "No permission: who has access and how to ask" state rule.
- **Members and students** get no titles and no counts. `inspector.blocked` is `undefined` for
  them by design. When an answer cites nothing, show the RAGFlow "Empty Response" idea in our
  words: "Club handoff found nothing it can read for you on this. Some club documents are
  limited to officers. Ask Sam, Startup Club's president, if you need them." The president's
  name is public club information; `TODO(verify):` that the page has it.
- **No documents at all:** "Recruiting Q&A could read no documents for this run." Give the reason
  from the scope line.

### 6.5 Quota, same language everywhere

- Chat composer: "$0.04 left today · billed to Startup Club" (§4.7).
- Inspector: unchanged.
- The club home and catalog already use the meters; reuse the 8px bar, Cardinal fill and the
  "80% used" chip.

---

## 7. Sources

University and campus:
- [S1] ASU CreateAI Builder: https://ai.asu.edu/ai-tools/createai-builder
- [S2] ASU, how to use the knowledge base (RAG): https://ai.asu.edu/technical-foundation/articles-and-documentation/how-use-knowledge-base-rag
- [S3] ASU CreateAI Builder Marketplace: https://ai.asu.edu/introducing-createai-builder-marketplace
- [S4] ASU, student file uploads (summary): https://ai.asu.edu/createai-builder-what-faculty-should-know-about-student-file-uploads
- [S5] ASU CreateAI Chat: https://ai.asu.edu/technical-foundation/create-ai-chat
- [S6] U-M GPT in depth (summary): https://its.umich.edu/computing/ai/gpt-in-depth
- [S7] U-M, what data sources Maizey can index (summary): https://teamdynamix.umich.edu/TDClient/76/Portal/KB/Article/11558/What-data-sources-can-Maizey-index
- [S8] U-M, AI settings in Maizey legacy chat apps (summary): https://teamdynamix.umich.edu/TDClient/30/Portal/KB/Article/10708/Guidance-on-AI-Settings-in-U-M-Maizey-Legacy-Chat-Apps
- [S9] U-M ITS AI release notes (summary): https://its.umich.edu/computing/ai/release-notes
- [S10] Harvard Gazette, AI Sandbox launch, Sep 26, 2023: https://news.harvard.edu/gazette/story/newsplus/harvard-designs-ai-sandbox-that-enables-exploration-interaction-without-compromising-security
- [S11] Harvard AI Sandbox privacy statement (summary): https://www.huit.harvard.edu/ai-sandbox-privacy
- [S12] Stanford AI Playground: https://uit.stanford.edu/aiplayground
- [S13] Stanford AI Playground updates, Dec 1, 2025: https://uit.stanford.edu/news/ai-playground-nov-2025-updates
- [S14] Stanford AI Playground runs on LibreChat (summary; per a UIT news item found through search, exact page not opened): https://uit.stanford.edu/news/stanford-ai-playground-keeps-quick-pace
- [S15] Duke MyGPT Builder: https://oit.duke.edu/service/mygpt-builder/
- [S16] Duke AI Dashboard: https://dashboard.ai.duke.edu/
- [S17] UC San Diego TritonGPT assistants: https://tritonai.ucsd.edu/training-resources/tritongpt/assistants.html
- [S18] UC Irvine ZotGPT Creator: https://zotgpt.uci.edu/services/creator/
- [S19] UC Irvine ClassChat (summary): https://uctechnews.ucop.edu/interview-uc-irvine-launches-zotgpt-classchat-for-students/
- [S20] USC ITS, enterprise AI tools and Trojan AI Gateway: https://itservices.usc.edu/ai/
- [S21] USC ChatGPT Edu launch (summary): https://we-are.usc.edu/?p=15721
- [S22] Daily Trojan, ChatGPT Edu cost (summary): https://dailytrojan.com/2026/01/22/__trashed-3/
- [S23] NYU Wagner, AI tools at NYU (summary): https://sites.google.com/nyu.edu/wagner-teaching-and-learning/innovating-with-ai
- [S24] UF NaviGator chat data retention: https://docs.ai.it.ufl.edu/docs/navigator_chat/policies/data_retention
- [S25] CampusGroups AI Insights (summary): https://www.readyeducation.com/articles/announcing-data-intelligence-2-0-with-ai-insights-an-on-demand-ai-data-analyst-for-the-next-generation-of-student-engagement/

Chat products:
- [S26] OpenAI Help, ChatGPT search (summary; page refused fetch): https://help.openai.com/en/articles/9237897-chatgpt-search
- [S27] OpenAI, Introducing ChatGPT search (summary): https://openai.com/index/introducing-chatgpt-search/
- [S28] Report that the ChatGPT Sources button moved into a menu, Aug 2026 (`unverified`): https://www.relevantaudience.com/geo/chatgpt-sources-button-buried/
- [S29] OpenAI Community, version arrows removed, 2026 (user reports): https://community.openai.com/t/chatgpt-web-update-removed-message-version-arrows-cannot-access-edited-message-history/1374666
- [S30] Claude Help, usage and rate limits (summary): https://support.claude.com/en/articles/9797557-usage-and-rate-limits
- [S31] Claude Help, Pro usage limits, older article (summary): https://support.anthropic.com/en/articles/8325612-does-claude-pro-have-any-usage-limits
- [S32] Gemini Help, sources and related links: https://support.google.com/gemini/answer/14143489?hl=en
- [S33] Gemini Notebook Help, use chat: https://support.google.com/notebooklm/answer/16179559?hl=en
- [S34] NotebookLM Help, citations (summary): https://support.google.com/notebooklm/answer/14276569?hl=en
- [S36] Open WebUI features: https://docs.openwebui.com/features/
- [S37] Open WebUI docs, RAG: https://github.com/open-webui/docs/blob/main/docs/features/chat-conversations/rag/index.md
- [S38] Open WebUI docs, Knowledge: https://github.com/open-webui/docs/blob/main/docs/features/workspace/knowledge.mdx
- [S39] Open WebUI docs, Evaluation: https://github.com/open-webui/docs/blob/main/docs/features/administration/evaluation/index.mdx
- [S40] LibreChat features: https://www.librechat.ai/docs/features
- [S41] LibreChat balance settings: https://www.librechat.ai/docs/configuration/librechat_yaml/object_structure/balance
- [S67] OpenAI Help, custom GPTs (not opened): https://help.openai.com/en/articles/8555545-custom-gpts

Knowledge-base products:
- [S42] Dify, chunking and cleaning text: https://docs.dify.ai/en/use-dify/knowledge/create-knowledge/chunking-and-cleaning-text.md
- [S43] Dify, indexing methods and retrieval settings: https://docs.dify.ai/en/cloud/use-dify/knowledge/create-knowledge/setting-indexing-methods.md
- [S44] Dify, test retrieval: https://docs.dify.ai/en/cloud/use-dify/knowledge/test-retrieval.md
- [S45] Dify, maintain documents: https://docs.dify.ai/en/cloud/use-dify/knowledge/manage-knowledge/maintain-knowledge-documents.md
- [S46] Dify, metadata: https://docs.dify.ai/en/cloud/use-dify/knowledge/metadata.md
- [S47] Dify, integrate knowledge in an app (metadata filtering, rerank, citations): https://docs.dify.ai/en/cloud/use-dify/knowledge/integrate-knowledge-within-application.md
- [S48] Dify, create knowledge: https://docs.dify.ai/en/cloud/use-dify/knowledge/create-knowledge/introduction.md
- [S49] Dify, Agent Knowledge Base overview (beta): https://docs.dify.ai/en/cloud/use-dify/knowledge-base/overview.md
- [S50] Dify, test and tune: https://docs.dify.ai/en/cloud/use-dify/knowledge-base/test-and-tune.md
- [S51] Dify, agent KB retrieval settings: https://docs.dify.ai/en/cloud/use-dify/knowledge-base/retrieval-settings.md
- [S52] Dify, review indexed documents: https://docs.dify.ai/en/cloud/use-dify/knowledge-base/review-indexed-documents.md
- [S53] Dify UI strings, main branch (`dataset-hit-testing.json`, `dataset-documents.json`, `dataset-creation.json`, `dataset.json`, `dataset-settings.json`, `app-debug.json`, `common.json`, `share.json`): https://github.com/langgenius/dify/tree/main/web/i18n/locales/en-US
- [S54] RAGFlow, retrieval testing: https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/retrieval_testing.md
- [S55] RAGFlow, chunk management: https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/chunk_parsing_results_and_knowledge_fragment_management.md
- [S56] RAGFlow, document management: https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/files_dataset_document_management.md
- [S57] RAGFlow, dataset configuration: https://github.com/infiniflow/ragflow/blob/main/docs/guides/dataset/configuration.md
- [S58] RAGFlow, chat configuration: https://github.com/infiniflow/ragflow/blob/main/docs/guides/chat/chat_configuration.md
- [S59] RAGFlow, chat conversations: https://github.com/infiniflow/ragflow/blob/main/docs/guides/chat/using_chat_sessions.md
- [S60] FastGPT, citations and Chunk Reader: https://doc.fastgpt.io/en/guide/chat/quoteList

Enterprise, permission-aware:
- [S61] Glean, security principles (summary): https://docs.glean.com/security/security-principles
- [S62] Glean, how Assistant accesses information: https://docs.glean.com/user-guide/assistant/how-glean-accesses-info
- [S63] Glean, access verification and Document lookup: https://docs.glean.com/administration/search/access-verification
- [S64] Glean Indexing API, permissions (summary): https://developers.glean.com/api-info/indexing/documents/permissions
- [S65] Microsoft Purview, data security for Microsoft 365 Copilot (summary): https://learn.microsoft.com/en-us/purview/ai-m365-copilot
- [S66] Copilot Studio, sensitivity labels in agent responses (summary; the fetch redirected to another page): https://learn.microsoft.com/en-us/microsoft-copilot-studio/sensitivity-label-copilot-studio

## 8. Unverified or conflicting

- Perplexity details: numbered inline citations, an expandable source list, "Copy Citations".
  Only third-party pages were found.
- ChatGPT's Sources button moving into the "More actions" menu (Aug 2026 report [S28]), and the
  replacement of edit-version arrows by "See versions" (community reports [S29]).
- Harvard AI Sandbox history access: the 2023 Gazette says prompts are viewable only to the user;
  the privacy statement lists chat history among the data Harvard may access (summary [S11]).
- U-M GPT rates: about 25 prompts per hour for the top model versus 75 per hour on older pages
  (summary [S6]).
- The current wording of Claude's limit warning; third-party guides disagree [S30][S31].
- Whether Dify's Top K and Score Threshold apply without a rerank model. The docs say they apply
  only in the rerank phase [S43]; the app tooltip says Top K adjusts to the model's `max_tokens`
  [S53].
- Copilot's "highest priority" versus "most restrictive" label wording [S65][S66].
- Anthology Engage's financial status: only competitor marketing mentions it. Not used above.

---

## 9. Credit-based multi-model chat: XIPU AI and comparables

### 9.1 XIPU AI (XJTLU)

**Name.** The platform is "XIPU AI", also called "Junmo" on XJTLU's own page [S68]. A search
summary gives the Chinese name as 君谋 (`unverified`). XJTLU launched it in September 2023 and ran
it through its Learning Mall team [S69]. The site, `xipuai.xjtlu.edu.cn`, redirects to campus
sign-on, so its chat UI can't be viewed from outside.

**What the public guides show.** These come from the XJTLU knowledge base:
- "2. How to use AI Chat feature", posted Jun 13, 2025, updated Mar 19, 2026 [S70].
- "1. The Introduction of XIPU AI Platform", updated Mar 18, 2026 [S69].

Model choice:
- The picker sits in a per-room **"Config"** panel, not in the composer. Its fields are "Name",
  "Model", "Icon" and "Context Count" (how many earlier messages the model sees).
- The default model is GPT-4.1-mini. Users "Switch to other AI models via the dropdown".
- The model list isn't shown. The introduction names GPT-5.4, DeepSeek V3.2, Claude and Doubao
  among "over twenty models". It recommends DeepSeek V3.2 for maths and GPT-5.4 for creative
  writing.

Chat rooms and tools:
- A left-hand room list with search, "Batch Operation" (bulk delete), a "+" button for a new room,
  and a per-room menu: "Edit", "Top" (pin), "Delete".
- Chat tools: Bubble/List display toggle, Upload (images), Export (chat history as Markdown),
  Clear, Send.

Other features:
- Image generation (Doubao, Midjourney), an agent builder and an "Application Centre" (mind map,
  flowchart, document parsing).
- Personal knowledge bases accept seven file types, at 100MB per file.

**Credits (积分): not publicly documented.**
- No public page found describes 积分, per-model cost, a balance chip, the deduction per message,
  the empty-balance state, top-ups, the reset cadence or a usage history. Searches in English and
  Chinese returned nothing.
- The reported credit behaviour (pick a model; each message deducts 积分) is
  `unverified` from outside the campus network. No public screenshots of a credit UI were found.
- The 2024 "User Guide of XIPU AI Platform" [S71] now returns "Access Denied". Per a search
  summary, its "Usage Limitation" section capped students at about 2,000 Chinese characters per
  question and about 1,500 questions a month on GPT-3.5 or 800 on GPT-4. Staff and PhD students
  had no length limit.
- So limits were once counted per model, with the stronger model getting fewer questions. That is
  a per-model weighting, which a credit system makes explicit.
- The same summary says the platform requires real-name authentication and the campus network,
  and that "all chat records on this platform will be recorded and properly stored by the backend
  system". That is the opposite of our I15 privacy promise, and worth saying out loud in a demo.

To confirm the credit UI, ask someone with an XJTLU account for screenshots of the balance chip,
the model menu, the out-of-credits message and the usage page.

### 9.2 Comparable credit systems

| Product | Unit and allowance | Cost before sending | Balance after | Empty state | History |
|---|---|---|---|---|---|
| Poe [S72][S73][S74] | "Compute points" | Each bot carries a **cost label**, "a short string that clearly communicates how users are charged", e.g. `[usd_milli_cents=30]+`, rendered as points with "+" meaning "from". A fuller **rate card** sits in bot info ("points / 1k tokens"). | The balance API returns `current_point_balance` (plan plus add-on points). Where the app shows it is not documented. | Points are reserved before the bot runs ("authorize") and charged after ("capture"). Creators must "handle InsufficientFundError gracefully"; the user-facing copy is not documented. | Entries kept 30 days, newest first: `creation_time`, `bot_name`, `usage_type` (Chat, API, Canvas App), `cost_points`, plus cost in USD and a points breakdown by input, output and cache |
| HKU GenAI [S75] (summary) | "AI Credits"; students get 500k a month, replenished on the first day of each month; one pool covers the app and the API | Model rates in the app's information panel (not seen) | Remaining balance shown in the HKU GenAI App | Buy a student top-up pack; free monthly credits are used first; top-ups carry over until the student leaves | Not documented |
| HKUST GenAI (Open WebUI) [S76] | HK$8 free credit a month, no carry-over | Pricing follows each provider's API price; no in-app label documented | "Credit balances update in near real-time" | "Once your free credit is exhausted, API access will be suspended until you purchase additional credits." Paid credits never expire. | Not documented |
| University of Dayton FlyerGPT [S77] | Dollars: students $20 a month, staff $25; reset monthly | Not documented | A "usage monitor graphic that shows exactly where you stand for the month", shown at each login | Ask for a higher limit that month through an "AI Support Request" ticket | Not documented |
| USTC and Tongji (mainland China) [S78] (news report) | Token allowances: USTC 100 million tokens per person per day, cleared the next day; Tongji 100 million a week | Not documented | Not documented | Not documented | Not documented |

What they agree on:
- **The unit.** Most count abstract credits or points. FlyerGPT and HKUST count money. We count
  dollars because USG allocates dollars, and the rules want "$0.42". Keep dollars.
- **Reserve, then settle.** Poe's authorize-then-capture is the same shape as our hold → settle
  (§11). It is fair to say so on stage.
- **The reset date sits next to the balance.** It is daily (USTC, Poe free tier), weekly (Tongji)
  or on the first of the month (HKU, HKUST, FlyerGPT).
- **There is a way out when empty.** Paid platforms sell a top-up (HKU, HKUST). Free ones send
  you to a person (FlyerGPT's ticket). Ours is a person: the president for member limits, USG for
  club limits.

### 9.3 Patterns to copy

1. **Model chip in the composer toolbar, not a settings panel.**
   - XIPU's per-room Config is one click deeper than ChatGPT, Poe or Open WebUI, which put the
     model in the composer.
   - For tomorrow, make it a read-only chip left of "Run": "Economy model · about $0.01 per run".
   - Hover text: "Set by the Event planning template. USG chooses which models clubs can use."
   - A real per-run picker would widen what the installation allows (I7) and needs a contract
     field. If one is added later, list only the classes `usg_club_policy` allows, each with its
     cost label: "Standard · from $0.03" / "Economy · from $0.01".
2. **Label the cost per run before sending, the way Poe does.**
   - "About $0.01 per run" on the mock, where the hold is flat.
   - After WP-13, the cost label is the hold amount: "Up to $0.03 per run · you pay what it
     uses". That is honest about hold → settle.
   - After the run, keep "Read 3 documents · $0.01" (the actual, settled cost) on the answer.
3. **Balance chip in the composer row, updated after every run.**
   - Text: "$0.04 left today", or "$0.38 left this month in Startup Club".
   - Then "Resets at midnight PT" or "Resets Dec 1, 2026".
   - At 80% or more used, add the attention chip "80% used". The 8px meter stays on the club home.
4. **Blocked state before the attempt.**
   - When remaining is below the hold, show the §11 banner above the composer as soon as the page
     loads. Keep "Run" enabled, because the rules say to explain rather than disable; clicking it
     returns the same message.
   - Copy, from §11 plus a way out:
     - "You've reached today's limit for public agents ($0.05). It resets at midnight PT."
     - "Your monthly AI quota in Startup Club is used up ($0.50 of $0.50). Ask Sam, your
       president, to raise it."
     - "Startup Club has used its monthly AI quota ($5.00 of $5.00). USG can raise it."
5. **Usage history table, Poe's fields mapped onto ours.**
   - Columns: "Time" (Source Code Pro, "Nov 15, 2026, 10:42 AM PT"), "Agent", "Club billed",
     "Documents read" (count), "Cost" (right-aligned, tabular).
   - Sort newest first, 20 rows per page, last 30 days.
   - Leave out question text. Owners could see it under I15, but the table stays metadata-first
     like Poe's.
   - Footer total: "$0.41 this month".
   - Blocked attempts write `quota.blocked` and no run row, so they appear only in the audit log.
     Add a "Blocked runs" count above the table if that is worth showing.
   - Home: the club home's "my usage this month" section (B). Data: `agent_runs` under
     `runs_own`, no new route. `TODO(verify):` the owner and query.

### 9.4 Sources for this section

- [S68] XJTLU, XIPU AI (Learning Mall): https://www.xjtlu.edu.cn/en/learning-mall/technology-enhanced-learning/xipu-ai
- [S69] XJTLU Knowledge Base, "1. The Introduction of XIPU AI Platform": https://knowledgebase.xjtlu.edu.cn/print-409.html
- [S70] XJTLU Knowledge Base, "2. How to use AI Chat feature on XIPU AI platform": https://knowledgebase.xjtlu.edu.cn/print-410.html
- [S71] XJTLU Knowledge Base, "User Guide of XIPU AI Platform" (Access Denied now; summary): https://knowledgebase.xjtlu.edu.cn/print-375.html
- [S72] Poe, Bot Monetization API (cost label, rate card, authorize and capture): https://creator.poe.com/docs/poe-bot-monetization-api-documentation
- [S73] Poe, Usage API (balance, 30-day history): https://creator.poe.com/docs/resources/usage-api
- [S74] Poe, get usage history (entry fields): https://creator.poe.com/api-reference/getPointsHistory
- [S75] HKU ITS, student top-up pack (summary; page refused fetch): https://its.hku.hk/news/hku-genai-student-top-up-pack-now-available/
- [S76] HKUST ITSO, pricing of AI models: https://itso.hkust.edu.hk/services/general-it-services/generative-ai-tools/genai/pricing
- [S77] University of Dayton, FlyerGPT usage limits, Sep 1, 2026: https://udayton.edu/blogs/ai/2026/09/flyergpt-user-budgets-and-cost-saving-tips.php
- [S78] Yicai report on university token allowances, Nov 3, 2026 (summary): https://www.yicai.com/news/103422835.html

Unverified in this section:
- XIPU AI's 积分 system as a whole: the balance chip, the per-model cost, the deduction per
  message, the empty state, top-ups, the reset cadence and the usage history.
- The Chinese name 君谋.
- The 2024 per-model monthly caps, which come only from a search summary.
- Poe's in-app placement of the cost label, balance and history.
- Poe's current plan allowances; third-party trackers disagree.
