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

function isTableStart(lines: string[], codeFenceMask: boolean[], mathBlockMask: boolean[], index: number): boolean {
  return index + 1 < lines.length &&
    !codeFenceMask[index] &&
    !codeFenceMask[index + 1] &&
    !mathBlockMask[index] &&
    lines[index].includes('|') &&
    hasUnescapedPipe(lines[index]) &&
    isTableDelimiter(lines[index + 1]);
}

function scanTableSpans(lines: string[], codeFenceMask: boolean[], mathBlockMask: boolean[]): PersonalFormatterSpan[] {
  const spans: PersonalFormatterSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isTableStart(lines, codeFenceMask, mathBlockMask, i)) {
      continue;
    }

    const start = i;
    i += 2;
    while (i < lines.length && !codeFenceMask[i] && lines[i].includes('|') && hasUnescapedPipe(lines[i]) && lines[i].trim() !== '') {
      i++;
    }

    spans.push({kind: 'table', start, end: i - 1});
    i--;
  }

  return spans;
}

export function scanPersonalFormatterLines(lines: string[], context: FormatContext): PersonalFormatterScanResult {
  const codeFenceMask = scanCodeFenceMask(lines, context);
  const mathBlockMask = scanMathBlockMask(lines);
  const spans = [
    ...scanMaskSpans('codeFence', codeFenceMask),
    ...scanMaskSpans('mathBlock', mathBlockMask),
    ...scanCalloutSpans(lines, codeFenceMask, mathBlockMask),
    ...scanTableSpans(lines, codeFenceMask, mathBlockMask),
  ];

  return {
    lines,
    spans,
    codeFenceMask,
    mathBlockMask,
  };
}

export function findSpanStartingAt(scanResult: PersonalFormatterScanResult, kind: PersonalFormatterSpan['kind'], index: number): PersonalFormatterSpan | null {
  return scanResult.spans.find((span) => span.kind === kind && span.start === index) ?? null;
}
