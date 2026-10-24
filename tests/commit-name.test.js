'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  gitFailureMessage,
  inferScope,
  inferType,
  parseArgs,
  parsePatch,
  sample,
  suggest,
  run
} = require('../src/commit-name.js');

const examplePatchPath = path.join(__dirname, '..', 'examples', 'diff-sample.patch');

const sampleDiff = [
  'diff --git a/src/api/users.js b/src/api/users.js',
  'new file mode 100644',
  'index 0000000..1234567',
  '--- /dev/null',
  '+++ b/src/api/users.js',
  '@@ -0,0 +1,5 @@',
  '+export function getUser(id) {',
  '+  return { id };',
  '+}',
  'diff --git a/tests/api/users.test.js b/tests/api/users.test.js',
  'new file mode 100644',
  'index 0000000..7654321',
  '--- /dev/null',
  '+++ b/tests/api/users.test.js',
  '@@ -0,0 +1,4 @@',
  '+import { getUser } from "../../src/api/users.js";',
  '+test("gets a user", () => {',
  '+  expect(getUser(1)).toEqual({ id: 1 });',
  '+});'
].join('\n');

test('parses CLI arguments with overrides', () => {
  const args = parseArgs([
    'node',
    'commit-name.js',
    'suggest',
    '--diff-file',
    'examples/diff-sample.patch',
    '--type',
    'feat',
    '--scope',
    'api',
    '--summary',
    'add user lookup endpoint',
    '--body',
    'Custom body',
    '--footer',
    'Closes #12',
    '--breaking',
    '--format',
    'json'
  ]);

  assert.equal(args.type, 'feat');
  assert.equal(args.scope, 'api');
  assert.equal(args.summary, 'add user lookup endpoint');
  assert.equal(args.body, 'Custom body');
  assert.equal(args.footer, 'Closes #12');
  assert.equal(args.breaking, true);
  assert.equal(args.format, 'json');
});

test('rejects invalid commit types', () => {
  assert.throws(() => parseArgs(['node', 'commit-name.js', 'suggest', '--type', 'feature']), /--type/);
});

test('rejects invalid scopes', () => {
  assert.throws(() => parseArgs(['node', 'commit-name.js', 'suggest', '--scope', 'api/users']), /--scope/);
});

test('prints usage for --help before validating the command', () => {
  const result = run(['node', 'commit-name.js', '--help']);

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /^commit-name v/);
  assert.match(result.output, /Usage:/);
});

test('prints usage for -h after a command', () => {
  const result = run(['node', 'commit-name.js', 'suggest', '-h']);

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /Usage:/);
});

test('prints usage when run without a command', () => {
  const result = run(['node', 'commit-name.js']);

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /Usage:/);
});

test('rejects unknown commands', () => {
  assert.throws(() => run(['node', 'commit-name.js', 'publish']), /Unknown command/);
});

test('parses unified diff files', () => {
  const files = parsePatch(sampleDiff);

  assert.equal(files.length, 2);
  assert.equal(files[0].newPath, 'src/api/users.js');
  assert.equal(files[0].added, 3);
  assert.equal(files[1].newPath, 'tests/api/users.test.js');
  assert.equal(files[1].added, 4);
});

test('infers scope from first meaningful path segment', () => {
  const files = parsePatch(sampleDiff);

  assert.equal(inferScope(files), 'api');
});

test('classifies feature diffs', () => {
  const files = parsePatch(sampleDiff);

  assert.equal(inferType(files, sampleDiff), 'feat');
});

test('classifies documentation diffs', () => {
  const diff = [
    'diff --git a/README.md b/README.md',
    'index 1111111..2222222 100644',
    '--- a/README.md',
    '+++ b/README.md',
    '@@ -1 +1 @@',
    '-Old docs',
    '+New docs'
  ].join('\n');
  const files = parsePatch(diff);

  assert.equal(inferType(files, diff), 'docs');
});

test('classifies fix diffs', () => {
  const diff = [
    'diff --git a/src/index.js b/src/index.js',
    'index 1111111..2222222 100644',
    '--- a/src/index.js',
    '+++ b/src/index.js',
    '@@ -1 +1 @@',
    '-throw new Error("crash")',
    '+fix crash by returning null'
  ].join('\n');
  const files = parsePatch(diff);

  assert.equal(inferType(files, diff), 'fix');
});

test('classifies large rewrites as refactor', () => {
  const lines = [
    'diff --git a/src/report.js b/src/report.js',
    '--- a/src/report.js',
    '+++ b/src/report.js',
    '@@ -1,120 +1,120 @@'
  ];
  for (let index = 0; index < 120; index += 1) lines.push(`-old line ${index}`);
  for (let index = 0; index < 120; index += 1) lines.push(`+new line ${index}`);
  const diff = lines.join('\n');
  const files = parsePatch(diff);

  assert.equal(files[0].changed, 240);
  assert.equal(inferType(files, diff), 'refactor');
});

test('classifies deletions-only diffs as refactor', () => {
  const diff = [
    'diff --git a/src/legacy.js b/src/legacy.js',
    '--- a/src/legacy.js',
    '+++ b/src/legacy.js',
    '@@ -1,3 +1,0 @@',
    '-one()',
    '-two()',
    '-three()'
  ].join('\n');
  const files = parsePatch(diff);

  assert.equal(inferType(files, diff), 'refactor');
});

test('infers scope when the CLI passes a null scope option', () => {
  const commit = suggest(sampleDiff, { maxSummary: 72 });

  assert.equal(commit.scope, 'api');
  assert.match(run(['node', 'commit-name.js', 'suggest', '--diff-file', examplePatchPath]).output, /^feat\(api\): /);
});

test('treats an empty scope as missing and keeps explicit overrides', () => {
  assert.equal(suggest(sampleDiff, { scope: null }).scope, 'api');
  assert.equal(suggest(sampleDiff, { scope: '' }).scope, 'api');
  assert.equal(suggest(sampleDiff, { scope: 'billing' }).scope, 'billing');
});

test('generates a conventional commit', () => {
  const commit = suggest(sampleDiff, { maxSummary: 72 });

  assert.equal(commit.type, 'feat');
  assert.equal(commit.scope, 'api');
  assert.equal(commit.summary, 'add user module');
  assert.equal(commit.subject, 'feat(api): add user module');
  assert.equal(commit.files.includes('src/api/users.js'), true);
});

test('derives a non-duplicated summary without hardcoded feature wording', () => {
  const commit = suggest(sampleDiff, { maxSummary: 72 });
  const words = commit.summary.split(/\s+/);

  assert.equal(commit.summary, 'add user module');
  assert.equal(commit.summary.includes('endpoint'), false);
  assert.equal(commit.summary.includes('user lookup'), false);
  assert.equal(new Set(words).size, words.length);
});

test('picks the most changed non-test file for the summary', () => {
  const diff = [
    'diff --git a/src/api/users.js b/src/api/users.js',
    '--- a/src/api/users.js',
    '+++ b/src/api/users.js',
    '@@ -1 +1 @@',
    '-old',
    '+new',
    'diff --git a/src/core/engine.js b/src/core/engine.js',
    '--- a/src/core/engine.js',
    '+++ b/src/core/engine.js',
    '@@ -1,10 +1,10 @@',
    ...Array.from({ length: 10 }, (_, index) => `-old ${index}`),
    ...Array.from({ length: 10 }, (_, index) => `+new ${index}`)
  ].join('\n');
  const commit = suggest(diff, { scope: 'core' });

  assert.equal(commit.summary, 'add engine module');
});

test('generates sample output from the bundled patch', () => {
  const generated = sample();
  const expected = suggest(fs.readFileSync(examplePatchPath, 'utf8'), { maxSummary: 72, maxBody: 100 });

  assert.deepEqual(generated, expected);
  assert.equal(generated.subject, 'feat(api): add user module');
  assert.deepEqual(run(['node', 'commit-name.js', 'sample']), { exitCode: 0, output: generated.message });
});

test('turns git failures into actionable errors', () => {
  assert.match(
    gitFailureMessage({ stderr: 'fatal: not a git repository (or any of the parent directories): .git' }),
    /not a git repository.*--diff-file/
  );
  assert.match(
    gitFailureMessage({ message: 'Command failed: git diff --cached\nfatal: not a git repository' }),
    /not a git repository.*--diff-file/
  );
  assert.match(gitFailureMessage({ code: 'ENOENT' }), /git is not installed.*--diff-file/);
  assert.match(gitFailureMessage({ stderr: 'fatal: bad revision HEAD' }), /git diff failed.*--diff-file/);
});

test('supports explicit commit overrides and footers', () => {
  const commit = suggest(sampleDiff, {
    type: 'feat',
    scope: 'api',
    summary: 'add user lookup endpoint',
    body: 'Custom body',
    footer: 'Closes #12',
    breaking: true
  });

  assert.equal(commit.subject, 'feat(api): add user lookup endpoint');
  assert.equal(commit.body, 'Custom body');
  assert.equal(commit.footer.includes('BREAKING CHANGE'), true);
  assert.equal(commit.footer.includes('Closes #12'), true);
  assert.equal(commit.message.includes('Custom body'), true);
});
