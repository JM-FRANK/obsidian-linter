# Codex Task: Personal Obsidian Formatter Profile

## 1. Goal

Fork and extend the existing Obsidian Linter project to add a single global personal formatter profile for Obsidian Markdown notes.

The formatter should produce a compact, stable, and consistent note layout while preserving Obsidian rendering behavior and the user's custom syntax structures.

This is not a generic Markdown formatter. It is an Obsidian-aware formatter profile built on top of the existing Obsidian Linter codebase.

## 2. Primary Formatting Objective

The target behavior is:

```text
Format Obsidian Markdown notes into a compact layout without breaking Obsidian rendering or user-defined syntax structures.
```

The formatter should be usable as a one-click format action for the current note. Later, it may reuse Obsidian Linter's existing current-folder or whole-vault execution capabilities.

## 3. Implementation Direction

Use the Obsidian Linter fork as the base.

Reuse existing Obsidian Linter infrastructure where possible:

- plugin command framework;
- rule runner;
- current-file lint execution;
- existing spacing rules;
- existing trailing-space rule;
- existing math block rules;
- existing blockquote/callout-related handling if available.

Avoid replacing the project with a new formatter architecture unless absolutely necessary.

Prefer line-based and block-based transformations over full Markdown AST parse/stringify rewrites, because the target vault contains Obsidian-specific syntax, MathJax, custom ruby syntax, relation-tag structures, and code examples.

## 4. Core Formatting Rules

### 4.1 Trim trailing spaces

Remove meaningless trailing spaces at the end of each line.

### 4.2 Compact blank lines

Use a compact layout by reducing redundant blank lines.

General behavior:

```text
Collapse multiple consecutive blank lines into one blank line.
Do not add extra blank lines purely for visual spacing around headings, paragraphs, lists, block math, or callouts.
However, preserve required structural blank lines for Obsidian rendering.
```

Structural rendering invariants have higher priority than compactness.

## 5. Rendering Invariants

These rules must be enforced after compact blank-line normalization.

### 5.1 Markdown table blocks must have blank lines before and after

Obsidian table rendering is sensitive to surrounding blank lines. A Markdown table block should have exactly one blank line before and after it, except at the beginning or end of the document.

Correct:

```md
正文

| A | B |
|---|---|
| 1 | 2 |

正文
```

Incorrect:

```md
正文
| A | B |
|---|---|
| 1 | 2 |
正文
```

Required behavior:

```text
A Markdown table block has one blank line before and one blank line after it.
If multiple blank lines already exist, reduce them to one.
If the table is at the start or end of the file, do not add unnecessary leading or trailing blank lines beyond the final newline rule.
```

### 5.2 Adjacent Obsidian callouts must remain separated

Adjacent Obsidian callouts must be separated by exactly one blank line.

Correct:

```md
> [!eg] First
> Content

> [!note] Second
> Content
```

Incorrect:

```md
> [!eg] First
> Content
> [!note] Second
> Content
```

Required behavior:

```text
If two callout blocks are adjacent, preserve exactly one blank line between them.
Multiple blank lines between adjacent callouts may be reduced to one.
The separator must never be reduced to zero blank lines.
```

A callout block starts with a line like:

```md
> [!eg] Title
```

General detection pattern:

```regex
^>\s*\[![^\]]+\]
```

A callout block continues through following blockquote lines that start with `>`.

## 6. MathJax Block Math Rules

Only standard block math fenced by `$$` is in scope:

```md
$$
...
$$
```

Inline math is not part of this first version unless existing Linter rules already safely handle it.

### 6.1 Put block math fences on their own lines

Input:

```md
$$x + 1 = y$$
```

Output:

```md
$$
x + 1 = y
$$
```

### 6.2 Join simple broken block math

AI-generated output often breaks simple formulas across too many lines.

Input:

```md
$$
x + 1
=
y
$$
```

Output:

```md
$$
x + 1 = y
$$
```

For simple block math:

- trim each formula line;
- remove empty lines inside the math block;
- join simple broken lines with spaces;
- normalize at least `=` spacing to ` = `.

### 6.3 Normalize LaTeX environment line breaks according to `\\`

For LaTeX environments, do not flatten the whole formula into one line. Instead, line breaks should follow LaTeX newline commands `\\`.

Input:

```md
$$
\begin{aligned}
x + 1 &= y \\ z &= w
\end{aligned}
$$
```

Output:

```md
$$
\begin{aligned}
x + 1 &= y \\
z &= w
\end{aligned}
$$
```

Required behavior:

```text
When a LaTeX newline command `\\` appears inside a block math environment, the following content should start on a new line.
Preserve `&` alignment markers.
Preserve `\begin{...}` and `\end{...}`.
Do not change formula semantics.
Trim line-level whitespace.
```

This applies to common environment-like structures such as:

```text
aligned
cases
matrix-like environments
```

The first implementation does not need to become a full LaTeX formatter. It only needs to safely normalize common AI-produced inline `\\` breaks inside block math.

## 7. Callout + Block Math Rule

### 7.1 Move immediately following block math into the preceding callout

Global target format: if a block math immediately follows a callout, the math block should belong to the callout.

Input:

```md
> [!eg] Example title
> Content
$$
x + 1 = y
$$
```

Output:

```md
> [!eg] Example title
> Content
> $$
> x + 1 = y
> $$
```

Required behavior:

```text
Only apply when the block math immediately follows a callout.
Blank lines between the callout and block math are allowed.
If ordinary text appears between the callout and block math, do not move the math block.
After conversion, prefix every line of the math block with `> `.
```

Do not move this case:

```md
> [!eg] Example title
> Content
Ordinary text
$$
x + 1 = y
$$
```

## 8. Custom Syntax Preservation Rules

These are target-output invariants. The formatter may format surrounding structure, but must preserve these syntax structures.

### 8.1 Ruby annotation syntax

The user's custom ruby annotation syntax must keep its original structure.

Examples:

```md
{漢字|かんじ}
{日本語|に|ほん|ご}
{漢字\|かんじ}
```

Required behavior:

```text
Do not change ruby syntax content.
Do not convert `\|` to `|`.
Do not allow table formatting or table detection to treat ruby-internal pipes as table separators.
```

Table example that must remain valid:

```md
| Word | Ruby |
|---|---|
| 漢字 | {漢字\|かんじ} |
```

### 8.2 Body tags and relation-tag structures

Body tags should remain where they are. Do not collect, sort, move, or convert them into YAML tags.

Examples:

```md
#ai/generated
#todo/refine
#flag/core
#rel/basis [[Target Note]]
#rel/evidence [[Target Note]]
#rel/change [[Target Note]]
```

Relation-tag structures such as:

```md
#rel/basis [[Target Note]]
```

are recognized by another plugin. The formatter does not need to understand their semantics, but it must preserve the adjacency between the `#rel/...` tag and the immediately following internal link.

### 8.3 Fenced code blocks

Fenced code block contents must remain byte-preserved.

Example:

````md
```md
$$
x + 1
=
y
$$
```
````

The content inside the code fence should not be changed, even if it looks like math, tags, callouts, tables, or Markdown examples.

Support normal fenced code blocks using backticks or tildes. Prefer using existing Obsidian Linter code for code fence detection if available.

### 8.4 Obsidian comments

Obsidian comments use `%% ... %%`. They are hidden from Reading View but are still Markdown text in the source file.

The formatter may apply normal formatting rules inside comments, but must preserve comment boundaries.

Required behavior:

```text
The opening and closing `%%` markers must remain valid.
Do not accidentally merge comment content with surrounding non-comment content.
Do not break inline comments like `%% comment %%`.
```

Example:

Input:

```md
%%
$$
x + 1
=
y
$$
%%
```

Output:

```md
%%
$$
x + 1 = y
$$
%%
```

## 9. Suggested Execution Order

The exact implementation may follow the existing Obsidian Linter architecture, but the final behavior should satisfy this order of effects:

```text
1. Identify fenced code blocks and preserve their internal contents.
2. Identify Markdown table blocks.
3. Identify Obsidian callout blocks.
4. Normalize block math.
5. Move immediately following block math into the preceding callout.
6. Apply compact blank-line normalization.
7. Re-apply rendering invariants:
   - table blocks have one blank line before and after;
   - adjacent callouts have one blank line between them.
8. Trim trailing spaces.
9. Ensure exactly one final newline at end of file.
```

The key point is that rendering invariants should be checked after compact blank-line normalization.

## 10. Test Requirements

Add before/after tests for the following cases.

### 10.1 Trailing spaces

Input:

```md
# Title    
Content    
```

Output:

```md
# Title
Content
```

### 10.2 Compact blank lines

Input:

```md
# Title


Content


## Subtitle


Content
```

Output:

```md
# Title

Content

## Subtitle

Content
```

If existing compact behavior intentionally removes heading-adjacent blank lines further, document that behavior and ensure table/callout invariants still hold.

### 10.3 Table blocks keep one blank line before and after

Input:

```md
Text
| A | B |
|---|---|
| 1 | 2 |
Text
```

Output:

```md
Text

| A | B |
|---|---|
| 1 | 2 |

Text
```

### 10.4 Adjacent callouts keep one blank line

Input:

```md
> [!eg] A
> Content
> [!note] B
> Content
```

Output:

```md
> [!eg] A
> Content

> [!note] B
> Content
```

### 10.5 Ruby syntax remains unchanged

Input:

```md
Here is {漢字|かんじ}.
Here is {日本語|に|ほん|ご}.
```

Output should preserve the ruby syntax exactly.

### 10.6 Table-safe ruby syntax remains unchanged

Input:

```md
| Word | Ruby |
|---|---|
| 漢字 | {漢字\|かんじ} |
```

Output should preserve `{漢字\|かんじ}` exactly and keep the table valid.

### 10.7 Simple broken block math is joined

Input:

```md
$$
x + 1
=
y
$$
```

Output:

```md
$$
x + 1 = y
$$
```

### 10.8 LaTeX environment follows `\\` line breaks

Input:

```md
$$
\begin{aligned}
x + 1 &= y \\ z &= w
\end{aligned}
$$
```

Output:

```md
$$
\begin{aligned}
x + 1 &= y \\
z &= w
\end{aligned}
$$
```

### 10.9 Block math immediately after callout moves into callout

Input:

```md
> [!eg] Example title
> Content
$$
x + 1 = y
$$
```

Output:

```md
> [!eg] Example title
> Content
> $$
> x + 1 = y
> $$
```

### 10.10 Block math after ordinary text does not move into callout

Input:

```md
> [!eg] Example title
> Content
Ordinary text
$$
x + 1 = y
$$
```

Output should not move the math block into the callout.

### 10.11 Fenced code block content is unchanged

Input:

````md
```md
$$
x + 1
=
y
$$
```
````

Output should preserve the fenced code block content exactly.

### 10.12 Comment boundaries remain valid while contents may be formatted

Input:

```md
%%
$$
x + 1
=
y
$$
%%
```

Output:

```md
%%
$$
x + 1 = y
$$
%%
```

## 11. Completion Report Format

After implementation, report:

```text
1. Files changed.
2. Existing Obsidian Linter rules reused.
3. Existing rules modified.
4. New rules or helper functions added.
5. Tests added.
6. Test command run and result.
7. Known remaining limitations.
```

## 12. Design Summary

Prefer positive target invariants over broad negative instructions.

The formatter is defined by the target output:

```text
- compact layout;
- table blocks have one blank line before and after;
- adjacent callouts have one blank line between them;
- block math is normalized;
- immediately following block math is moved into callout;
- ruby syntax and relation-tag structures remain intact;
- fenced code block contents remain byte-preserved;
- comment boundaries remain valid.
```

Avoid introducing unrelated vault-governance behavior. The focus is formatting behavior inside Markdown notes.
