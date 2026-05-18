# 个人 Obsidian Formatter 重构方案

生成日期：2026-05-18

本文档基于 `PERSONAL_OBSIDIAN_FORMATTER_REVIEW.md`，用于指导后续重构实施。核心原则是：先冻结行为，再机械拆分，再抽象 scanner 和策略对象，避免在没有安全网的情况下重写当前 formatter。

## 1. 重构目标

当前 `src/utils/personal-obsidian-formatter.ts` 已经承担了一个小型 Obsidian-aware formatter 的职责。重构目标不是推倒重写，而是把它整理成可解释、可测试、可继续扩展的个人格式化 profile。

目标状态：

1. 一键格式化命令是权威主路径。
2. 普通 Linter 规则入口只是兼容层。
3. 每个格式化模块职责清晰。
4. code fence、math block、callout、table 等结构由统一 scanner 识别。
5. 每个模块能单独测试，后续微调不再依赖整文件猜测。

## 2. 推荐目录结构

计划新增目录：

```text
src/utils/personal-formatter/
  index.ts
  types.ts
  profile.ts
  line-utils.ts
  scan.ts
  math-block.ts
  inline-math.ts
  callout.ts
  spacing.ts
  headings.ts
```

保留兼容入口：

```text
src/utils/personal-obsidian-formatter.ts
```

该文件最终只负责转发：

```ts
export {formatPersonalObsidianMarkdown} from './personal-formatter';
export type {PersonalObsidianFormatterOptions} from './personal-formatter';
```

这样 `src/main.ts` 和 `src/rules/personal-obsidian-formatter.ts` 可以暂时不大改。

## 3. 阶段一：冻结当前行为

目的：先补安全网，不做结构重构，不改变 formatter 语义。

本阶段执行内容：

1. 增加幂等性测试：`format(format(text)) === format(text)`。
2. 使用真实笔记 `.formatted.md` 文件做完整 baseline 对比。
3. 增加空文件行为测试，锁定当前输出为一个最终换行。
4. 增加未闭合 code fence 行为测试，锁定当前保守保护策略。
5. 明确 callout 内空引用行当前会被删除，并用测试锁定。
6. 将 code span、URL、货币金额等行内数学风险点记录为待修复测试，不在本阶段改变实现。

验收标准：

```bash
npm test -- --runTestsByPath __tests__/personal-obsidian-formatter.test.ts __tests__/personal-obsidian-formatter-real-notes.test.ts
```

必须通过。

## 4. 阶段二：机械拆分模块

目的：降低单文件复杂度，但不改变行为。

推荐拆分顺序：

1. `types.ts`：公共类型。
2. `line-utils.ts`：换行、code fence mask、heading/tag 判断等纯工具。
3. `math-block.ts`：块数学格式化。
4. `inline-math.ts`：行内数学空格。
5. `callout.ts`：callout 与数学归属。
6. `spacing.ts`：基础清理、表格/callout 渲染不变量。
7. `headings.ts`：个人标题空行策略。
8. `index.ts`：总流水线。

原则：

- 每搬一个模块跑一次相关测试。
- 只搬代码，不顺手修行为。
- 旧入口文件保持兼容。

## 5. 阶段三：统一 Scanner

目的：消除各模块重复用正则猜结构的问题。

建议类型：

```ts
export type SpanKind =
  | 'codeFence'
  | 'mathBlock'
  | 'callout'
  | 'table'
  | 'yaml'
  | 'customIgnore';

export type TextSpan = {
  kind: SpanKind;
  start: number;
  end: number;
  meta?: Record<string, unknown>;
};

export type ScanResult = {
  lines: string[];
  spans: TextSpan[];
};
```

`scan.ts` 负责：

- `scanCodeFences`
- `scanMathBlocks`
- `scanCallouts`
- `scanTables`
- `scanYamlFrontmatter`
- `scanProtectedSpans`

后续模块通过 scanner 查询结构，而不是各自重新判断。

## 6. 阶段四：策略配置化

当前 `moveMathIntoCallout: boolean` 语义不足，尤其是 `false` 时会触发“移出 callout math”的反向行为。建议内部引入 profile：

```ts
export type PersonalFormatterProfile = {
  mathBlock: {
    normalizeBlockMath: boolean;
    collapseSimpleEquations: boolean;
  };
  inlineMath: {
    normalizeSpacing: boolean;
  };
  callout: {
    mathPlacement: 'keep' | 'move-into-callout' | 'move-out-of-callout';
    preserveInternalBlankQuoteLines: boolean;
  };
  spacing: {
    tableBlankLines: 'one';
    calloutBlankLines: 'one-around' | 'adjacent-only';
  };
  headings: {
    strategy: 'personal-compact' | 'none';
  };
};
```

旧配置映射：

- `moveMathIntoCallout: true` -> `mathPlacement: 'move-into-callout'`
- `moveMathIntoCallout: false` 未来建议改为 `mathPlacement: 'keep'`
- 需要反向迁移时，显式使用 `mathPlacement: 'move-out-of-callout'`

## 7. 阶段五：入口边界收敛

建议明确：

- 一键命令是个人 formatter 的权威入口。
- 普通 Linter 规则入口保留，但作为兼容层。
- 文档中提示不要同时启用与个人 formatter 重叠严重的 spacing/math/callout 规则。

重叠高风险规则：

- `trailing-spaces`
- `consecutive-blank-lines`
- `empty-line-around-tables`
- `empty-line-around-blockquotes`
- `empty-line-around-math-block`
- `move-math-block-indicators-to-own-line`
- `blockquote-style`
- `heading-blank-lines`
- `paragraph-blank-lines`

## 8. 推荐实施顺序

```text
Step 1: 添加第一阶段安全测试，不改 formatter 实现。
Step 2: 新建 personal-formatter/ 目录，机械拆分现有代码。
Step 3: 保留旧 import 入口，保证 main/rule 不大改。
Step 4: 引入 profile.ts，把 boolean 选项转换为内部策略对象。
Step 5: 引入 scan.ts，逐步替换重复 mask/regex 判断。
Step 6: 修复高风险模块：inline math、callout、math collapse。
Step 7: 更新 review 文档和 README，写清楚主入口与限制。
```

## 9. 当前决策

第一阶段只冻结当前行为。已经确认存在风险但暂不改变的点，使用待修复测试或文档记录：

- 行内 code span 中的 `$...$` 当前可能被当作数学处理。
- URL 和货币金额需要更严格保护。
- `moveMathIntoCallout: false` 当前仍会执行反向迁移。
- callout 内空引用行当前会被删除。

这些问题放到 scanner 和 profile 引入后统一处理，避免第一阶段混入行为变更。

## 10. 当前进度

已完成：

1. 第一阶段：行为冻结测试和真实笔记 baseline。
2. 第二阶段：将 `personal-obsidian-formatter.ts` 机械拆分为 `src/utils/personal-formatter/` 模块目录。
3. 第三阶段：新增 `scan.ts`，并将 code fence / math block mask 入口集中到 scanner。
4. 第四阶段：新增 `profile.ts`，把旧 boolean 选项映射为内部 profile 策略。
5. 第五阶段：新增 `PERSONAL_OBSIDIAN_FORMATTER_USAGE.md`，明确一键命令为权威入口、普通规则为兼容入口，并记录冲突规则。
6. 后续推进：`scan.ts` 已继续承接 table、callout、YAML frontmatter、custom ignore span 识别；spacing 模块已改为消费 table/callout span。
7. 策略入口收敛：General tab 和普通 Linter 规则 UI 都已迁移为显式三态下拉，并保留旧 boolean 配置 fallback。
8. 保护策略收敛：YAML frontmatter 和 custom linter ignore span 已接入 math、inline math、callout、spacing、heading 模块保护逻辑。
9. Scanner 回归测试：新增 `__tests__/personal-formatter-scan.test.ts`，覆盖 YAML、custom ignore、code fence 内伪 ignore、callout/table 相邻和 math block 内部误识别。
10. Scanner helper 收敛：新增 `scanProtectedLineMask()`，模块侧不再重复拼装 YAML/custom ignore 保护 mask。
11. Scanner 缓存：`FormatContext` 新增 `scanResultCache`，同一轮 formatter pipeline 中同一份 `lines` 数组只扫描一次。
12. Scanner 查询 API：新增 `findBlockStartingAt()`，spacing 模块通过块级查询处理 callout/table，不再分别拼接 span 查询。
13. Profile 回归测试：新增 `__tests__/personal-formatter-profile.test.ts`，锁定默认 profile、旧 boolean 映射、显式三态优先级和默认 profile 不被污染。

后续可选优化：

暂无必须继续执行的重构项。后续只有在新增 formatter 结构或新个人规则时，再按当前 scanner/profile 模式扩展。
