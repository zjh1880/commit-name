# Contributing

English | [中文](./CONTRIBUTING.zh.md)

Thank you for contributing to `commit-name`.

## Development setup

```bash
npm install
npm test
npm run lint
```

## Pull request checklist

- Add or update tests for new heuristics.
- Keep README examples in sync with CLI behavior.
- Update `docs/heuristics.md` when type detection changes.
- Run `npm run ci` before opening a pull request.

## Code style

- Use CommonJS because the CLI has no build step.
- Keep heuristics explainable and deterministic.
- Avoid network calls in the default CLI path.
