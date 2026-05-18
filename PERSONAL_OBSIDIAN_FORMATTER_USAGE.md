# 个人 Obsidian Formatter 使用边界

本文档说明当前个人 formatter 的权威入口、兼容入口和不建议叠加的 Obsidian Linter 规则。

## 权威入口

个人 formatter 的权威入口是 Obsidian 命令：

```text
Format current note with personal Obsidian formatter
Preview current note with personal Obsidian formatter
```

这两个命令直接调用：

```ts
formatPersonalObsidianMarkdown()
```

它们不经过普通 Obsidian Linter 的完整规则流水线，因此输出更接近“个人一键格式化 profile”的定义。

## 兼容入口

当前仍保留普通 Linter 规则：

```text
Personal Obsidian formatter
```

它也是调用同一个 `formatPersonalObsidianMarkdown()`，但如果通过普通 lint 流程运行，它会和其他 Linter 规则先后叠加。

这条路径适合作为兼容入口，不建议把它当作个人 formatter 的主要使用方式。

## 不建议同时启用的规则

如果启用了普通 Linter 规则形式的 `Personal Obsidian formatter`，不建议同时启用下列规则，否则输出可能被二次修改：

- `trailing-spaces`
- `consecutive-blank-lines`
- `empty-line-around-tables`
- `empty-line-around-blockquotes`
- `empty-line-around-math-block`
- `move-math-block-indicators-to-own-line`
- `blockquote-style`
- `heading-blank-lines`
- `paragraph-blank-lines`

推荐使用方式是：用个人 formatter 的一键命令处理当前笔记，用普通 Obsidian Linter 规则处理其他通用 lint 需求。

## 当前兼容行为

当前 formatter 函数已经支持显式三态：

```ts
mathPlacement?: 'keep' | 'move-into-callout' | 'move-out-of-callout';
```

兼容旧选项：

```ts
moveMathIntoCallout?: boolean;
```

旧选项映射为 profile 策略：

- `true` -> `move-into-callout`
- `false` -> `move-out-of-callout`，用于保持历史行为

General tab 全局设置和普通 Linter 规则 UI 都已经使用三态下拉。旧 boolean 配置仍会被读取：

- 旧 `move-math-into-callout: true` -> `move-into-callout`
- 旧 `move-math-into-callout: false` -> `move-out-of-callout`

## 后续待处理风险

第一阶段测试中曾保留的行内数学高风险点已经修复并纳入回归测试：

- 保护行内 code span，避免其中的 `$...$` 被行内数学空格规则修改。
- 保护 URL query string，避免 `$` 被误判。
- 保护货币金额，避免 `$5` 一类内容被误判。
