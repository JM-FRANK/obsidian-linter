import {createFormatContext, linesOf} from '../src/utils/personal-formatter/line-utils';
import {findBlockStartingAt, scanPersonalFormatterLines, scanProtectedLineMask, scanSpanMask} from '../src/utils/personal-formatter/scan';
import {PersonalFormatterSpanKind} from '../src/utils/personal-formatter/types';
import dedent from 'ts-dedent';

function spanSummary(text: string) {
  const scanResult = scanPersonalFormatterLines(linesOf(text), createFormatContext());
  return scanResult.spans.map((span) => ({
    kind: span.kind,
    start: span.start,
    end: span.end,
  }));
}

function spansOfKind(text: string, kind: PersonalFormatterSpanKind) {
  return spanSummary(text).filter((span) => span.kind === kind);
}

describe('personal formatter scanner', () => {
  it('caches scan results for the same lines array in one format context', () => {
    const lines = linesOf(dedent`
      > [!note] Callout
      > Content
    `);
    const context = createFormatContext();

    expect(scanPersonalFormatterLines(lines, context)).toBe(scanPersonalFormatterLines(lines, context));
    expect(scanPersonalFormatterLines([...lines], context)).not.toBe(scanPersonalFormatterLines(lines, context));
  });

  it('detects YAML frontmatter only when it is closed at the top of the note', () => {
    const text = dedent`
      ---
      title: Example
      formula: $$x + 1 = y$$
      ---
      Body
    `;

    expect(spansOfKind(text, 'yaml')).toEqual([
      {kind: 'yaml', start: 0, end: 3},
    ]);
    expect(scanProtectedLineMask(linesOf(text), createFormatContext())).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it('does not treat an unclosed opening delimiter as YAML frontmatter', () => {
    const text = dedent`
      ---
      title: Example
      Body
    `;

    expect(spansOfKind(text, 'yaml')).toEqual([]);
  });

  it('detects closed and unclosed custom ignore blocks', () => {
    const text = dedent`
      Before
      <!-- linter-disable -->
      Ignored
      <!-- linter-enable -->
      Middle
      %% linter-disable %%
      Ignored to EOF
    `;

    expect(spansOfKind(text, 'customIgnore')).toEqual([
      {kind: 'customIgnore', start: 1, end: 3},
      {kind: 'customIgnore', start: 5, end: 6},
    ]);
  });

  it('ignores custom ignore markers inside code fences', () => {
    const text = dedent`
      \`\`\`md
      <!-- linter-disable -->
      \`\`\`
      Body$A$正文
    `;

    const scanResult = scanPersonalFormatterLines(linesOf(text), createFormatContext());

    expect(scanResult.spans.filter((span) => span.kind === 'customIgnore')).toEqual([]);
    expect(scanSpanMask(scanResult, ['codeFence'])).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('detects adjacent callout and table spans without merging them', () => {
    const text = dedent`
      > [!note] Callout
      > Content
      | A | B |
      |---|---|
      | 1 | 2 |
      After
    `;

    expect(spansOfKind(text, 'callout')).toEqual([
      {kind: 'callout', start: 0, end: 1},
    ]);
    expect(spansOfKind(text, 'table')).toEqual([
      {kind: 'table', start: 2, end: 4},
    ]);

    const scanResult = scanPersonalFormatterLines(linesOf(text), createFormatContext());
    expect(findBlockStartingAt(scanResult, 0)?.kind).toBe('callout');
    expect(findBlockStartingAt(scanResult, 2)?.kind).toBe('table');
    expect(findBlockStartingAt(scanResult, 5)).toBeNull();
  });

  it('detects a quoted table inside a callout and records its quote depth', () => {
    const text = dedent`
      > [!eg] Cache state
      > Access order
      > | Access | H/M | State |
      > |--------|-----|-------|
      > | 1      | M   | 1     |
    `;
    const scanResult = scanPersonalFormatterLines(linesOf(text), createFormatContext());

    expect(scanResult.spans.filter((span) => span.kind === 'callout')).toEqual([
      {kind: 'callout', start: 0, end: 4},
    ]);
    expect(scanResult.spans.filter((span) => span.kind === 'table')).toEqual([
      {kind: 'table', start: 2, end: 4, meta: {blockquoteDepth: 1}},
    ]);
    expect(findBlockStartingAt(scanResult, 2)).toBeNull();
  });

  it('does not scan callouts or tables inside math blocks', () => {
    const text = dedent`
      $$
      > [!note] Not a callout
      | A | B |
      |---|---|
      $$
    `;

    expect(spansOfKind(text, 'mathBlock')).toEqual([
      {kind: 'mathBlock', start: 0, end: 4},
    ]);
    expect(spansOfKind(text, 'callout')).toEqual([]);
    expect(spansOfKind(text, 'table')).toEqual([]);
  });
});
