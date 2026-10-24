# Commit 类型启发式规则

[English](./heuristics.md) | 中文

`commit-name` 使用确定性规则，因此可以离线运行并产生稳定输出。

## Type 选择顺序

1. 如果超过一半的变更文件路径中包含 `test`、`tests`、`__tests__`、`spec` 或 `specs` 路径段，返回 `test`。
2. 如果超过一半的变更文件使用 `.md`、`.mdx`、`.rst` 或 `.txt` 扩展名，返回 `docs`。
3. 如果 diff 文本包含修复类关键词（`fix`、`bug`、`error`、`crash`、`fail`、`regression`），返回 `fix`。
4. 如果 diff 变更超过 100 行且没有功能关键词，或者只删除行，返回 `refactor`。
5. 如果 diff 新增了行，或包含功能关键词（`add`、`create`、`introduce`、`support`、`enable`、`implement`），返回 `feat`。
6. 其他维护性变更返回 `chore`。

关键词检查是对整个 diff（包括 hunk 内容）做不区分大小写的子串匹配。

## Scope 推断

scope 是第一个变更文件的第一个有意义的路径段：

```text
src/api/users.js -> api
tests/api/users.test.js -> api
.github/workflows/ci.yml -> workflows
```

会被忽略的 scope 段包括：

```text
src
lib
packages
test
tests
__tests__
```

包含点号的路径段（例如 `index.js` 或 `.github` 这样的文件名）也会被跳过。如果没有符合条件的路径段，subject 将不带 scope。

## Summary 生成

默认 summary 是确定性的：

- `docs` -> `update documentation`
- `test` -> `add test coverage`
- `chore` -> `update project configuration`
- `refactor` -> `refactor internal structure`
- `fix` -> `fix reported issue`
- `feat` -> `add <resource> module`

resource 来自变更行数最多的非测试文件：取去掉扩展名后的文件名、转为单数，并将 `index`、`main`、`utils` 等通用文件名替换为其父目录。如果某个候选与 scope 重复，且还存在其他候选，则跳过该候选。

例如，内置 patch 变更了 `src/api/users.js` 和 `tests/api/users.test.js`。测试文件会被排除在 resource 查找之外，因此非测试文件胜出，生成：

```text
feat(api): add user module
```

subject 默认限制为 72 个字符。可以使用 `--summary` 覆盖。

## 覆盖参数

CLI 覆盖不会跳过校验。CLI 仍会校验：

- commit type 是否为已知 Conventional Commits type
- `--max-summary` 和 `--max-body` 是否为大于等于 20 的整数
- `--scope` 是否只包含字母、数字和连字符
- 是否提供了 diff 来源

空的 `--scope` 值会被视为未提供，因此 scope 推断仍会执行。
