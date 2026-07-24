import {FormatContext, PersonalFormatterScanResult, PersonalFormatterSpan} from './types';
import {getCodeFenceMask} from './line-utils';
import {findBlockStartingAt, scanPersonalFormatterLines, scanSpanMask} from './scan';

export function normalizeBasicLineCleanup(lines: string[], context: FormatContext): string[] {
  const scanResult = scanPersonalFormatterLines(lines, context);
  const protectedMask = scanSpanMask(scanResult, ['yaml', 'customIgnore']);
  const codeMask = getCodeFenceMask(lines, context);
  const quotedTableDepthByStart = new Map<number, number>();
  for (const span of scanResult.spans) {
    const blockquoteDepth = span.meta?.blockquoteDepth;
    if (span.kind === 'table' && typeof blockquoteDepth === 'number' && blockquoteDepth > 0) {
      quotedTableDepthByStart.set(span.start, blockquoteDepth);
    }
  }
  const result: string[] = [];
  let previousWasBlank = false;

  for (let i = 0; i < lines.length; i++) {
    if (protectedMask[i] || codeMask[i]) {
      result.push(lines[i]);
      previousWasBlank = false;
      continue;
    }

    const line = lines[i].replace(/[ \t]+$/g, '');
    if (/^(>\s*)+$/.test(line.trim())) {
      continue;
    }

    const quotedTableDepth = quotedTableDepthByStart.get(i);
    if (quotedTableDepth !== undefined) {
      result.push('> '.repeat(quotedTableDepth).trimEnd());
      previousWasBlank = false;
    }

    if (line.trim() === '') {
      if (!previousWasBlank) {
        result.push('');
      }
      previousWasBlank = true;
      continue;
    }

    result.push(line);
    previousWasBlank = false;
  }

  return result;
}

function pushSpacedBlock(result: string[], blockLines: string[]) {
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop();
  }

  if (result.length > 0) {
    result.push('');
  }

  result.push(...blockLines);
}

function findSpanStartingAt(scanResult: PersonalFormatterScanResult, index: number, kind: PersonalFormatterSpan['kind']): PersonalFormatterSpan | null {
  return scanResult.spans.find((span) => span.kind === kind && span.start === index) ?? null;
}

function shouldKeepTightCalloutCodeFenceSpacing(lines: string[], scanResult: PersonalFormatterScanResult, blockSpan: PersonalFormatterSpan): boolean {
  if (blockSpan.kind !== 'callout') {
    return false;
  }

  const nextIndex = blockSpan.end + 1;
  if (nextIndex >= lines.length || lines[nextIndex].trim() === '') {
    return false;
  }

  return findSpanStartingAt(scanResult, nextIndex, 'codeFence') !== null;
}

export function ensureTableAndCalloutSpacing(lines: string[], context: FormatContext): string[] {
  const scanResult = scanPersonalFormatterLines(lines, context);
  const protectedMask = scanSpanMask(scanResult, ['yaml', 'customIgnore']);
  const codeMask = scanResult.codeFenceMask;
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (protectedMask[i] || codeMask[i]) {
      result.push(lines[i]);
      continue;
    }

    const blockSpan = findBlockStartingAt(scanResult, i);
    if (blockSpan) {
      const blockLines = lines.slice(blockSpan.start, blockSpan.end + 1);
      const keepTightCalloutCodeFenceSpacing = shouldKeepTightCalloutCodeFenceSpacing(lines, scanResult, blockSpan);
      i = blockSpan.end + 1;

      pushSpacedBlock(result, blockLines);
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      if (i < lines.length) {
        if (!keepTightCalloutCodeFenceSpacing) {
          result.push('');
        }
        i--;
      } else {
        i--;
      }
      continue;
    }

    result.push(lines[i]);
  }

  return result;
}
