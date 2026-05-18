import {calloutStartRegex} from './constants';
import {FormatContext} from './types';
import {getCodeFenceMask, getMathBlockMask} from './line-utils';

export function normalizeBasicLineCleanup(lines: string[], context: FormatContext): string[] {
  const codeMask = getCodeFenceMask(lines, context);
  const result: string[] = [];
  let previousWasBlank = false;

  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i]) {
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

function isTableStart(lines: string[], codeMask: boolean[], index: number): boolean {
  return index + 1 < lines.length &&
    !codeMask[index] &&
    !codeMask[index + 1] &&
    lines[index].includes('|') &&
    hasUnescapedPipe(lines[index]) &&
    isTableDelimiter(lines[index + 1]);
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
  const codeMask = getCodeFenceMask(lines, context);
  const mathBlockMask = getMathBlockMask(lines);
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i]) {
      result.push(lines[i]);
      continue;
    }

    if (!mathBlockMask[i] && calloutStartRegex.test(lines[i])) {
      const calloutLines: string[] = [lines[i]];
      i++;
      while (i < lines.length && !codeMask[i] && lines[i].startsWith('>') && !calloutStartRegex.test(lines[i])) {
        calloutLines.push(lines[i]);
        i++;
      }

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

    if (!mathBlockMask[i] && isTableStart(lines, codeMask, i)) {
      const tableLines: string[] = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && !codeMask[i] && lines[i].includes('|') && hasUnescapedPipe(lines[i]) && lines[i].trim() !== '') {
        tableLines.push(lines[i]);
        i++;
      }

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
