type CodeFenceInfo = {
  marker: string;
  length: number;
};

const calloutStartRegex = /^>\s*\[![^\]]+\]/;
const codeFenceRegex = /^\s*(`{3,}|~{3,})/;

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

function normalizeMathBlockContent(content: string[]): string[] {
  const trimmedContent = content.map((line) => line.trim()).filter((line) => line !== '');
  if (trimmedContent.length === 0) {
    return [];
  }

  const hasLatexEnvironment = trimmedContent.some((line) => /\\(?:begin|end)\{[^}]+\}/.test(line));
  const hasLatexLineBreaks = trimmedContent.some((line) => line.includes('\\\\'));

  if (hasLatexEnvironment || hasLatexLineBreaks) {
    return trimmedContent.flatMap((line) => line.replace(/\\\\\s+(?=\S)/g, '\\\\\n').split('\n').map((part) => part.trim()));
  }

  return [normalizeEquationSpacing(trimmedContent.join(' '))];
}

function normalizeBlockMath(lines: string[]): string[] {
  const codeMask = getCodeFenceMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    if (!codeMask[i] && trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) {
      result.push('$$', ...normalizeMathBlockContent([trimmedLine.slice(2, -2)]), '$$');
      continue;
    }

    if (!codeMask[i] && trimmedLine === '$$') {
      const content: string[] = [];
      let endIndex = -1;

      for (let j = i + 1; j < lines.length; j++) {
        if (!codeMask[j] && lines[j].trim() === '$$') {
          endIndex = j;
          break;
        }

        content.push(lines[j]);
      }

      if (endIndex !== -1) {
        result.push('$$', ...normalizeMathBlockContent(content), '$$');
        i = endIndex;
        continue;
      }
    }

    result.push(lines[i]);
  }

  return result;
}

function isPlainMathFence(line: string): boolean {
  return line.trim() === '$$';
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

    let mathStart = j;
    while (mathStart < lines.length && !codeMask[mathStart] && lines[mathStart].trim() === '') {
      mathStart++;
    }

    if (mathStart < lines.length && !codeMask[mathStart] && isPlainMathFence(lines[mathStart])) {
      const mathLines: string[] = [];
      let mathEnd = -1;

      for (let k = mathStart; k < lines.length; k++) {
        if (codeMask[k]) {
          break;
        }

        mathLines.push(lines[k]);
        if (k > mathStart && isPlainMathFence(lines[k])) {
          mathEnd = k;
          break;
        }
      }

      if (mathEnd !== -1) {
        result.push(...calloutLines, ...mathLines.map((line) => `> ${line}`));
        i = mathEnd;
        continue;
      }
    }

    result.push(...calloutLines);
    i = j - 1;
  }

  return result;
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

export function formatPersonalObsidianMarkdown(text: string): string {
  let lines = linesOf(text);

  lines = normalizeBlockMath(lines);
  lines = moveFollowingMathIntoCallout(lines);
  lines = compactBlankLines(lines);
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
