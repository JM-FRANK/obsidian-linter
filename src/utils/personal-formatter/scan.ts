import {calloutStartRegex, codeFenceRegex} from './constants';
import {CodeFenceInfo, FormatContext, PersonalFormatterScanResult, PersonalFormatterSpan} from './types';

function codeFenceInfo(line: string): CodeFenceInfo | null {
  const match = line.match(codeFenceRegex);
  if (!match) {
    return null;
  }

  return {
    marker: match[1][0],
    length: match[1].length,
  };
}

function mathFencePrefixForScan(line: string): string | null {
  const match = line.match(/^((?:>\s*)*)\$\$\s*$/);
  if (!match) {
    return null;
  }

  const quoteDepth = match[1].match(/>/g)?.length ?? 0;
  return quoteDepth === 0 ? '' : `${'> '.repeat(quoteDepth)}`;
}

export function scanCodeFenceMask(lines: string[], context: FormatContext): boolean[] {
  const cachedMask = context.codeFenceMaskCache.get(lines);
  if (cachedMask) {
    return cachedMask;
  }

  const mask = new Array(lines.length).fill(false);
  let fence: CodeFenceInfo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineFence = codeFenceInfo(lines[i]);

    if (fence) {
      mask[i] = true;
      if (lineFence && lineFence.marker === fence.marker && lineFence.length >= fence.length) {
        fence = null;
      }
      continue;
    }

    if (lineFence) {
      fence = lineFence;
      mask[i] = true;
    }
  }

  context.codeFenceMaskCache.set(lines, mask);
  return mask;
}

export function scanMathBlockMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let inMathBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (mathFencePrefixForScan(lines[i]) !== null) {
      inMathBlock = !inMathBlock;
      mask[i] = true;
      continue;
    }

    mask[i] = inMathBlock;
  }

  return mask;
}

function scanMaskSpans(kind: PersonalFormatterSpan['kind'], mask: boolean[]): PersonalFormatterSpan[] {
  const spans: PersonalFormatterSpan[] = [];
  let start = -1;

  for (let i = 0; i <= mask.length; i++) {
    if (i < mask.length && mask[i]) {
      if (start === -1) {
        start = i;
      }
      continue;
    }

    if (start !== -1) {
      spans.push({kind, start, end: i - 1});
      start = -1;
    }
  }

  return spans;
}

function scanCalloutSpans(lines: string[], codeFenceMask: boolean[], mathBlockMask: boolean[]): PersonalFormatterSpan[] {
  const spans: PersonalFormatterSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (codeFenceMask[i] || mathBlockMask[i] || !calloutStartRegex.test(lines[i])) {
      continue;
    }

    const start = i;
    i++;
    while (i < lines.length && !codeFenceMask[i] && lines[i].startsWith('>') && !calloutStartRegex.test(lines[i])) {
      i++;
    }

    spans.push({kind: 'callout', start, end: i - 1});
    i--;
  }

  return spans;
}

function hasUnescapedPipe(line: string): boolean {
  let inRuby = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '\\') {
      i++;
      continue;
    }

    if (char === '{') {
      inRuby = true;
      continue;
    }

    if (char === '}') {
      inRuby = false;
      continue;
    }

    if (char === '|' && !inRuby) {
      return true;
    }
  }

  return false;
}

function isTableDelimiter(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitBlockquoteLine(line: string): {content: string, depth: number} {
  const prefix = line.match(/^((?:>\s*)*)/)?.[1] ?? '';
  return {
    content: line.slice(prefix.length),
    depth: prefix.match(/>/g)?.length ?? 0,
  };
}

function tableStartQuoteDepth(lines: string[], codeFenceMask: boolean[], mathBlockMask: boolean[], index: number): number | null {
  if (!(index + 1 < lines.length &&
    !codeFenceMask[index] &&
    !codeFenceMask[index + 1] &&
    !mathBlockMask[index] &&
    !mathBlockMask[index + 1])) {
    return null;
  }

  const header = splitBlockquoteLine(lines[index]);
  const delimiter = splitBlockquoteLine(lines[index + 1]);
  return header.depth === delimiter.depth &&
    header.content.includes('|') &&
    hasUnescapedPipe(header.content) &&
    isTableDelimiter(delimiter.content) ? header.depth : null;
}

function scanTableSpans(lines: string[], codeFenceMask: boolean[], mathBlockMask: boolean[]): PersonalFormatterSpan[] {
  const spans: PersonalFormatterSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    const blockquoteDepth = tableStartQuoteDepth(lines, codeFenceMask, mathBlockMask, i);
    if (blockquoteDepth === null) {
      continue;
    }

    const start = i;
    i += 2;
    while (i < lines.length && !codeFenceMask[i]) {
      const row = splitBlockquoteLine(lines[i]);
      if (row.depth !== blockquoteDepth || !row.content.includes('|') || !hasUnescapedPipe(row.content) || row.content.trim() === '') {
        break;
      }
      i++;
    }

    spans.push({kind: 'table', start, end: i - 1, meta: {blockquoteDepth}});
    i--;
  }

  return spans;
}

function scanYamlFrontmatterSpans(lines: string[]): PersonalFormatterSpan[] {
  if (lines.length === 0 || lines[0].trim() !== '---') {
    return [];
  }

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return [{kind: 'yaml', start: 0, end: i}];
    }
  }

  return [];
}

function isCustomIgnoreStart(line: string): boolean {
  return /<!--\s*linter-disable\s*-->|%%\s*linter-disable\s*%%/.test(line);
}

function isCustomIgnoreEnd(line: string): boolean {
  return /<!--\s*linter-enable\s*-->|%%\s*linter-enable\s*%%/.test(line);
}

function scanCustomIgnoreSpans(lines: string[], codeFenceMask: boolean[]): PersonalFormatterSpan[] {
  const spans: PersonalFormatterSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (codeFenceMask[i] || !isCustomIgnoreStart(lines[i])) {
      continue;
    }

    const start = i;
    while (i < lines.length && !isCustomIgnoreEnd(lines[i])) {
      i++;
    }

    spans.push({kind: 'customIgnore', start, end: Math.min(i, lines.length - 1)});
  }

  return spans;
}

export function scanPersonalFormatterLines(lines: string[], context: FormatContext): PersonalFormatterScanResult {
  const cachedResult = context.scanResultCache.get(lines);
  if (cachedResult) {
    return cachedResult;
  }

  const codeFenceMask = scanCodeFenceMask(lines, context);
  const mathBlockMask = scanMathBlockMask(lines);
  const spans = [
    ...scanYamlFrontmatterSpans(lines),
    ...scanMaskSpans('codeFence', codeFenceMask),
    ...scanMaskSpans('mathBlock', mathBlockMask),
    ...scanCalloutSpans(lines, codeFenceMask, mathBlockMask),
    ...scanTableSpans(lines, codeFenceMask, mathBlockMask),
    ...scanCustomIgnoreSpans(lines, codeFenceMask),
  ];

  const scanResult = {
    lines,
    spans,
    codeFenceMask,
    mathBlockMask,
  };

  context.scanResultCache.set(lines, scanResult);
  return scanResult;
}

export function findBlockStartingAt(scanResult: PersonalFormatterScanResult, index: number): PersonalFormatterSpan | null {
  return scanResult.spans.find((span) => {
    if (span.start !== index) {
      return false;
    }

    return span.kind === 'callout' || (span.kind === 'table' && span.meta?.blockquoteDepth === 0);
  }) ?? null;
}

export function scanSpanMask(scanResult: PersonalFormatterScanResult, kinds: PersonalFormatterSpan['kind'][]): boolean[] {
  const kindSet = new Set(kinds);
  const mask = new Array(scanResult.lines.length).fill(false);

  for (const span of scanResult.spans) {
    if (!kindSet.has(span.kind)) {
      continue;
    }

    for (let i = span.start; i <= span.end; i++) {
      mask[i] = true;
    }
  }

  return mask;
}

export function scanProtectedLineMask(lines: string[], context: FormatContext): boolean[] {
  return scanSpanMask(scanPersonalFormatterLines(lines, context), ['yaml', 'customIgnore']);
}
