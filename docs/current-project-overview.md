# 当前项目概况

生成日期：2026-05-31
工作路径：`D:\VibeCoding\obsidian-linter`

## 1. 项目一句话定位

这是一个基于上游 `platers/obsidian-linter` 的 Obsidian 社区插件分支，当前分支改造成了 `Linter by FRANK`。项目核心仍然是给 Obsidian Markdown 笔记提供可配置的 lint / format 能力；FRANK 分支额外加入了个人一键格式化器、格式化 diff 预览，以及围绕个人格式化器的 scanner/profile 重构。

## 2. 项目来源与身份

- 插件 manifest：`manifest.json`
- 插件 ID：`obsidian-linter-frank`
- 插件名：`Linter by FRANK`
- 当前版本：`1.31.2-by-FRANK`
- 原始上游：`https://github.com/platers/obsidian-linter.git`
- 当前 fork remote：`https://github.com/JM-FRANK/obsidian-linter.git`
- 当前本地分支：`master`
- 当前 HEAD：`cb9b7a8 test: cover personal formatter profile`

`package.json` 中项目名是 `obsidian-linter-frank`，说明它已经不是单纯的上游同步副本，而是面向个人使用场景定制过的 fork。

## 3. 当前项目在做什么

项目当前主要有两层工作。

第一层是保留 Obsidian Linter 原有能力：

- YAML/frontmatter 格式化。
- 标题、脚注、列表、引用、表格、代码块、数学块、空行、尾随空格等 Markdown 规则。
- 粘贴时清理规则。
- 自定义替换、自定义命令、忽略文件/文件夹、规则禁用等常规 Linter 能力。
- 多语言界面与自动生成文档。

第二层是 FRANK 分支新增和重点推进的能力：

- `Format current note with personal Obsidian formatter`：一键使用个人格式化 profile 格式化当前笔记。
- `Preview current note with personal Obsidian formatter`：先看 diff，再决定是否应用。
- `Preview lint file`：普通 lint 也支持工作区 diff 预览。
- `Personal Obsidian formatter` 普通规则入口：把同一个个人 formatter 封装成 Linter 规则，作为兼容路径。
- 个人 formatter 的模块化 pipeline：块数学、行内数学、callout、spacing、heading 分模块处理。
- 统一 scanner：集中识别 code fence、math block、callout、table、YAML frontmatter、custom ignore span。
- profile 策略：用 `mathPlacement` 三态替代含义不清的旧 boolean。

## 4. 主要目录结构

- `src/main.ts`：Obsidian 插件入口，注册命令、事件、设置页、diff preview view。
- `src/rules/`：每条 Linter 规则的实现，包括 FRANK 新增的 `personal-obsidian-formatter.ts`。
- `src/rules.ts`、`src/rules-runner.ts`、`src/rules-registry.ts`：规则定义、执行流水线和自动注册。
- `src/utils/`：通用工具。个人 formatter 的旧兼容入口是 `src/utils/personal-obsidian-formatter.ts`。
- `src/utils/personal-formatter/`：当前个人 formatter 的核心模块化实现。
- `src/ui/`：设置页、弹窗、suggester、diff preview view 等 Obsidian UI。
- `src/lang/locale/`：多语言文案。
- `__tests__/`：Jest 单元测试，目前约 64 个测试文件。
- `__integration__/`：集成测试，目前约 6 个测试文件。
- `test-vault/`：用于集成测试和真实 Markdown baseline 的测试 vault。
- `docs/`：MkDocs 文档、规则说明、模板和本项目概况文档。
- `scripts/`：release 相关脚本。
- `main.js`、`docs.js`、`translation-helper.js`、`styles.css`：构建产物，根目录中已有生成后的文件。

## 5. 工具链

运行时与语言：

- TypeScript。
- Obsidian Plugin API。
- Node.js / npm。

构建：

- `esbuild.config.mjs` 使用 esbuild 打包。
- 入口包括：
  - `src/main.ts` -> `main.js`
  - `src/docs.ts` -> `docs.js`
  - `src/translation-helper.ts` -> `translation-helper.js`
  - `__integration__/main.test.ts` -> `test-vault/.obsidian/plugins/obsidian-linter/main.js`
- `postcss` + `cssnano` 用于生成/压缩 `styles.css`。

测试与质量：

- Jest：单元测试。
- Babel/Jest TypeScript transform。
- ESLint：基于 Google config，并启用 TypeScript、Jest、Unicorn、deprecation 相关规则。
- GitHub Actions：上游 CI 仍使用 Node 16，执行 `npm ci`、`npm run build`、`npm test`、`npx eslint . --ext .ts`。

常用 npm scripts：

- `npm run dev`：启动 esbuild watch。
- `npm run build`：生产构建并压缩 CSS。
- `npm test`：运行 Jest 测试。
- `npm run docs`：生成文档。
- `npm run translate`：构建后运行翻译 helper。
- `npm run compile`：build、docs、lint、test 一次跑完。
- `npm run lint`：ESLint 并自动修复。

关键依赖：

- `obsidian`：插件 API 类型和运行接口。
- `diff-match-patch`：diff preview。
- `@unified-latex/unified-latex-util-parse`：LaTeX/数学块解析辅助。
- `mdast-util-*`、`micromark-*`、`yaml`：Markdown/YAML 解析相关。
- `async-lock`、`loglevel`、`moment`、`quick-lru` 等辅助库。

## 6. 个人 formatter 当前设计

权威入口是 Obsidian 命令：

- `Format current note with personal Obsidian formatter`
- `Preview current note with personal Obsidian formatter`

普通规则 `Personal Obsidian formatter` 仍保留，但更像兼容入口。如果它和普通 Linter 的 spacing/math/callout 规则一起启用，输出可能被二次修改。

核心函数：

- `formatPersonalObsidianMarkdown()`。

当前 pipeline 顺序：

1. 统一文本行拆分。
2. 规范块数学。
3. 规范行内数学空格。
4. 根据 profile 处理 callout 与数学块归属。
5. 执行基础行清理。
6. 执行个人标题空行策略。
7. 重新保证 table/callout 周围空行。
8. 去除文件开头/结尾多余空行。
9. 保证最终输出一个换行符。

当前 profile 默认值：

- 块数学规范化：开启。
- 简单公式压缩：开启。
- 行内数学空格：开启。
- callout 数学块策略：`move-into-callout`。
- 表格空行：前后保持一个空行。
- callout 空行：前后保持一个空行。
- 标题策略：`personal-compact`。

`mathPlacement` 当前支持三态：

- `move-into-callout`：紧跟 callout 的数学块归入 callout。
- `keep`：只做规范化，不迁移数学块。
- `move-out-of-callout`：把 callout 内块数学移出，用于兼容历史行为。

## 7. Diff 预览能力

FRANK 分支新增了 workspace diff preview view：

- 视图类型：`linter-frank-diff-preview`
- 实现文件：`src/ui/views/diff-preview-view.ts`
- 默认设置：`enableDiffPreviewView: true`

它使用 `diff-match-patch` 生成基于行的 diff，展示新增/删除字符数和行数，保留变化附近上下文。对于大文件会先展示警告，再由用户决定是否显示 diff。

这个功能服务两条路径：

- 普通 lint preview。
- personal formatter preview。

## 8. 项目历史经历

从 Git 历史看，项目经历了几段比较清晰的演进。

1. 上游 Obsidian Linter 长期演进

   仓库保留了上游大量 tag，从 `1.0.0` 到 `1.31.2`。上游 remote 是 `official`，当前 `official/master` 已经到 `b780100 Merge pull request #1514 from pjkaufman/master`。

2. FRANK fork 基础定制

   标签 `v1.31.2-by-FRANK` 位于 `b698f62 fix ui error`。此前有：

   - `16c5800 add some personal rules`
   - `60a5b8e add title blank line rules and fix fork error`
   - `d16df02 fix styles.css lose`
   - `b698f62 fix ui error`

   这说明 fork 先做了个人规则和 UI 修复，并形成了 FRANK 版本号。

3. Diff preview 分支

   分支 `frank/obsidian-linter` 上有 `68ce1a7 Add workspace diff preview for linting`，一次性新增了 diff preview view、设置项、样式和主入口改动。

4. 个人 formatter 初始强化

   在 `v1.31.2-by-FRANK` 之后，master 上继续有：

   - `0b6f173 add callout in latex rules and fix some bugs`
   - `7b36a2a Add unified latex parsing for personal formatter`
   - `04ce0e2 Refine math formatting with cached LaTeX AST parsing`
   - `e3eaae5 Partially optimized performance and fixed some LaTeX formatting bugs in callout blocks.`
   - `3eac86a Preserve callout prefixes in aligned math blocks`

   这段历史集中在 LaTeX、数学块、callout 相关格式化。

5. 阶段归档

   `f625876 chore: archive current formatter state` 被打了 `stage-1` 标签，同时也是当前 fork remote `obsidian-linter/master` 指向的位置。这像是一次阶段性安全点。

6. 模块化重构与安全网

   `ca1eebe Refactor personal formatter into modular pipeline` 把原先巨大的 `src/utils/personal-obsidian-formatter.ts` 拆成 `src/utils/personal-formatter/` 下的多个模块。随后一系列提交继续推进：

   - 冻结 formatter 行为测试。
   - 引入 scanner。
   - 保护 YAML/custom ignore/code fence/math block 等区域。
   - 引入 profile。
   - 暴露 callout math placement 设置。
   - 缓存 scanner 结果。
   - 增加 scanner/profile 回归测试。

当前 HEAD `cb9b7a8` 表示最近工作是补齐 personal formatter profile 测试。

## 9. 当前分支状态

根据检查时的 `git status --short`，工作区没有未提交改动。当前本地 `master` 相对 `obsidian-linter/master` ahead 16，也就是说本地已有一串个人 formatter 重构提交尚未推到 fork 的 `master` remote。

同时存在：

- `frank/obsidian-linter`：相对 `official/master` ahead 1，主要是 diff preview 提交。
- `master`：相对 `obsidian-linter/master` ahead 16，主要是个人 formatter 后续重构。

这意味着后续如果要整理发布或 PR，需要先决定以哪个分支作为主线，以及是否把 diff preview 分支与当前 master 的 formatter 重构合并/重放到同一条历史上。

## 10. 当前风险与注意点

- 根目录 `README.md` 仍主要是上游自动生成文档，FRANK 个人 formatter 的真正说明在 `PERSONAL_OBSIDIAN_FORMATTER_USAGE.md` 和重构/回顾文档中。
- `main.js`、`docs.js`、`translation-helper.js` 是构建产物，体积较大；修改源码后需要构建才能同步。
- `personalFormatterMoveMathIntoCallout` 是旧配置，当前仍保留 fallback；新配置应优先使用 `personalFormatterMathPlacement`。
- 普通 Linter 规则入口和一键 personal formatter 入口会调用同一核心函数，但运行环境不同。普通规则入口可能和其他规则叠加，调试时要优先确认入口。
- formatter 默认会将文本最终换行统一为 LF，并保证文件最终一个换行。
- 个人 formatter 已经保护 YAML frontmatter、custom linter ignore、code fence、math block 等结构，但新增规则时仍应通过 scanner/profile 扩展，而不是在各模块重复写正则判断。

## 11. 建议后续工作

- 把本概况作为后续协作入口文档，先读它再读 `PERSONAL_OBSIDIAN_FORMATTER_USAGE.md`、`PERSONAL_OBSIDIAN_FORMATTER_REFACTOR_PLAN.md` 和核心源码。
- 若准备发布，先跑 `npm test`、`npm run build`，必要时再跑 `npm run compile`。
- 若继续扩展个人 formatter，优先沿用 `src/utils/personal-formatter/scan.ts` 和 `profile.ts` 的模式。
- 若合并上游，先确认 `official/master` 与当前 fork 在 Obsidian API、规则注册、设置迁移上的差异，再处理 FRANK 分支的 diff preview 和 personal formatter 改动。
