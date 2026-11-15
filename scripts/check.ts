// pnpm check: typecheck, lint, test, then the invariant greps (I2, I5, I8, I9) and the design greps
// (.claude/agents/ui-designer.md "Not this"). Plain Node, so it runs the same on Windows, macOS and Linux.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

let failed = false;

// One command string through the shell: Windows needs it to resolve pnpm.cmd.
function step(name: string, script: string): void {
  console.log(`› ${name}`);
  const r = spawnSync(`pnpm -s ${script}`, { stdio: 'inherit', shell: true });
  if (r.status !== 0) failed = true;
}

function violation(title: string, hits: string[]): void {
  if (hits.length === 0) return;
  console.log(`✗ ${title}`);
  for (const h of hits) console.log(`    ${h}`);
  failed = true;
}

// Every file under the given roots (files or directories), paths with forward slashes.
function filesUnder(roots: string[]): string[] {
  const out: string[] = [];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    const entries = readdirSync(r, { recursive: true, withFileTypes: true });
    for (const e of entries) {
      if (e.isFile()) out.push(join(e.parentPath, e.name).replaceAll('\\', '/'));
    }
  }
  return out;
}

type Hit = { file: string; line: number; text: string };

// grep -rnE: lines matching `pattern` in files under `roots`, limited to `exts` when given.
function grep(pattern: RegExp, roots: string[], exts?: string[]): Hit[] {
  const hits: Hit[] = [];
  for (const file of filesUnder(roots)) {
    if (exts && !exts.some((x) => file.endsWith(x))) continue;
    let content: string;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    content.split(/\r?\n/).forEach((text, i) => {
      if (pattern.test(text)) hits.push({ file, line: i + 1, text });
    });
  }
  return hits;
}

const fmt = (hits: Hit[]) => hits.map((h) => `${h.file}:${h.line}:${h.text}`);

step('typecheck', 'typecheck');
step('lint', 'lint');
step('test', 'test');

console.log('› invariant and design greps');

// I2: the owner URL never reaches app code.
violation(
  'I2: DATABASE_OWNER_URL is for scripts/ and drizzle.config.ts only',
  fmt(grep(/DATABASE_OWNER_URL/, ['src'])),
);

// I5: vendor model SDKs only under src/lib/connectors/llm/.
violation(
  'I5: vendor SDKs may be imported only under src/lib/connectors/llm/',
  fmt(
    grep(
      /from ['"](@anthropic-ai|openai|@google\/genai|@google\/generative-ai|@mistralai|cohere-ai|ollama|voyageai)/,
      ['src', 'db', 'scripts'],
    ).filter((h) => !h.file.startsWith('src/lib/connectors/llm/') && h.file !== 'scripts/check.ts'),
  ),
);

// I9: time comes from clock.now().
violation(
  'I9: use now() from src/lib/clock.ts instead of new Date(), Date.now(), performance.now() or defaultNow()',
  fmt(
    grep(/new Date\(\)|Date\.now\(|performance\.now\(|defaultNow\(/, ['src', 'db/seed', 'scripts']).filter(
      (h) => h.file !== 'src/lib/clock.ts' && h.file !== 'scripts/check.ts',
    ),
  ),
);

// I5: only the gateway calls the runtime.
violation(
  'I5: only src/lib/gateway/ may import the runtime; run agents through runAgent()',
  fmt(
    grep(/from ['"](@\/lib\/runtime|\.\.\/runtime|\.\/runtime)/, ['src']).filter(
      (h) => !/^src\/lib\/(gateway|runtime)\//.test(h.file),
    ),
  ),
);

// I8: audit() in src/lib/gateway/audit.ts is the only writer of audit_events and ai_usage.
violation(
  'I8: write audit_events and ai_usage only from src/lib/gateway/',
  fmt(grep(/\.insert\((auditEvents|aiUsage)\)/, ['src']).filter((h) => !h.file.startsWith('src/lib/gateway/'))),
);

// Design: banned patterns (shadow-overlay is the only shadow, on overlays).
const shadowHits = grep(/(^|[^-a-z])shadow(["' `]|-(2xs|xs|sm|md|lg|xl|2xl|inner|\[))/, ['src'], ['.tsx', '.css']);
const bannedHits = grep(
  /drop-shadow|bg-gradient|backdrop-blur|<(Sparkles|WandSparkles|Wand|Wand2|Bot|BotMessageSquare)[ />]/,
  ['src'],
);
violation(
  'Design: gradients, blur, shadows other than shadow-overlay, and sparkle/wand/bot icons are banned',
  fmt([...shadowHits, ...bannedHits].filter((h) => !(h.file === 'src/app/globals.css' && /shadow-overlay/.test(h.text)))),
);

violation(
  'Design: rounded-full only in ui/avatar, ui/switch and ui/radio-group',
  fmt(
    grep(/rounded-full/, ['src']).filter((h) => !/^src\/components\/ui\/(avatar|switch|radio-group)\.tsx$/.test(h.file)),
  ),
);

// Design: colors come from tokens in globals.css.
const palette =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const rawColor = new RegExp(
  `#[0-9a-fA-F]{6}\\b|#[0-9a-fA-F]{3}\\b|\\b(rgba?|hsla?|oklch|oklab)\\(|-(${palette})-[0-9]{2,3}\\b`,
);
violation(
  'Design: no raw colors or Tailwind palette colors outside src/app/globals.css; use a token',
  fmt(grep(rawColor, ['src'], ['.ts', '.tsx', '.css']).filter((h) => h.file !== 'src/app/globals.css')),
);

if (failed) {
  console.log('pnpm check failed');
  process.exit(1);
}
console.log('pnpm check passed');
