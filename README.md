# commit-name

English | [中文](./README.zh.md)

[![CI](https://github.com/zjh1880/commit-name/actions/workflows/ci.yml/badge.svg)](https://github.com/zjh1880/commit-name/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

`commit-name` generates conventional commit messages from your current git diff.

It is designed for developers who want better commit history without stopping to craft perfect messages by hand.

## Install

```bash
npm install -g commit-name
```

Or run it without installing globally:

```bash
npx commit-name suggest --staged
```

## Quick start

Stage your changes:

```bash
git add src/api/users.js tests/api/users.test.js
```

Generate a commit message from the staged diff:

```bash
commit-name suggest --staged
```

The bundled example patch produces the same message without touching git state:

```bash
commit-name suggest --diff-file examples/diff-sample.patch
```

```text
feat(api): add user module

- src/api/users.js
- tests/api/users.test.js
```

Use it with git:

```bash
git commit -m "$(commit-name suggest --staged --format text)"
```

## Commands

### `suggest`

Generate a conventional commit message from a diff.

```bash
commit-name suggest --staged
commit-name suggest --worktree
commit-name suggest --diff-file examples/diff-sample.patch
```

Options:

| Option | Default | Description |
|---|---|---|
| `--staged` | `false` | Read `git diff --cached`. |
| `--worktree` | `false` | Read unstaged `git diff`. |
| `--diff-file <path>` | none | Read a patch file instead of running git. |
| `--type <type>` | inferred | Override commit type. |
| `--scope <scope>` | inferred | Override commit scope. |
| `--summary <summary>` | inferred | Override commit summary. |
| `--body <message>` | file list | Override generated body. |
| `--footer <footer>` | none | Append a Conventional Commits footer. |
| `--breaking` | `false` | Append a default `BREAKING CHANGE` footer. |
| `--format <text\|json>` | `text` | Output format. |
| `--max-summary <number>` | `72` | Maximum subject line length. |
| `--max-body <number>` | `100` | Maximum generated body line length. |
| `-h, --help` | `false` | Print usage to stdout and exit 0. |

### `sample`

Print an example commit message without reading git state.

```bash
commit-name sample
```

```text
feat(api): add user module

- src/api/users.js
- tests/api/users.test.js
```

`sample` runs the normal pipeline over `examples/diff-sample.patch`, so it always matches `suggest --diff-file examples/diff-sample.patch`.

### `--help`

```bash
commit-name --help
```

Prints the full usage text to stdout and exits with code 0. `-h` is an alias.

## Overrides

Use overrides when the heuristic is close but you want a specific message:

```bash
commit-name suggest --diff-file examples/diff-sample.patch \
  --type feat \
  --scope api \
  --summary "add user lookup endpoint" \
  --footer "Closes #12"
```

```text
feat(api): add user lookup endpoint

- src/api/users.js
- tests/api/users.test.js

Closes #12
```

Mark breaking changes explicitly:

```bash
commit-name suggest --diff-file examples/diff-sample.patch --breaking
```

```text
feat(api): add user module

- src/api/users.js
- tests/api/users.test.js

BREAKING CHANGE: This commit introduces a breaking change.
```

## Conventional commit types

`commit-name` uses deterministic heuristics. The rules are evaluated in this order:

| Type | Trigger |
|---|---|
| `test` | More than half of the changed files contain a `test`, `tests`, `__tests__`, `spec`, or `specs` path segment. |
| `docs` | More than half of the changed files have a `.md`, `.mdx`, `.rst`, or `.txt` extension. |
| `fix` | The diff text contains `fix`, `bug`, `error`, `crash`, `fail`, or `regression` (case-insensitive substring match). |
| `refactor` | More than 100 changed lines without a feature keyword, or a diff that only deletes lines. |
| `feat` | The diff adds lines, or its text contains a feature keyword: `add`, `create`, `introduce`, `support`, `enable`, or `implement`. |
| `chore` | Fallback when no rule above matches, such as a mode-only change. |

The scope is inferred from the first meaningful path segment of the first changed file. `src`, `lib`, `packages`, `test`, `tests`, and `__tests__` are skipped, as are segments that contain a dot (file names). If no segment qualifies, the subject has no scope.

For inferred `feat` summaries, the resource is the most-changed non-test file, singularized, with generic basenames such as `index` or `main` replaced by their parent directory. The other types use fixed summaries (`update documentation`, `add test coverage`, `refactor internal structure`, `fix reported issue`, and `update project configuration`).

## JSON output

```bash
commit-name suggest --diff-file examples/diff-sample.patch --format json
```

```json
{
  "type": "feat",
  "scope": "api",
  "summary": "add user module",
  "subject": "feat(api): add user module",
  "body": "- src/api/users.js\n- tests/api/users.test.js",
  "footer": "",
  "message": "feat(api): add user module\n\n- src/api/users.js\n- tests/api/users.test.js",
  "files": [
    "src/api/users.js",
    "tests/api/users.test.js"
  ]
}
```

## GitHub Actions example

Use it in CI to show the suggested message before merge:

```yaml
- name: Suggest commit message
  run: npx commit-name suggest --worktree --format json
```

## Examples

```bash
commit-name suggest --diff-file examples/diff-sample.patch
commit-name suggest --diff-file examples/diff-sample.patch --format json
commit-name sample
```

## Development

```bash
npm install
npm test
npm run lint
```

This project intentionally has no runtime dependencies.

## Project structure

```text
commit-name/
  src/commit-name.js       # CLI implementation
  tests/commit-name.test.js # Built-in Node.js tests
  examples/diff-sample.patch
  docs/heuristics.md
  docs/heuristics.zh.md
  .github/workflows/ci.yml
```

## Roadmap

- [ ] Add AI provider adapters for OpenAI, Anthropic, and local models.
- [ ] Add interactive selection when multiple suggestions are possible.
- [ ] Add a commit-msg git hook.

## License

MIT
