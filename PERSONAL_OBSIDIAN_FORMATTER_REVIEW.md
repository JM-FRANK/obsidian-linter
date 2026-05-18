# 个人 Obsidian 格式化方案完整回顾

生成日期：2026-05-18

本文档回顾当前仓库里的个人格式化方案，重点覆盖功能模块、执行顺序、实现隐患和后续优化方案。当前分析基于工作区现状，其中 `src/utils/personal-obsidian-formatter.ts` 和 `__tests__/personal-obsidian-formatter.test.ts` 已有未提交改动，本文按这些改动后的代码作为事实来源。

## 1. 总体定位

当前个人格式化方案同时存在两种接入方式：

1. 独立一键命令：`src/main.ts` 注册了 `format-personal-obsidian-note` 和 `preview-personal-obsidian-note-format`，直接调用 `formatPersonalObsidianMarkdown()`，不经过普通 Linter 规则流水线。
2. 普通 Linter 规则：`src/rules/personal-obsidian-formatter.ts` 把同一个工具函数封装成 `RuleType.SPACING` 规则，可在规则系统中启用。

这意味着同一套格式化核心既能作为“个人一键格式化器”使用，也可能被普通 lint 流程调用。优点是复用集中，缺点是它和普通规则之间的职责边界变得模糊：如果用户同时启用个人规则和其他 spacing/math/callout 规则，最终效果会叠加，调试成本会明显上升。

核心实现集中在：

- `src/utils/personal-obsidian-formatter.ts`
- `src/rules/personal-obsidian-formatter.ts`
- `src/main.ts`
- `src/settings-data.ts`
- `src/ui/linter-components/tab-components/general-tab.ts`
- `__tests__/personal-obsidian-formatter.test.ts`
- `__tests__/personal-obsidian-formatter-real-notes.test.ts`

## 2. 当前执行入口

### 2.1 一键格式化命令

`src/main.ts` 中的命令入口直接读取编辑器内容，然后调用：

```ts
formatPersonalObsidianMarkdown(oldText, {
  moveMathIntoCallout: this.settings.commonStyles.personalFormatterMoveMathIntoCallout ?? true,
});
```

这条路径不会执行普通 Obsidian Linter 的 YAML、heading、spacing、paste 等规则，也不会读取单文件 YAML disabled rules。它更像一个独立 formatter profile。

优点：

- 行为稳定，较少受用户普通规则配置干扰。
- 更符合“个人一键格式化”目标。

风险：

- 它绕开普通 Linter 的 ignore 体系，包括 custom ignore section、YAML disabled rules、文件级规则开关。
- 用户如果以为它和普通 lint 完全一致，会对结果产生误解。
- `preview` 命令受 `enableDiffPreviewView` 控制，但实际格式化命令没有额外确认。

### 2.2 普通规则入口

`src/rules/personal-obsidian-formatter.ts` 将 formatter 注册为 `RuleType.SPACING`，默认选项 `moveMathIntoCallout = true`。

在普通 `RulesRunner` 中，非特殊规则按 `RuleTypeOrder` 和 `settingsKey` 排序执行；`SPACING` 类型在 YAML、Heading、Footnote、Content 之后执行。随后还会跑 post rules，包括 `BlockquoteStyle`、`TrailingSpaces`、`ConsecutiveBlankLines`、`AddBlankLineAfterYAML`、`YamlTimestamp`、`YamlKeySort`。

实际含义：

- 如果个人规则走普通 lint 流程，它不是最后执行。
- 后置规则可能继续改变个人格式化器刚刚整理出的空行、引用、YAML 等结构。
- 个人格式化器自身已经做 trailing spaces、blank lines、callout spacing，因此和 `TrailingSpaces`、`ConsecutiveBlankLines`、`Empty line around ...` 类规则存在职责重叠。

建议优先把“一键命令”作为主路径，把普通规则入口标注为高级/兼容入口，避免同时启用大量重叠规则。

## 3. 核心流水线

`formatPersonalObsidianMarkdown()` 当前内部顺序如下：

1. `linesOf()`
2. `normalizeBlockMath()`
3. `normalizeInlineMathSpacing()`
4. 根据选项执行 `moveFollowingMathIntoCallout()` 或 `moveMathOutOfCallouts()`
5. `normalizeBasicLineCleanup()`
6. `normalizeHeadingSpacing()`
7. `ensureTableAndCalloutSpacing()`
8. 去掉文件开头和结尾空行
9. 保证最终一个换行符

这个顺序和最初任务文档中的建议顺序大体一致，但有几个重要变化：

- 新增了行内数学空格处理。
- 新增了个人标题空行压缩策略。
- 新增了关闭 `moveMathIntoCallout` 后把 callout 内块数学移出的反向逻辑。
- 表格和 callout 渲染不变量放在最后重新应用，这是正确方向。

## 4. 模块实现情况

### 4.1 行拆分与结尾换行

`linesOf()` 会统一 CRLF/CR 到 LF，并通过 `replace(/\n+$/g, '')` 去掉尾部换行，再 `split('\n')`。最终输出总是 `${lines.join('\n')}\n`。

实现效果：

- 文件最终固定为 LF。
- 最终固定一个换行。
- 空文件会输出 `\n`，因为 `''.split('\n')` 得到 `['']`，后续 join 后仍补一个换行。

风险：

- 如果希望空文件保持空字符串，当前行为会引入一个换行。
- 会全局把 CRLF 改为 LF，这是 formatter 的隐式行为，需要接受或显式记录。

### 4.2 代码围栏保护

`getCodeFenceMask()` 用正则识别反引号或波浪号代码围栏，并将围栏起止行及内部全部标记为 protected。

实现效果：

- 大部分格式化模块都会跳过 code fence。
- 测试覆盖了数学内容、空 blockquote 行在 code fence 中保持不变。

风险：

- 只按行级围栏识别，不处理缩进代码块。
- 未闭合代码围栏会把后续所有行都视为 code fence，保护力度偏保守。
- `WeakMap<string[], boolean[]>` 缓存依赖同一个 lines 数组对象；每次产生新数组都要重新计算。性能上问题不大，但当前各模块重复调用较多。

优化建议：

- 建一个统一的 block scanner，一次扫描得到 code fence、math block、table、callout 等 token/span，后续模块共享。
- 对未闭合代码围栏增加测试，确认这是有意的保护策略。

### 4.3 块数学格式化

相关函数：

- `splitSingleMathFenceLine()`
- `normalizeBlockMath()`
- `cleanLatexBlockContent()`
- `formatCleanLatexBlockContent()`
- `parseLatexMath()`
- `splitLatexEnvironmentBoundariesWithAst()`
- `splitLatexLineBreaksWithAst()`
- regex fallback 系列

当前能力：

- 把单行 `$$x=y$$` 展开为三行 fenced block。
- 把 `$$` 与普通文本同处一行时拆开。
- 简单公式多行合并为一行，并规范 `=` 周围空格。
- 对 `\begin{...}` / `\end{...}` 环境做边界拆行。
- 对 LaTeX `\\` 做换行拆分。
- 通过 `@unified-latex/unified-latex-util-parse` 尝试 AST 解析，失败时保守回退。
- 支持 callout 内带 `> $$` 前缀的块数学。

实现优点：

- 比单纯正则安全，尤其是避免把 `\cdot` 误判为换行。
- 有缓存 `latexParseCache`，减少同一公式重复解析。
- 如果数学块里混入 callout 或 heading，`cleanLatexBlockContent()` 会禁用 AST 变形，降低破坏 Markdown 结构的风险。

主要风险：

- `normalizeEquationSpacing()` 只处理 `=`，且会对任意简单公式做一行合并。复杂但无 environment 的多行公式可能被压成一行，语义或可读性受损。
- AST 解析失败时直接返回原 latex lines，但已经经过 trim、去空行、去 blockquote 前缀等清理，仍可能改变原文。
- `splitSingleMathFenceLine()` 对列表项内单行 `$$...$$` 选择不展开，这是测试覆盖的特例；但普通段落中与文字相邻的 `$$` 会拆行，可能改变作者原本的混排意图。
- `mathFencePrefix()` 只识别由若干 `>` 组成的 quote prefix 加 `$$`，对列表中的缩进数学块、嵌套列表数学块支持有限。

优化建议：

- 把“简单公式可压缩”的判定收紧，例如只在内容不含 `\\`、`\begin`、`\end`、`&`、`\left`/`\right`、多行注释、环境命令时合并。
- 为“保留多行数学”增加配置或注释标记。
- 将数学模块拆成独立文件并建立更细粒度单元测试，尤其覆盖 cases/matrix/aligned、未闭合 fence、列表缩进、引用嵌套。

### 4.4 行内数学空格

相关函数：

- `normalizeInlineMathSpacingInLine()`
- `findInlineMathEnd()`
- `shouldAddSpaceBeforeInlineMath()`
- `shouldAddSpaceAfterInlineMath()`
- `normalizeInlineMathSpacing()`

当前能力：

- 在中文/日文等正文与 `$A_i$` 之间补空格。
- 避开 code fence 和 math block。
- 标点前后做了 opening/closing punctuation 特判。

风险：

- 这是原任务中没有明确要求的新行为，影响面比块数学更广。
- 只按 `$...$` 扫描，可能误碰货币、shell 提示符、模板变量、美元金额。
- `findInlineMathEnd()` 不理解 Markdown code span，行内反引号里的 `$...$` 可能被改。
- 对 URL、HTML、脚注定义等上下文没有特殊保护。

优化建议：

- 将行内数学空格做成可独立开关，默认可考虑关闭或仅一键命令开启。
- 增加 code span 保护。
- 增加金额、英文缩写、路径、URL 测试。

### 4.5 Callout 与数学块归属

相关函数：

- `moveFollowingMathIntoCallout()`
- `moveMathOutOfCallouts()`
- `moveMathLineIntoCallout()`
- `findPlainMathBlockEnd()`
- `findMathBlockEndAtPrefix()`
- `isInlineMathParagraphStart()`
- `isInlineMathParagraphContinuation()`

当前能力：

- 默认把紧跟 callout 的块数学移入 callout，并给每行加 `> `。
- 支持多个连续数学块。
- 支持紧跟 callout 的行内数学段落移入 callout。
- 遇到空行则停止移动，当前测试里“空行隔开则不移动”。
- 关闭配置时，支持把 callout 内同层级块数学移出。

重要偏差：

- 最初任务写的是“blank lines between the callout and block math are allowed”，但当前测试与实现选择了“有空行则不移动”。这不是小细节，而是目标行为变化，需要明确以当前测试为准还是回到原任务。

风险：

- `moveFollowingMathIntoCallout()` 将连续的 `>` 行视为 callout 内容，遇到下一个 callout start 才停。普通 blockquote 跟在 callout 后面时可能被当作同一 callout 延续。
- 行内数学段落移入 callout 的判定比较粗，只要段落以 `$...$` 开始且续行包含 `$`，就可能被吸收。
- `moveMathOutOfCallouts()` 关闭开关时会把块数学移出 callout，但可能破坏用户本来刻意放在 callout 中的数学解释结构。这个选项语义更像“反向迁移”，不只是“禁用迁移”。

优化建议：

- 将开关语义拆成三态：`keep`、`move-into-callout`、`move-out-of-callout`，避免关闭开关时出现反向编辑的意外。
- 明确空行策略，并同步任务文档、测试、实现。
- 对普通 blockquote、嵌套 callout、列表内 callout 增加测试。

### 4.6 基础清理与空行压缩

`normalizeBasicLineCleanup()` 做三件事：

- 删除非 code fence 行尾空格。
- 删除只含 `>` / `> ` / 多层 `>` 的空引用行。
- 连续空行压成一个空行。

实现效果：

- 满足 trailing spaces 与 compact blank lines 的核心目标。
- 会把 callout 中用于视觉分隔的空引用行删除。

风险：

- 删除空引用行可能改变 blockquote/callout 内部段落分隔。在 Obsidian callout 里，`>` 空行有时用于在同一 callout 内制造段落。如果删除，段落会合并。
- 该函数在 `moveFollowingMathIntoCallout()` 之后执行，因此刚移动进去的数学块若含空引用行会被清掉。

优化建议：

- 区分“裸 blockquote 空行”与“callout 内结构性空行”。如果 callout 内连续正文段落需要分段，应保留 `>` 空行或转换为 Obsidian 能正确渲染的形式。
- 将“删除空引用行”独立成可测、可配置模块。

### 4.7 标题空行策略

`normalizeHeadingSpacing()` 是当前个人方案里最容易让人困惑的模块。它不只是压缩空行，而是依据 heading level、上一个内容所属 heading level、tag-only line 做个人化重排。

当前效果：

- 标题和正文之间通常不留空行。
- 同级标题之间在一些场景不留空行。
- 从内容块切换到不同级别标题时可能保留一个空行。
- tag-only 行不算作 heading block content，因此标签和下一个标题可能紧贴。

风险：

- 规则非常“个人化”，但函数名像通用 heading spacing，后续维护者难以从名字推断行为。
- 依赖 `currentContentHeadingLevel` 和 `latestHeadingLevel` 的状态机，可读性弱，边界情况难预估。
- 可能与原 Obsidian Linter 的 `heading-blank-lines`、`paragraph-blank-lines`、`empty-line-around-*` 规则互相打架。
- 对 Setext heading、ATX heading without space、标题后注释、标题后列表等情形未见明显覆盖。

优化建议：

- 改名为 `normalizePersonalHeadingSpacing()`。
- 在代码注释或文档里写出明确判定表。
- 将状态机拆成“分类行类型”和“根据前后行决定 blank policy”两层。
- 增加 markdown fixtures，而不是只靠少量内联测试。

### 4.8 表格和 Callout 渲染不变量

`ensureTableAndCalloutSpacing()` 放在流水线后段，负责重新给表格和 callout 周围设置空行。

表格检测：

- `isTableStart()` 要求当前行含未转义且不在 ruby `{...}` 内的 pipe。
- 下一行必须符合 delimiter。
- 表格持续到后续含 pipe、非空的行。

Callout 检测：

- `calloutStartRegex = /^>\s*\[![^\]]+\]/`
- callout block 持续到后续以 `>` 开头且不是下一个 callout start 的行。

实现效果：

- 表格前后保持一空行。
- 相邻 callout 之间保持一空行。
- 避免 ruby `{漢字|かんじ}` 被当表格 pipe。
- 避开 math block 内的 callout/table 误处理。

风险：

- 当前实现给每个 callout block 前后都加空行，不仅是“相邻 callout 分隔”。这和最初任务“相邻 callouts 保持一空行”的范围更宽。
- `pushSpacedBlock()` 会删除 result 末尾全部空行再补一个，因此可能改变前一个块的视觉间距。
- 表格行持续判断只要含未转义 pipe 就算表格行，表格后紧跟带 pipe 的普通文本可能被吞入表格。
- `hasUnescapedPipe()` 对 ruby 的识别非常简化，只要进入 `{` 到 `}` 就认为是 ruby；普通花括号文本中 pipe 也会被忽略，可能漏检表格。

优化建议：

- 表格检测改为更接近 GFM table 的行级 parser，至少判断每行 cell 结构。
- Callout spacing 改成“只保证 callout 与相邻块之间的必要空行”，并明确是否要对所有 callout 前后加空行。
- 对 ruby pipe、普通花括号 pipe、escaped pipe、表格后普通 pipe 文本增加测试。

## 5. 与 Obsidian Linter 原有规则的关系

当前个人 formatter 复用了项目基础设施，但核心格式化逻辑是独立实现，不是简单组合原有规则。

复用点：

- 命令注册、编辑器写回、diff preview：复用 `main.ts` 现有机制。
- 规则系统封装：复用 `RuleBuilder`。
- 设置页：复用 General tab 的 setting component。
- 测试框架：复用 Jest 与 `ruleTest()`。
- LaTeX 解析：引入 `@unified-latex/unified-latex-util-parse`。

与原有规则重叠明显的部分：

- `trailing-spaces`
- `consecutive-blank-lines`
- `empty-line-around-tables`
- `empty-line-around-blockquotes`
- `empty-line-around-math-block`
- `move-math-block-indicators-to-own-line`
- `blockquote-style`
- `heading-blank-lines`
- `paragraph-blank-lines`

主要风险不是“重复代码”本身，而是当个人规则作为普通 Linter 规则启用时，同一文本会被多套规则先后修改，最后输出不一定符合个人 profile 的最终不变量。

建议：

- 将一键命令路径作为权威行为。
- 如果保留普通规则入口，建议在文档中提示不要与上述规则同时启用，或为个人规则添加冲突禁用逻辑。

## 6. 测试现状

当前测试覆盖较丰富：

- trailing spaces
- blank lines
- table spacing
- adjacent callouts
- ruby syntax
- block math normalize
- LaTeX environment
- `\cdot` 防误判
- single-line math fence
- inline math spacing
- callout 吸收块数学/行内数学
- 配置关闭时移出 callout math
- code fence 保护
- comment boundary
- heading spacing
- tag-only line
- 两个真实笔记 fixture 的结构性断言

不足：

- 真实笔记测试只做结构性 invariant，没有比对 `.formatted.md` 基线文件。仓库里存在 formatted fixtures，但测试当前没有使用它们。
- 缺少幂等性测试：`format(format(text)) === format(text)`。
- 缺少 code span 保护测试。
- 缺少列表、嵌套列表、缩进 math/callout/table 测试。
- 缺少 YAML frontmatter 保护或影响范围测试。
- 缺少 custom ignore section 测试，尤其是一键命令路径是否应尊重 ignore。
- 缺少空文件测试。

建议优先补：

1. 幂等性测试。
2. 一键 formatter 与普通 Linter 规则启用时的差异测试。
3. code span、URL、货币金额中的 `$` 测试。
4. callout 内多段落空引用行是否保留的决策测试。
5. 真实 fixture 的 snapshot/baseline 对比测试。

## 7. 当前最大隐患排序

### P0：职责边界混乱

个人 formatter 同时是独立命令和普通规则。独立命令绕开普通 ignore 和规则配置；普通规则又会被其他规则前后夹击。后续每加一个微调，都可能只在其中一条路径成立。

建议：确定主路径。如果主路径是一键命令，就把普通规则入口降级为可选兼容层，并写明冲突规则。

### P1：行内数学空格影响面过广

行内 `$...$` 的识别天然容易误伤。当前没有 code span、URL、货币等上下文保护。

建议：加独立开关和保护测试。

### P1：Callout 空行和数学归属策略存在目标偏差

任务原文允许 callout 和 math 中间有空行仍移动；当前实现和测试是不移动。关闭开关时还会把已有 callout math 移出，语义容易误会。

建议：把策略写成明确配置，并同步任务文档。

### P1：Callout 内空引用行被删除

这会影响 callout 内分段。对学习笔记、证明、例题解释类内容，段落结构可能很重要。

建议：决定是否保留 callout 内 `>` 空行，并补测试。

### P2：数学格式化仍可能过度压缩

无 environment 的多行复杂公式会被合并。虽然有 AST 尝试，但“简单公式”的边界仍偏宽。

建议：收紧合并条件。

### P2：表格/ruby pipe 检测偏启发式

当前 ruby 保护逻辑简单有效，但不是真正解析 ruby；普通 `{...|...}` 会影响表格识别。

建议：抽出 table detector 并补更多 pipe 测试。

### P2：模块过大

`personal-obsidian-formatter.ts` 已经接近一个小型格式化器，混合了扫描、LaTeX AST、callout 归属、heading policy、spacing invariant。继续微调会越来越难。

建议：按职责拆文件，并用统一 scanner 串联。

## 8. 推荐优化路线

### 阶段一：冻结行为，补安全网

目标是先停止“越调越散”。

建议动作：

1. 增加幂等性测试。
2. 用 `.formatted.md` 真实 fixture 做完整输出对比。
3. 明确 callout + math 空行策略，并更新测试或任务文档。
4. 增加 code span、URL、货币金额、空文件、未闭合 code fence 测试。
5. 在 README 或根目录说明中标注个人 formatter 与普通 Linter 规则的关系。

### 阶段二：拆分模块

建议拆成：

- `personal-formatter/index.ts`：总流水线。
- `personal-formatter/scan.ts`：一次性扫描 code fence、math block、table、callout spans。
- `personal-formatter/math-block.ts`：块数学。
- `personal-formatter/inline-math.ts`：行内数学空格。
- `personal-formatter/callout.ts`：callout 与数学归属。
- `personal-formatter/spacing.ts`：基础空行、表格/callout invariant。
- `personal-formatter/headings.ts`：个人标题策略。

拆分原则：

- 每个模块只接收 lines 和 spans，返回 lines。
- 不在多个模块重复猜测 code fence/math block。
- 每个模块有自己的测试文件。

### 阶段三：策略配置化

建议把当前隐式个人偏好变成显式 profile：

```ts
type PersonalFormatterProfile = {
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

不一定要把所有配置暴露到 UI，但代码内部应该有清晰策略对象，避免每个新需求都变成散落的 `if`。

## 9. 建议的最终规则顺序

如果继续坚持当前“个人一键 formatter”方向，推荐稳定顺序如下：

1. 标准化换行。
2. 扫描 protected spans：code fence、YAML frontmatter、custom ignore、math block、callout、table。
3. 块数学归一化，只处理非 protected code/custom ignore 区域。
4. 行内数学空格，跳过 code fence、code span、URL、math block。
5. Callout 数学归属处理。
6. 基础行清理：尾随空格、连续空行。
7. 个人标题策略。
8. 渲染不变量修复：table、callout、必要 math spacing。
9. 去首尾多余空行。
10. 最终一个换行。
11. 幂等性断言测试保障。

注意：第 2 步最好是一次 scanner，而不是每个模块各自用正则重新猜。

## 10. 结论

当前个人格式化方案已经不只是“几个微调规则”，而是一个独立的 Obsidian-aware formatter。它的功能覆盖面已经包括数学、callout、表格、标题、行内数学、代码围栏保护和真实笔记 invariant，方向是成立的。

真正的风险在于：实现现在仍是一个大文件里的顺序变换集合，很多规则靠正则和局部状态互相配合。一旦继续增加小修小补，最容易出现“修 A 破 B”的屎山化趋势。

最值得马上做的是冻结当前行为、补幂等性和真实 fixture 对比测试，然后按 scanner + 模块化流水线拆分。这样后续新增个人偏好时，才是在一个可解释的 formatter profile 上扩展，而不是继续往同一个函数堆条件。
