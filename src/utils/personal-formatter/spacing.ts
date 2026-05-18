import {FormatContext} from './types';
import {getCodeFenceMask} from './line-utils';
import {findSpanStartingAt, scanPersonalFormatterLines, scanProtectedLineMask, scanSpanMask} from './scan';

export function normalizeBasicLineCleanup(lines: string[], context: FormatContext): string[] {
  const protectedMask = scanProtectedLineMask(lines, context);
  const codeMask = getCodeFenceMask(lines, context);
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

    const calloutSpan = findSpanStartingAt(scanResult, 'callout', i);
    if (calloutSpan) {
      const calloutLines = lines.slice(calloutSpan.start, calloutSpan.end + 1);
      i = calloutSpan.end + 1;

      pushSpacedBlock(result, calloutLines);
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      if (i < lines.length) {
        result.push('');
        i--;
      } else {
        i--;
      }
      continue;
    }

    const tableSpan = findSpanStartingAt(scanResult, 'table', i);
    if (tableSpan) {
      const tableLines = lines.slice(tableSpan.start, tableSpan.end + 1);
      i = tableSpan.end + 1;

      pushSpacedBlock(result, tableLines);
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      if (i < lines.length) {
        result.push('');
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
