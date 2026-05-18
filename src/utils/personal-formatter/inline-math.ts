import {closingPunctuationRegex, openingPunctuationRegex} from './constants';
import {FormatContext} from './types';
import {getCodeFenceMask, getMathBlockMask} from './line-utils';
import {scanPersonalFormatterLines, scanSpanMask} from './scan';

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashCount++;
  }

  return backslashCount % 2 === 1;
}

export function findInlineMathEnd(line: string, startIndex: number): number {
  for (let i = startIndex + 1; i < line.length; i++) {
    if (line[i] === '$' && line[i + 1] !== '$' && !isEscaped(line, i)) {
      return i;
    }
  }

  return -1;
}

function shouldAddSpaceBeforeInlineMath(text: string): boolean {
  if (text === '') {
    return false;
  }

  const previousChar = text[text.length - 1];
  return !/\s/.test(previousChar) && !openingPunctuationRegex.test(previousChar);
}

function shouldAddSpaceAfterInlineMath(line: string, nextIndex: number): boolean {
  if (nextIndex >= line.length) {
    return false;
  }

  const nextChar = line[nextIndex];
  return !/\s/.test(nextChar) && !closingPunctuationRegex.test(nextChar);
}

function isCurrencyLikeDollar(line: string, index: number): boolean {
  if (!/\d/.test(line[index + 1] ?? '')) {
    return false;
  }

  let cursor = index + 1;
  while (cursor < line.length && /[\d,.]/.test(line[cursor])) {
    cursor++;
  }

  return cursor >= line.length || /[\s,.;:!?，。！？；：]/.test(line[cursor]);
}

function normalizeInlineMathSpacingInLine(line: string): string {
  if (!line.includes('$')) {
    return line;
  }

  let result = '';

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '`') {
      const markerEnd = i + line.slice(i).match(/^`+/)[0].length;
      const marker = line.slice(i, markerEnd);
      const endIndex = line.indexOf(marker, markerEnd);
      if (endIndex !== -1) {
        result += line.slice(i, endIndex + marker.length);
        i = endIndex + marker.length - 1;
        continue;
      }
    }

    if (line.startsWith('http://', i) || line.startsWith('https://', i) || line.startsWith('obsidian://', i)) {
      const endIndex = line.slice(i).search(/\s/);
      const tokenEnd = endIndex === -1 ? line.length : i + endIndex;
      result += line.slice(i, tokenEnd);
      i = tokenEnd - 1;
      continue;
    }

    if (line[i] === '$' && line[i + 1] === '$') {
      result += '$$';
      i++;
      continue;
    }

    if (line[i] === '$' && isCurrencyLikeDollar(line, i)) {
      result += line[i];
      continue;
    }

    if (line[i] !== '$' || isEscaped(line, i)) {
      result += line[i];
      continue;
    }

    const endIndex = findInlineMathEnd(line, i);
    if (endIndex === -1) {
      result += line.slice(i);
      break;
    }

    if (shouldAddSpaceBeforeInlineMath(result)) {
      result += ' ';
    }

    result += line.slice(i, endIndex + 1);

    if (shouldAddSpaceAfterInlineMath(line, endIndex + 1)) {
      result += ' ';
    }

    i = endIndex;
  }

  return result;
}

export function normalizeInlineMathSpacing(lines: string[], context: FormatContext): string[] {
  const protectedMask = scanSpanMask(scanPersonalFormatterLines(lines, context), ['yaml', 'customIgnore']);
  const codeMask = getCodeFenceMask(lines, context);
  const mathBlockMask = getMathBlockMask(lines);

  return lines.map((line, index) => {
    if (protectedMask[index] || codeMask[index] || mathBlockMask[index]) {
      return line;
    }

    return normalizeInlineMathSpacingInLine(line);
  });
}
