import {parseMath} from '@unified-latex/unified-latex-util-parse';

type CodeFenceInfo = {
  marker: string;
  length: number;
};

const calloutStartRegex = /^>\s*\[![^\]]+\]/;
const codeFenceRegex = /^\s*(`{3,}|~{3,})/;
const closingPunctuationRegex = /^[,.;:!?，。！？；：、）)\]}》」』】]/;
const openingPunctuationRegex = /^[(（[{《「『【]/;
const latexParseCache = new Map<string, boolean>();

export type PersonalObsidianFormatterOptions = {
  moveMathIntoCallout?: boolean;
};

function linesOf(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/g, '').split('\n');
}

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

function getCodeFenceMask(lines: string[]): boolean[] {
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

  return mask;
}

function normalizeEquationSpacing(text: string): string {
  return text.replace(/\s*=\s*/g, ' = ').replace(/[ \t]{2,}/g, ' ').trim();
}

function canParseMathContent(content: string[]): boolean {
  const source = content.join('\n').trim();
  if (source === '') {
    return true;
  }

  const cachedResult = latexParseCache.get(source);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    parseMath(source);
    latexParseCache.set(source, true);
    return true;
  } catch {
    latexParseCache.set(source, false);
    return false;
  }
}

function splitLatexEnvironmentBoundaries(line: string): string[] {
  return line.replace(/\s*(\\(?:begin|end)\{[^}]+\})\s*/g, '\n$1\n')
      .split('\n')
      .map((part) => part.trim())
      .filter((part) => part !== '');
}

function isListItemLine(line: string): boolean {
  return /^\s*(?:[-+*]|\d+[.)])\s+/.test(line);
}

function splitSingleMathFenceLine(line: string): string[] {
  const firstFenceIndex = line.indexOf('$$');
  if (firstFenceIndex === -1 || line.indexOf('$$', firstFenceIndex + 2) !== -1) {
    return [line];
  }

  const beforeFence = line.slice(0, firstFenceIndex).trimEnd();
  const afterFence = line.slice(firstFenceIndex + 2).trimStart();
  if (/^(>\s*)+$/.test(beforeFence) && afterFence === '') {
    return [line];
  }

  const result: string[] = [];

  if (beforeFence.trim() !== '') {
    result.push(beforeFence);
  }

  result.push('$$');

  if (afterFence.trim() !== '') {
    result.push(afterFence);
  }

  return result;
}

function normalizeMathBlockContent(content: string[]): string[] {
  if (!canParseMathContent(content)) {
    return content;
  }

  const trimmedContent = content.map((line) => line.trim()).filter((line) => line !== '');
  if (trimmedContent.length === 0) {
    return [];
  }

  if (trimmedContent.some((line) => calloutStartRegex.test(line) || headingLevel(stripBlockquotePrefixes(line)) !== null)) {
    return trimmedContent;
  }

  const hasLatexEnvironment = trimmedContent.some((line) => /\\(?:begin|end)\{[^}]+\}/.test(line));
  const hasLatexLineBreaks = trimmedContent.some((line) => line.includes('\\\\'));

  if (hasLatexEnvironment || hasLatexLineBreaks) {
    return trimmedContent.flatMap((line) => {
      return line.replace(/\\\\\s+(?=\S)/g, '\\\\\n')
          .split('\n')
          .flatMap((part) => splitLatexEnvironmentBoundaries(part));
    });
  }

  return [normalizeEquationSpacing(trimmedContent.join(' '))];
}

function mathFencePrefix(line: string): string | null {
  const match = line.match(/^((?:>\s*)*)\$\$\s*$/);
  if (!match) {
    return null;
  }

  const quoteDepth = match[1].match(/>/g)?.length ?? 0;
  return quoteDepth === 0 ? '' : `${'> '.repeat(quoteDepth)}`;
}

function normalizeBlockMath(lines: string[]): string[] {
  const originalCodeMask = getCodeFenceMask(lines);
  lines = lines.flatMap((line, index) => originalCodeMask[index] ? [line] : splitSingleMathFenceLine(line));
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    if (!codeMask[i] && trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) {
      if (isListItemLine(lines[i])) {
        result.push(lines[i]);
      } else {
        result.push('$$', ...normalizeMathBlockContent([trimmedLine.slice(2, -2)]), '$$');
      }
      continue;
    }

    const currentMathFencePrefix = codeMask[i] ? null : mathFencePrefix(lines[i]);
    if (currentMathFencePrefix !== null) {
      const content: string[] = [];
      let endIndex = -1;

      for (let j = i + 1; j < lines.length; j++) {
        if (!codeMask[j] && mathFencePrefix(lines[j]) === currentMathFencePrefix) {
          endIndex = j;
          break;
        }

        content.push(currentMathFencePrefix === '' ? lines[j] : stripBlockquotePrefixes(lines[j]));
      }

      if (endIndex !== -1) {
        result.push(
            `${currentMathFencePrefix}$$`,
            ...normalizeMathBlockContent(content).map((line) => `${currentMathFencePrefix}${line}`),
            `${currentMathFencePrefix}$$`,
        );
        i = endIndex;
        continue;
      }
    }

    result.push(lines[i]);
  }

  return result;
}

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashCount++;
  }

  return backslashCount % 2 === 1;
}

function findInlineMathEnd(line: string, startIndex: number): number {
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

function normalizeInlineMathSpacingInLine(line: string): string {
  let result = '';

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '$' && line[i + 1] === '$') {
      result += '$$';
      i++;
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

function getMathBlockMask(lines: string[]): boolean[] {
  const mask = new Array(lines.length).fill(false);
  let inMathBlock = false;

  for (let i = 0; i < lines.length; i++) {
    if (mathFencePrefix(lines[i]) !== null) {
      inMathBlock = !inMathBlock;
      mask[i] = true;
      continue;
    }

    mask[i] = inMathBlock;
  }

  return mask;
}

function normalizeInlineMathSpacing(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const mathBlockMask = getMathBlockMask(lines);

  return lines.map((line, index) => {
    if (codeMask[index] || mathBlockMask[index]) {
      return line;
    }

    return normalizeInlineMathSpacingInLine(line);
  });
}

function isPlainMathFence(line: string): boolean {
  return line.trim() === '$$';
}

function stripBlockquotePrefixes(line: string): string {
  return line.replace(/^(>\s*)+/, '');
}

function moveMathLineIntoCallout(line: string): string {
  return `> ${stripBlockquotePrefixes(line)}`;
}

function findPlainMathBlockEnd(lines: string[], codeMask: boolean[], startIndex: number): number {
  if (startIndex >= lines.length || codeMask[startIndex] || !isPlainMathFence(lines[startIndex])) {
    return -1;
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (codeMask[i]) {
      return -1;
    }

    if (isPlainMathFence(lines[i])) {
      return i;
    }
  }

  return -1;
}

function findMathBlockEndAtPrefix(lines: string[], codeMask: boolean[], startIndex: number, prefix: string): number {
  if (startIndex >= lines.length || codeMask[startIndex] || mathFencePrefix(lines[startIndex]) !== prefix) {
    return -1;
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (codeMask[i]) {
      return -1;
    }

    if (mathFencePrefix(lines[i]) === prefix) {
      return i;
    }
  }

  return -1;
}

function moveFollowingMathIntoCallout(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i] || !calloutStartRegex.test(lines[i])) {
      result.push(lines[i]);
      continue;
    }

    const calloutLines: string[] = [];
    let j = i;
    while (j < lines.length && !codeMask[j] && lines[j].startsWith('>') && (j === i || !calloutStartRegex.test(lines[j]))) {
      calloutLines.push(lines[j]);
      j++;
    }

    const calloutWithMathLines = [...calloutLines];
    let nextIndex = j;
    let movedMath = false;

    while (nextIndex < lines.length && !codeMask[nextIndex]) {
      while (nextIndex < lines.length && !codeMask[nextIndex] && lines[nextIndex].startsWith('>') && !calloutStartRegex.test(lines[nextIndex])) {
        calloutWithMathLines.push(lines[nextIndex]);
        nextIndex++;
      }

      let mathStart = nextIndex;
      while (mathStart < lines.length && !codeMask[mathStart] && lines[mathStart].trim() === '') {
        mathStart++;
      }

      const mathEnd = findPlainMathBlockEnd(lines, codeMask, mathStart);
      if (mathEnd === -1) {
        break;
      }

      for (let k = mathStart; k <= mathEnd; k++) {
        calloutWithMathLines.push(moveMathLineIntoCallout(lines[k]));
      }

      movedMath = true;
      nextIndex = mathEnd + 1;
    }

    if (movedMath) {
      result.push(...calloutWithMathLines);
      i = nextIndex - 1;
      continue;
    }

    result.push(...calloutLines);
    i = j - 1;
  }

  return result;
}

function isBlockquoteLineAtDepth(line: string, depth: number): boolean {
  return (line.match(/>/g)?.length ?? 0) >= depth;
}

function moveMathOutOfCallouts(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i] || !calloutStartRegex.test(lines[i])) {
      result.push(lines[i]);
      continue;
    }

    const calloutDepth = lines[i].match(/>/g)?.length ?? 1;
    result.push(lines[i]);

    for (let j = i + 1; j < lines.length; j++) {
      if (codeMask[j] || calloutStartRegex.test(lines[j]) || !isBlockquoteLineAtDepth(lines[j], calloutDepth)) {
        i = j - 1;
        break;
      }

      if (mathFencePrefix(lines[j]) === `${'> '.repeat(calloutDepth)}`) {
        const mathEnd = findMathBlockEndAtPrefix(lines, codeMask, j, `${'> '.repeat(calloutDepth)}`);
        if (mathEnd !== -1) {
          for (let k = j; k <= mathEnd; k++) {
            result.push(stripBlockquotePrefixes(lines[k]));
          }
          i = mathEnd;
          j = mathEnd;
          continue;
        }
      }

      result.push(lines[j]);
      i = j;
    }
  }

  return result;
}

function removeEmptyBlockquoteLines(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);

  return lines.filter((line, index) => {
    if (codeMask[index]) {
      return true;
    }

    return !/^(>\s*)+$/.test(line.trim());
  });
}

function compactBlankLines(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];
  let previousWasBlank = false;

  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i]) {
      result.push(lines[i]);
      previousWasBlank = false;
      continue;
    }

    if (lines[i].trim() === '') {
      if (!previousWasBlank) {
        result.push('');
      }
      previousWasBlank = true;
      continue;
    }

    result.push(lines[i]);
    previousWasBlank = false;
  }

  return result;
}

function headingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+\S/);
  return match ? match[1].length : null;
}

function normalizeHeadingSpacing(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];
  let currentContentHeadingLevel: number | null = null;
  let pendingBlank = false;

  for (let i = 0; i < lines.length; i++) {
    if (codeMask[i]) {
      if (pendingBlank && result.length > 0) {
        result.push('');
      }

      result.push(lines[i]);
      pendingBlank = false;
      continue;
    }

    const line = lines[i];
    const lineHeadingLevel = headingLevel(line);

    if (line.trim() === '') {
      pendingBlank = true;
      continue;
    }

    if (lineHeadingLevel !== null) {
      const previousLine = result[result.length - 1];
      const previousHeadingLevel = previousLine ? headingLevel(previousLine) : null;
      const previousIsHeading = previousHeadingLevel !== null;
      const previousIsContent = previousLine !== undefined && previousLine.trim() !== '' && !previousIsHeading;

      if (previousIsHeading) {
        pendingBlank = previousHeadingLevel > lineHeadingLevel;
      } else if (previousIsContent) {
        pendingBlank = currentContentHeadingLevel !== null && currentContentHeadingLevel !== lineHeadingLevel;
      }

      if (pendingBlank && result.length > 0) {
        result.push('');
      }

      result.push(line);
      pendingBlank = false;
      continue;
    }

    if (pendingBlank) {
      const previousLine = result[result.length - 1];
      if (previousLine !== undefined && previousLine.trim() !== '' && headingLevel(previousLine) === null) {
        result.push('');
      }
    }

    result.push(line);
    pendingBlank = false;

    for (let j = result.length - 2; j >= 0; j--) {
      const previousHeadingLevel = headingLevel(result[j]);
      if (previousHeadingLevel !== null) {
        currentContentHeadingLevel = previousHeadingLevel;
        break;
      }
    }
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
    hasUnescapedPipe(lines[index]) &&
    isTableDelimiter(lines[index + 1]);
}

function ensureTableSpacing(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isTableStart(lines, codeMask, i)) {
      result.push(lines[i]);
      continue;
    }

    while (result.length > 0 && result[result.length - 1].trim() === '') {
      result.pop();
    }

    if (result.length > 0) {
      result.push('');
    }

    const tableLines: string[] = [lines[i], lines[i + 1]];
    i += 2;
    while (i < lines.length && !codeMask[i] && hasUnescapedPipe(lines[i]) && lines[i].trim() !== '') {
      tableLines.push(lines[i]);
      i++;
    }

    result.push(...tableLines);

    while (i < lines.length && lines[i].trim() === '') {
      i++;
    }

    if (i < lines.length) {
      result.push('');
      i--;
    } else {
      i--;
    }
  }

  return result;
}

function ensureAdjacentCalloutSpacing(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!codeMask[i] && calloutStartRegex.test(lines[i])) {
      let lastNonBlank = result.length - 1;
      while (lastNonBlank >= 0 && result[lastNonBlank].trim() === '') {
        lastNonBlank--;
      }

      if (lastNonBlank >= 0 && result[lastNonBlank].startsWith('>')) {
        while (result.length > lastNonBlank + 1) {
          result.pop();
        }
        result.push('');
      }
    }

    result.push(lines[i]);
  }

  return result;
}

function trimTrailingWhitespaceOutsideCode(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  return lines.map((line, index) => codeMask[index] ? line : line.replace(/[ \t]+$/g, ''));
}

export function formatPersonalObsidianMarkdown(text: string, options: PersonalObsidianFormatterOptions = {}): string {
  let lines = linesOf(text);

  lines = normalizeBlockMath(lines);
  lines = normalizeInlineMathSpacing(lines);
  if (options.moveMathIntoCallout ?? true) {
    lines = moveFollowingMathIntoCallout(lines);
  } else {
    lines = moveMathOutOfCallouts(lines);
  }
  lines = removeEmptyBlockquoteLines(lines);
  lines = compactBlankLines(lines);
  lines = normalizeHeadingSpacing(lines);
  lines = ensureTableSpacing(lines);
  lines = ensureAdjacentCalloutSpacing(lines);
  lines = trimTrailingWhitespaceOutsideCode(lines);

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}
