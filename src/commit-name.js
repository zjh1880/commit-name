#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VERSION = '1.1.0';
const IGNORED_SCOPES = new Set(['src', 'lib', 'packages', 'test', 'tests', '__tests__']);
const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.rst', '.txt']);
const TEST_SEGMENTS = new Set(['test', 'tests', '__tests__', 'spec', 'specs']);
const FIX_WORDS = ['fix', 'bug', 'error', 'crash', 'fail', 'regression'];
const FEATURE_WORDS = ['add', 'create', 'introduce', 'support', 'enable', 'implement'];
const VALID_TYPES = new Set(['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']);
const VALUE_FLAGS = new Set(['--diff-file', '--type', '--scope', '--summary', '--body', '--footer', '--format', '--max-summary', '--max-body']);
const GENERIC_BASENAMES = new Set(['index', 'main', 'mod', 'module', 'app', 'server', 'client', 'utils', 'util', 'helpers', 'helper', 'types', 'type', 'constants', 'const', 'config', 'setup']);

function usage() {
  return `commit-name v${VERSION}

Usage:
  commit-name suggest --staged [--format text|json] [--max-summary 72]
  commit-name suggest --worktree [--format text|json] [--max-summary 72]
  commit-name suggest --diff-file examples/diff-sample.patch [--format text|json]
  commit-name sample

Options:
  --staged              Read git diff --cached.
  --worktree            Read unstaged git diff.
  --diff-file <path>    Read a patch file instead of running git.
  --type <type>         Override inferred commit type.
  --scope <scope>       Override inferred scope.
  --summary <summary>   Override inferred summary.
  --body <message>      Override generated body.
  --footer <footer>     Append a Conventional Commits footer.
  --breaking            Append a default BREAKING CHANGE footer.
  --format <format>     Output format: text or json. Default: text
  --max-summary <n>     Maximum subject length. Default: 72
  --max-body <n>        Maximum body line length. Default: 100
  -h, --help            Show this help message and exit.
`;
}

function hasHelpFlag(argv) {
  let expectsValue = false;
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (expectsValue) {
      expectsValue = false;
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      expectsValue = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') return true;
  }
  return false;
}

function parseArgs(argv) {
  const args = {
    command: argv[2],
    source: null,
    diffFile: null,
    type: null,
    scope: null,
    summary: null,
    body: null,
    footer: null,
    breaking: false,
    format: 'text',
    maxSummary: 72,
    maxBody: 100,
    help: hasHelpFlag(argv)
  };

  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    if (arg === '--staged' || arg === '--worktree') {
      args.source = arg.slice(2);
      continue;
    }
    if (arg === '--breaking') {
      args.breaking = true;
      continue;
    }
    if (arg === '--diff-file' || arg === '--type' || arg === '--scope' || arg === '--summary' || arg === '--body' || arg === '--footer' || arg === '--format' || arg === '--max-summary' || arg === '--max-body') {
      if (!next || next.startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }
      if (arg === '--diff-file') args.diffFile = next;
      if (arg === '--type') args.type = next;
      if (arg === '--scope') args.scope = next;
      if (arg === '--summary') args.summary = next;
      if (arg === '--body') args.body = next;
      if (arg === '--footer') args.footer = next;
      if (arg === '--format') args.format = next;
      if (arg === '--max-summary') args.maxSummary = Number(next);
      if (arg === '--max-body') args.maxBody = Number(next);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error('--format must be either text or json');
  }
  if (!Number.isInteger(args.maxSummary) || args.maxSummary < 20) {
    throw new Error('--max-summary must be an integer greater than or equal to 20');
  }
  if (!Number.isInteger(args.maxBody) || args.maxBody < 20) {
    throw new Error('--max-body must be an integer greater than or equal to 20');
  }
  if (args.type && !VALID_TYPES.has(args.type)) {
    throw new Error(`--type must be one of: ${[...VALID_TYPES].join(', ')}`);
  }
  if (args.scope && !/^[a-z0-9][a-z0-9-]*$/i.test(args.scope)) {
    throw new Error('--scope must contain only letters, numbers, and hyphens');
  }

  return args;
}

function readDiff(args) {
  if (args.diffFile) {
    const filePath = path.resolve(args.diffFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`diff file not found: ${args.diffFile}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  if (args.source === 'staged') {
    return readGitDiff(['diff', '--cached']);
  }
  if (args.source === 'worktree') {
    return readGitDiff(['diff']);
  }

  throw new Error('Choose one source: --staged, --worktree, or --diff-file');
}

function readGitDiff(gitArgs) {
  try {
    return execFileSync('git', gitArgs, { encoding: 'utf8' });
  } catch (error) {
    throw new Error(gitFailureMessage(error));
  }
}

function gitFailureMessage(error) {
  const stderr = error && error.stderr ? String(error.stderr) : '';
  const message = error && error.message ? String(error.message) : '';

  if (/not a git repository/i.test(`${stderr}\n${message}`)) {
    return 'not a git repository; pass --diff-file <path> or run this command inside a git work tree';
  }
  if (error && error.code === 'ENOENT') {
    return 'git is not installed or not on PATH; pass --diff-file <path>';
  }

  const firstLine = stderr.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)[0];
  const fallback = message.split(/\r?\n/)[0];
  const detail = firstLine || fallback;
  return `git diff failed; pass --diff-file <path> instead${detail ? ` (${detail})` : ''}`;
}

function parsePatch(diff) {
  const files = [];
  const lines = diff.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      if (current) files.push(current);
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
      current = {
        oldPath: match ? match[1] : 'unknown',
        newPath: match ? match[2] : 'unknown',
        added: 0,
        removed: 0,
        changed: 0,
        hunks: []
      };
      continue;
    }

    if (!current) continue;

    if (line.startsWith('+++ ')) {
      const parsed = line.slice(4).split('\t')[0];
      if (parsed !== '/dev/null') current.newPath = stripDiffPrefix(parsed);
      continue;
    }
    if (line.startsWith('--- ')) {
      const parsed = line.slice(4).split('\t')[0];
      if (parsed !== '/dev/null') current.oldPath = stripDiffPrefix(parsed);
      continue;
    }
    if (line.startsWith('@@')) {
      current.hunks.push(line);
      continue;
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      current.added += 1;
      current.changed += 1;
      continue;
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      current.removed += 1;
      current.changed += 1;
    }
  }

  if (current) files.push(current);
  return files;
}

function stripDiffPrefix(filePath) {
  if (filePath.startsWith('a/') || filePath.startsWith('b/')) {
    return filePath.slice(2);
  }
  return filePath;
}

function inferType(files, diff) {
  const lowerDiff = diff.toLowerCase();
  const testFiles = files.filter((file) => hasTestSegment(file.newPath));
  const docFiles = files.filter((file) => DOC_EXTENSIONS.has(path.extname(file.newPath).toLowerCase()));
  const added = files.reduce((total, file) => total + file.added, 0);
  const removed = files.reduce((total, file) => total + file.removed, 0);
  const changed = added + removed;
  const hasFixWord = FIX_WORDS.some((word) => lowerDiff.includes(word));
  const hasFeatureWord = FEATURE_WORDS.some((word) => lowerDiff.includes(word));

  if (testFiles.length > files.length / 2) return 'test';
  if (docFiles.length > files.length / 2) return 'docs';
  if (hasFixWord) return 'fix';
  if (changed > 100 && !hasFeatureWord) return 'refactor';
  if (added === 0 && removed > 0) return 'refactor';
  if (added > 0 || hasFeatureWord) return 'feat';
  return 'chore';
}

function hasTestSegment(filePath) {
  return filePath.split(/[\\/]/).some((segment) => TEST_SEGMENTS.has(segment));
}

function inferScope(files) {
  for (const file of files) {
    const parts = file.newPath.split(/[\\/]/).filter(Boolean);
    const meaningful = parts.filter((part) => !IGNORED_SCOPES.has(part) && !part.includes('.'));
    if (meaningful.length > 0) return meaningful[0];
  }
  return null;
}

function inferSummary(files, diff, type, scope, maxSummary) {
  if (type === 'docs') return truncate('update documentation', maxSummary);
  if (type === 'test') return truncate('add test coverage', maxSummary);
  if (type === 'chore') return truncate('update project configuration', maxSummary);
  if (type === 'refactor') return truncate('refactor internal structure', maxSummary);
  if (type === 'fix') return truncate('fix reported issue', maxSummary);

  const resource = inferResource(files, scope);
  if (resource) {
    const verb = type === 'feat' ? 'add' : 'update';
    return truncate(`${verb} ${resource} module`, maxSummary);
  }

  const keyword = FEATURE_WORDS.find((word) => diff.toLowerCase().includes(word));
  if (keyword) return truncate(`${keyword} ${scope || 'project'} changes`, maxSummary);
  return truncate(`${type} changes`, maxSummary);
}

function inferResource(files, avoid) {
  const candidates = files
    .filter((file) => !hasTestSegment(file.newPath))
    .slice()
    .sort((left, right) => right.changed - left.changed);

  let fallback = null;
  for (const file of candidates) {
    const resource = resourceFromPath(file.newPath);
    if (!resource) continue;
    if (!fallback) fallback = resource;
    if (resource !== avoid) return resource;
  }
  return fallback;
}

function resourceFromPath(filePath) {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  let base = path.basename(filePath, path.extname(filePath));
  base = base
    .replace(/\.(test|spec)$/i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  if (!base) return null;
  if (GENERIC_BASENAMES.has(base)) {
    const parent = parts.length >= 2 ? parts[parts.length - 2] : '';
    if (parent && !IGNORED_SCOPES.has(parent) && !parent.includes('.')) {
      base = parent.toLowerCase();
    }
  }
  return singularize(base);
}

function singularize(value) {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (/(ss|us|is)es$/.test(value)) return value.slice(0, -2);
  if (/(ss|us|is)$/.test(value)) return value;
  return value.replace(/s$/, '');
}

function truncate(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function wrapLines(value, maxLength) {
  return value
    .split(/\r?\n/)
    .map((line) => truncate(line, maxLength))
    .join('\n');
}

function formatBody(files, maxBody) {
  return wrapLines(files.map((file) => `- ${file.newPath}`).join('\n'), maxBody);
}

function suggest(diff, options) {
  const files = parsePatch(diff);
  if (files.length === 0) {
    throw new Error('No diff found. Stage changes or pass --diff-file.');
  }

  const safeOptions = options || {};
  const type = safeOptions.type || inferType(files, diff);
  const hasScopeOverride = typeof safeOptions.scope === 'string' && safeOptions.scope.length > 0;
  const scope = hasScopeOverride ? safeOptions.scope : inferScope(files);
  const summary = safeOptions.summary || inferSummary(files, diff, type, scope, safeOptions.maxSummary || 72);
  const subject = scope ? `${type}(${scope}): ${summary}` : `${type}: ${summary}`;
  const body = safeOptions.body || formatBody(files, safeOptions.maxBody || 100);
  const footer = buildFooter(safeOptions);
  const sections = [subject, body, footer].filter(Boolean);
  const message = sections.join('\n\n');

  return {
    type,
    scope,
    summary,
    subject,
    body,
    footer,
    message,
    files: files.map((file) => file.newPath)
  };
}

function buildFooter(options) {
  const parts = [];
  if (options.breaking) {
    parts.push('BREAKING CHANGE: This commit introduces a breaking change.');
  }
  if (options.footer) {
    parts.push(options.footer);
  }
  return parts.join('\n');
}

function formatText(commit) {
  return commit.message;
}

function sample() {
  const diffPath = path.join(__dirname, '..', 'examples', 'diff-sample.patch');
  const diff = fs.readFileSync(diffPath, 'utf8');
  return suggest(diff, { maxSummary: 72, maxBody: 100 });
}

function run(argv) {
  const args = parseArgs(argv);

  if (args.help || !args.command) {
    return { exitCode: 0, output: usage() };
  }

  if (args.command === 'sample') {
    const commit = sample();
    const output = args.format === 'json' ? JSON.stringify(commit, null, 2) : formatText(commit);
    return { exitCode: 0, output };
  }

  if (args.command !== 'suggest') {
    throw new Error(`Unknown command: ${args.command}. Use suggest or sample.`);
  }

  const diff = readDiff(args);
  const commit = suggest(diff, {
    type: args.type,
    scope: args.scope,
    summary: args.summary,
    body: args.body,
    footer: args.footer,
    breaking: args.breaking,
    maxSummary: args.maxSummary,
    maxBody: args.maxBody
  });
  const output = args.format === 'json' ? JSON.stringify(commit, null, 2) : formatText(commit);

  return { exitCode: 0, output };
}

if (require.main === module) {
  try {
    const result = run(process.argv);
    process.stdout.write(`${result.output}\n`);
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${error.message}\n\n${usage()}`);
    process.exitCode = 2;
  }
}

module.exports = {
  parseArgs,
  parsePatch,
  inferType,
  inferScope,
  suggest,
  sample,
  readDiff,
  gitFailureMessage,
  run
};
