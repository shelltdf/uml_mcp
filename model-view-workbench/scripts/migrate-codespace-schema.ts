import { promises as fs } from 'node:fs';
import path from 'node:path';

type CliOptions = {
  targetPath: string;
  write: boolean;
};

type MigrationStats = {
  filesScanned: number;
  markdownFiles: number;
  filesWithCodespaceFence: number;
  filesChanged: number;
  fencesSeen: number;
  fencesChanged: number;
  jsonParseErrors: number;
  renamedMemberToMembers: number;
  renamedMethodToMethods: number;
  renamedEnumToEnums: number;
  splitLegacyMembersKind: number;
};

type AnyObj = Record<string, unknown>;

const MD_EXTS = new Set(['.md', '.markdown', '.mdx']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.turbo']);

function parseArgs(argv: string[]): CliOptions {
  let targetPath = '.';
  let write = false;
  for (const a of argv) {
    if (a === '--write') write = true;
    else if (a.startsWith('--')) {
      throw new Error(`Unknown flag: ${a}`);
    } else {
      targetPath = a;
    }
  }
  return { targetPath, write };
}

async function collectMarkdownFiles(root: string, out: string[]): Promise<void> {
  const st = await fs.stat(root);
  if (st.isFile()) {
    if (MD_EXTS.has(path.extname(root).toLowerCase())) out.push(root);
    return;
  }
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await collectMarkdownFiles(p, out);
      continue;
    }
    if (!e.isFile()) continue;
    if (MD_EXTS.has(path.extname(e.name).toLowerCase())) out.push(p);
  }
}

function isObj(v: unknown): v is AnyObj {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asArray(v: unknown): AnyObj[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is AnyObj => isObj(x));
}

function migrateClassifierShape(cls: AnyObj, stats: MigrationStats): boolean {
  let changed = false;

  if ('member' in cls) {
    if (!('members' in cls)) {
      cls.members = cls.member;
      stats.renamedMemberToMembers++;
    }
    delete cls.member;
    changed = true;
  }
  if ('method' in cls) {
    if (!('methods' in cls)) {
      cls.methods = cls.method;
      stats.renamedMethodToMethods++;
    }
    delete cls.method;
    changed = true;
  }
  if ('enum' in cls) {
    if (!('enums' in cls)) {
      cls.enums = cls.enum;
      stats.renamedEnumToEnums++;
    }
    delete cls.enum;
    changed = true;
  }

  const members = asArray(cls.members);
  if (!members.length) return changed;

  const nextMembers: AnyObj[] = [];
  const nextMethods = asArray(cls.methods);
  const nextEnums = asArray(cls.enums);
  let splitAny = false;

  for (const m of members) {
    const kind = String(m.kind ?? '').trim();
    const row = { ...m };
    if ('kind' in row) delete row.kind;
    if (kind === 'method') {
      nextMethods.push(row);
      splitAny = true;
      continue;
    }
    if (kind === 'enumLiteral') {
      nextEnums.push(row);
      splitAny = true;
      continue;
    }
    nextMembers.push(row);
    if (kind === 'field') splitAny = true;
  }

  if (splitAny) {
    cls.members = nextMembers;
    cls.methods = nextMethods;
    cls.enums = nextEnums;
    stats.splitLegacyMembersKind++;
    changed = true;
  }

  return changed;
}

function migrateCodespacePayload(payload: AnyObj, stats: MigrationStats): boolean {
  let changed = false;
  const modules = Array.isArray(payload.modules) ? payload.modules : [];
  for (const mod0 of modules) {
    if (!isObj(mod0)) continue;
    const walkNs = (nodes: unknown): void => {
      if (!Array.isArray(nodes)) return;
      for (const n0 of nodes) {
        if (!isObj(n0)) continue;
        const classes = Array.isArray(n0.classes) ? n0.classes : [];
        for (const c0 of classes) {
          if (!isObj(c0)) continue;
          if (migrateClassifierShape(c0, stats)) changed = true;
        }
        walkNs(n0.namespaces);
      }
    };
    walkNs(mod0.namespaces);
  }
  return changed;
}

function migrateMarkdown(source: string, stats: MigrationStats): { output: string; changed: boolean; hasFence: boolean } {
  const fenceRe = /^```mv-model-codespace\s*\r?\n([\s\S]*?)\r?\n```/gm;
  let changed = false;
  let hasFence = false;
  const output = source.replace(fenceRe, (whole, body: string) => {
    hasFence = true;
    stats.fencesSeen++;
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      stats.jsonParseErrors++;
      return whole;
    }
    if (!isObj(parsed)) return whole;
    if (!migrateCodespacePayload(parsed, stats)) return whole;
    changed = true;
    stats.fencesChanged++;
    const nextInner = JSON.stringify(parsed, null, 2);
    return `\`\`\`mv-model-codespace\n${nextInner}\n\`\`\``;
  });
  return { output, changed, hasFence };
}

function makeStats(): MigrationStats {
  return {
    filesScanned: 0,
    markdownFiles: 0,
    filesWithCodespaceFence: 0,
    filesChanged: 0,
    fencesSeen: 0,
    fencesChanged: 0,
    jsonParseErrors: 0,
    renamedMemberToMembers: 0,
    renamedMethodToMethods: 0,
    renamedEnumToEnums: 0,
    splitLegacyMembersKind: 0,
  };
}

async function run(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const absTarget = path.resolve(process.cwd(), opts.targetPath);
  const files: string[] = [];
  const stats = makeStats();
  await collectMarkdownFiles(absTarget, files);
  stats.filesScanned = files.length;
  stats.markdownFiles = files.length;

  for (const f of files) {
    const src = await fs.readFile(f, 'utf8');
    const r = migrateMarkdown(src, stats);
    if (r.hasFence) stats.filesWithCodespaceFence++;
    if (!r.changed) continue;
    stats.filesChanged++;
    if (opts.write) {
      await fs.writeFile(f, r.output, 'utf8');
      console.log(`[write] ${path.relative(process.cwd(), f)}`);
    } else {
      console.log(`[dry-run] ${path.relative(process.cwd(), f)}`);
    }
  }

  console.log('');
  console.log('=== migrate-codespace-schema summary ===');
  console.log(`mode: ${opts.write ? 'write' : 'dry-run'}`);
  console.log(`target: ${absTarget}`);
  console.log(`markdown files scanned: ${stats.markdownFiles}`);
  console.log(`files with codespace fence: ${stats.filesWithCodespaceFence}`);
  console.log(`files changed: ${stats.filesChanged}`);
  console.log(`codespace fences seen: ${stats.fencesSeen}`);
  console.log(`codespace fences changed: ${stats.fencesChanged}`);
  console.log(`json parse errors: ${stats.jsonParseErrors}`);
  console.log(`renamed member->members: ${stats.renamedMemberToMembers}`);
  console.log(`renamed method->methods: ${stats.renamedMethodToMethods}`);
  console.log(`renamed enum->enums: ${stats.renamedEnumToEnums}`);
  console.log(`split legacy members[kind]: ${stats.splitLegacyMembersKind}`);
  console.log('========================================');
}

run().catch((e) => {
  console.error('[migrate-codespace-schema] failed:', e);
  process.exitCode = 1;
});
