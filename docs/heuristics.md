# Commit type heuristics

English | [中文](./heuristics.zh.md)

`commit-name` uses deterministic rules so it works offline and produces stable output.

## Type selection order

1. `test` if more than half of the changed files have a `test`, `tests`, `__tests__`, `spec`, or `specs` path segment.
2. `docs` if more than half of the changed files have a `.md`, `.mdx`, `.rst`, or `.txt` extension.
3. `fix` if the diff text contains a fix-like word (`fix`, `bug`, `error`, `crash`, `fail`, `regression`).
4. `refactor` if the diff changes more than 100 lines without a feature word, or if it only deletes lines.
5. `feat` if the diff adds lines or contains a feature word (`add`, `create`, `introduce`, `support`, `enable`, `implement`).
6. `chore` as the maintenance fallback.

Word checks are case-insensitive substring matches over the whole diff, including hunk content.

## Scope inference

The scope is the first meaningful path segment of the first changed file:

```text
src/api/users.js -> api
tests/api/users.test.js -> api
.github/workflows/ci.yml -> workflows
```

Ignored scope segments include:

```text
src
lib
packages
test
tests
__tests__
```

Segments that contain a dot (file names such as `index.js` or `.github`) are skipped as well. If no segment qualifies, the subject has no scope.

## Summary generation

The default summary is deterministic and offline:

- `docs` -> `update documentation`
- `test` -> `add test coverage`
- `chore` -> `update project configuration`
- `refactor` -> `refactor internal structure`
- `fix` -> `fix reported issue`
- `feat` -> `add <resource> module`

The resource is taken from the most-changed non-test file: the file name without its extension, singularized, with generic basenames such as `index`, `main`, or `utils` replaced by their parent directory. A candidate that duplicates the scope is skipped when another candidate exists.

For example, the bundled patch changes `src/api/users.js` and `tests/api/users.test.js`. Test files are excluded from the resource search, so the non-test file wins and the result is:

```text
feat(api): add user module
```

The subject is capped at 72 characters by default. Use `--summary` to override it.

## Overrides

CLI overrides do not replace validation. The CLI still validates:

- commit type is a known Conventional Commits type
- `--max-summary` and `--max-body` are integers greater than or equal to 20
- `--scope` contains only letters, numbers, and hyphens
- a diff source is provided

An empty `--scope` value is treated as missing, so scope inference still runs.
