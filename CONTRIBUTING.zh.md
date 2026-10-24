# 贡献指南

[English](./CONTRIBUTING.md) | 中文

感谢贡献 `commit-name`。

## 开发环境

```bash
npm install
npm test
npm run lint
npm run ci
```

## Pull Request 检查清单

- 新增或修改启发式规则时必须更新测试。
- README 示例需要与 CLI 行为保持一致。
- 中文文档更新时同步更新 `docs/heuristics.zh.md`。
- 用户可见变化需要更新 `CHANGELOG.md` 和 `CHANGELOG.zh.md`。
- 提交前运行 `npm run ci`。

## 代码风格

- 使用 CommonJS，保持 CLI 零构建运行。
- 启发式规则需要可解释、可测试、可复现。
- 默认 CLI 路径不访问网络。
- 不引入运行时依赖，除非 README 明确说明原因。
