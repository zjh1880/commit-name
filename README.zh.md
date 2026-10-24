# commit-name

[English](./README.md) | 中文

[![CI](https://github.com/zjh1880/commit-name/actions/workflows/ci.yml/badge.svg)](https://github.com/zjh1880/commit-name/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

`commit-name` 会根据当前 git diff 生成 conventional commit message。

它适合希望保持提交历史清晰、但不想每次手动推敲 commit message 的开发者。

## 安装

```bash
npm install -g commit-name
```

也可以不全局安装：

```bash
npx commit-name suggest --staged
```

## 快速开始

暂存变更：

```bash
git add src/api/users.js tests/api/users.test.js
```

从暂存区生成 commit message：

```bash
commit-name suggest --staged
```

使用内置示例 patch，可以在不读取 git 状态的情况下得到相同结果：

```bash
commit-name suggest --diff-file examples/diff-sample.patch
```

```text
feat(api): add user module

- src/api/users.js
- tests/api/users.test.js
```

配合 git 使用：

```bash
git commit -m "$(commit-name suggest --staged --format text)"
```

## 命令

### `suggest`

从 diff 生成 conventional commit message。

```bash
commit-name suggest --staged
commit-name suggest --worktree
commit-name suggest --diff-file examples/diff-sample.patch
```

选项：

| 选项 | 默认值 | 说明 |
|---|---|---|
| `--staged` | `false` | 读取 `git diff --cached`。 |
| `--worktree` | `false` | 读取未暂存的 `git diff`。 |
| `--diff-file <path>` | none | 读取 patch 文件，不调用 git。 |
| `--type <type>` | inferred | 覆盖 commit type。 |
| `--scope <scope>` | inferred | 覆盖 scope。 |
| `--summary <summary>` | inferred | 覆盖 summary。 |
| `--body <message>` | file list | 覆盖 body。 |
| `--footer <footer>` | none | 追加 Conventional Commits footer。 |
| `--breaking` | `false` | 追加默认 `BREAKING CHANGE` footer。 |
| `--format <text\|json>` | `text` | 输出格式。 |
| `--max-summary <number>` | `72` | subject 最大长度。 |
| `--max-body <number>` | `100` | body 每行最大长度。 |
| `-h, --help` | `false` | 将用法输出到 stdout 并以退出码 0 结束。 |

### `sample`

输出示例 commit message，不读取 git 状态。

```bash
commit-name sample
```

```text
feat(api): add user module

- src/api/users.js
- tests/api/users.test.js
```

`sample` 会在 `examples/diff-sample.patch` 上运行同一套流程，因此始终与 `suggest --diff-file examples/diff-sample.patch` 一致。

### `--help`

```bash
commit-name --help
```

将完整用法输出到 stdout，并以退出码 0 结束。`-h` 是别名。

## 覆盖推断结果

当自动推断接近正确但你想手动指定时，可以使用覆盖参数：

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

标记破坏性变更：

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

`commit-name` 使用确定性启发式规则，并按以下顺序判断：

| Type | 触发条件 |
|---|---|
| `test` | 超过一半的变更文件路径中包含 `test`、`tests`、`__tests__`、`spec` 或 `specs` 路径段。 |
| `docs` | 超过一半的变更文件使用 `.md`、`.mdx`、`.rst` 或 `.txt` 扩展名。 |
| `fix` | diff 文本中包含 `fix`、`bug`、`error`、`crash`、`fail` 或 `regression`（不区分大小写的子串匹配）。 |
| `refactor` | 变更行数超过 100 且没有功能关键词，或者 diff 只删除行。 |
| `feat` | diff 新增了行，或文本中包含功能关键词：`add`、`create`、`introduce`、`support`、`enable`、`implement`。 |
| `chore` | 以上规则都不匹配时的兜底，例如仅权限变更。 |

scope 会从第一个变更文件的第一个有意义的路径段推断。`src`、`lib`、`packages`、`test`、`tests`、`__tests__` 会被跳过，包含点号的路径段（文件名）也会被跳过。如果没有符合条件的路径段，subject 将不带 scope。

对于推断出的 `feat` summary，resource 来自变更行数最多的非测试文件：取其文件名、转为单数，并将 `index`、`main` 等通用文件名替换为其父目录。其他 type 使用固定 summary（`update documentation`、`add test coverage`、`refactor internal structure`、`fix reported issue`、`update project configuration`）。

## JSON 输出

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

## GitHub Actions 示例

```yaml
- name: Suggest commit message
  run: npx commit-name suggest --worktree --format json
```

## 示例

```bash
commit-name suggest --diff-file examples/diff-sample.patch
commit-name suggest --diff-file examples/diff-sample.patch --format json
commit-name sample
```

## 开发

```bash
npm install
npm test
npm run lint
npm run ci
```

本项目没有运行时依赖。

## 项目结构

```text
commit-name/
  src/commit-name.js
  tests/commit-name.test.js
  examples/diff-sample.patch
  docs/heuristics.md
  docs/heuristics.zh.md
  .github/workflows/ci.yml
```

## 路线图

- [ ] 增加 OpenAI、Anthropic、本地模型 adapter。
- [ ] 增加交互式选择。
- [ ] 增加 commit-msg git hook。

## License

MIT
