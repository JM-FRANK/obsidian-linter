import {parseMath} from '@unified-latex/unified-latex-util-parse';
import {calloutStartRegex} from './constants';
import {CleanLatexBlock, FormatContext} from './types';
import {getCodeFenceMask, headingLevel, isRecord, mathFencePrefix, stripBlockquotePrefixes} from './line-utils';
import {scanPersonalFormatterLines, scanSpanMask} from './scan';

function normalizeEquationSpacing(text: string): string {
  return text.replace(/\s*=\s*/g, ' = ').replace(/[ \t]{2,}/g, ' ').trim();
}

function parseLatexMath(source: string, context: FormatContext): unknown[] | null {
  source = source.trim();
  if (source === '') {
    return [];
  }

  const cachedResult = context.latexParseCache.get(source);
  if (cachedResult !== undefined) {
    return cachedResult;
  }

  try {
    const parsed = parseMath(source);
    context.latexParseCache.set(source, parsed);
    return parsed;
  } catch {
    context.latexParseCache.set(source, null);
    return null;
  }
}

function latexNodeChildren(node: unknown): unknown[] {
  if (!isRecord(node)) {
    return [];
  }

  const children: unknown[] = [];
  for (const key of ['content', 'args']) {
    const value = node[key];
    if (Array.isArray(value)) {
      children.push(...value);
    }
  }

  return children;
}

function visitLatexNodes(nodes: unknown[], visitor: (node: unknown) => void) {
  for (const node of nodes) {
    visitor(node);
    visitLatexNodes(latexNodeChildren(node), visitor);
  }
}

function isLatexEnvironmentNode(node: unknown): boolean {
  return isRecord(node) && node.type === 'environment' && typeof node.env === 'string';
}

function latexNodeOffsets(node: unknown): { start: number, end: number } | null {
  if (!isRecord(node) || !isRecord(node.position) || !isRecord(node.position.start) || !isRecord(node.position.end)) {
    return null;
  }

  const start = node.position.start.offset;
  const end = node.position.end.offset;
  return typeof start === 'number' && typeof end === 'number' ? {start, end} : null;
}

function isLatexLineBreakNode(node: unknown): boolean {
  if (!isRecord(node) || node.type !== 'macro' || node.content !== '\\') {
    return false;
  }

  return !isRecord(node._renderInfo) || node._renderInfo.breakAfter === true;
}

function hasLatexEnvironment(nodes: unknown[]): boolean {
  let hasEnvironment = false;
  visitLatexNodes(nodes, (node) => {
    if (isLatexEnvironmentNode(node)) {
      hasEnvironment = true;
    }
  });

  return hasEnvironment;
}

function isLineBreakAtOffset(source: string, start: number, end: number): boolean {
  return source.slice(start, end).startsWith('\\\\') || source.slice(Math.max(0, end - 2), end) === '\\\\';
}

function hasLatexLineBreaks(source: string, nodes: unknown[]): boolean {
  let hasLineBreaks = false;
  visitLatexNodes(nodes, (node) => {
    const offsets = latexNodeOffsets(node);
    if (isLatexLineBreakNode(node) && offsets && isLineBreakAtOffset(source, offsets.start, offsets.end)) {
      hasLineBreaks = true;
    }
  });

  return hasLineBreaks;
}

function topLevelLatexEnvironmentNodes(nodes: unknown[]): unknown[] {
  return nodes.filter(isLatexEnvironmentNode);
}

function splitLatexLineBreaksWithAst(line: string, context: FormatContext): string[] | null {
  const nodes = parseLatexMath(line, context);
  if (!nodes) {
    return null;
  }

  const breakOffsets: number[] = [];
  visitLatexNodes(nodes, (node) => {
    const offsets = latexNodeOffsets(node);
    if (isLatexLineBreakNode(node) && offsets && isLineBreakAtOffset(line, offsets.start, offsets.end)) {
      breakOffsets.push(offsets.end);
    }
  });

  if (breakOffsets.length === 0) {
    return [line.trim()].filter((part) => part !== '');
  }

  const parts: string[] = [];
  const pushPart = (part: string) => {
    for (const linePart of part.split(/\r?\n/)) {
      const trimmedPart = linePart.trim();
      if (trimmedPart !== '') {
        parts.push(trimmedPart);
      }
    }
  };

  let start = 0;
  for (const end of breakOffsets.sort((a, b) => a - b)) {
    pushPart(line.slice(start, end));
    start = end;
    while (start < line.length && /\s/.test(line[start])) {
      start++;
    }
  }

  pushPart(line.slice(start));
  return parts;
}

function splitLatexEnvironmentBoundariesWithAst(line: string, context: FormatContext): string[] | null {
  const nodes = parseLatexMath(line, context);
  if (!nodes) {
    return null;
  }

  const environmentNodes = topLevelLatexEnvironmentNodes(nodes);
  if (environmentNodes.length === 0) {
    return [line.trim()].filter((part) => part !== '');
  }

  const parts: string[] = [];
  let cursor = 0;

  for (const node of environmentNodes) {
    const offsets = latexNodeOffsets(node);
    if (!offsets || !isRecord(node) || typeof node.env !== 'string') {
      return null;
    }

    const before = line.slice(cursor, offsets.start).trim();
    if (before !== '') {
      parts.push(before);
    }

    const segment = line.slice(offsets.start, offsets.end);
    const beginMarker = `\\begin{${node.env}}`;
    const endMarker = `\\end{${node.env}}`;
    const beginIndex = segment.indexOf(beginMarker);
    const endIndex = segment.lastIndexOf(endMarker);
    if (beginIndex === -1 || endIndex === -1 || beginIndex > endIndex) {
      return null;
    }

    parts.push(beginMarker);
    const innerContent = segment.slice(beginIndex + beginMarker.length, endIndex).trim();
    if (innerContent !== '') {
      const lineParts = splitLatexLineBreaksWithAst(innerContent, context) ?? splitLatexLineBreaksWithRegex(innerContent);
      parts.push(...lineParts);
    }
    parts.push(endMarker);
    cursor = offsets.end;
  }

  const after = line.slice(cursor).trim();
  if (after !== '') {
    parts.push(after);
  }

  return parts;
}

function splitLatexEnvironmentBoundariesWithRegex(line: string): string[] {
  return line.replace(/\s*(\\(?:begin|end)\{[^}]+\})\s*/g, '\n$1\n')
      .split('\n')
      .map((part) => part.trim())
      .filter((part) => part !== '');
}

function splitLatexLineBreaksWithRegex(line: string): string[] {
  return line.replace(/\\\\\s+(?=\S)/g, '\\\\\n')
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

function cleanLatexBlockContent(content: string[]): CleanLatexBlock {
  const fallbackLines = content
      .filter((line) => !/^(>\s*)+$/.test(line.trim()))
      .map((line) => line.trim())
      .filter((line) => line !== '');

  const containsMarkdownSyntax = fallbackLines.some((line) => calloutStartRegex.test(line) || headingLevel(stripBlockquotePrefixes(line)) !== null);
  return {
    latexLines: fallbackLines.map((line) => stripBlockquotePrefixes(line).trim()).filter((line) => line !== ''),
    fallbackLines,
    canUseAst: !containsMarkdownSyntax,
  };
}

function formatCleanLatexBlockContent(latexLines: string[], context: FormatContext): string[] {
  const joinedLatexContent = latexLines.join('\n');
  const parsedContent = parseLatexMath(joinedLatexContent, context);
  if (!parsedContent) {
    return latexLines;
  }

  if (latexLines.length === 0) {
    return [];
  }

  const hasLatexEnvironmentInAst = hasLatexEnvironment(parsedContent);
  const hasLatexLineBreaksInAst = hasLatexLineBreaks(joinedLatexContent, parsedContent);
  const hasLatexEnvironmentByRegex = latexLines.some((line) => /\\(?:begin|end)\{[^}]+\}/.test(line));
  const hasLatexLineBreaksByRegex = latexLines.some((line) => line.includes('\\\\'));

  if (hasLatexEnvironmentInAst || hasLatexEnvironmentByRegex) {
    return splitLatexEnvironmentBoundariesWithAst(joinedLatexContent, context) ??
      latexLines.flatMap((line) => splitLatexEnvironmentBoundariesWithRegex(line));
  }

  if (hasLatexLineBreaksInAst || hasLatexLineBreaksByRegex) {
    return latexLines.flatMap((line) => {
      const lineBreakParts = splitLatexLineBreaksWithAst(line, context) ?? splitLatexLineBreaksWithRegex(line);
      return lineBreakParts;
    });
  }

  return [normalizeEquationSpacing(latexLines.join(' '))];
}

function normalizeMathBlockContent(content: string[], context: FormatContext): string[] {
  const cleanLatexBlock = cleanLatexBlockContent(content);
  if (!cleanLatexBlock.canUseAst) {
    return cleanLatexBlock.fallbackLines;
  }

  return formatCleanLatexBlockContent(cleanLatexBlock.latexLines, context);
}

export function normalizeBlockMath(lines: string[], context: FormatContext): string[] {
  const originalProtectedMask = scanSpanMask(scanPersonalFormatterLines(lines, context), ['codeFence', 'yaml', 'customIgnore']);
  const originalCodeMask = getCodeFenceMask(lines, context);
  const splitLines: string[] = [];
  let splitChangedLineCount = false;
  for (let i = 0; i < lines.length; i++) {
    const parts = originalProtectedMask[i] ? [lines[i]] : splitSingleMathFenceLine(lines[i]);
    if (parts.length !== 1 || parts[0] !== lines[i]) {
      splitChangedLineCount = true;
    }
    splitLines.push(...parts);
  }

  const codeMask = splitChangedLineCount ? getCodeFenceMask(splitLines, context) : originalCodeMask;
  const protectedMask = splitChangedLineCount ?
    scanSpanMask(scanPersonalFormatterLines(splitLines, context), ['codeFence', 'yaml', 'customIgnore']) :
    originalProtectedMask;
  lines = splitChangedLineCount ? splitLines : lines;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    if (!protectedMask[i] && !codeMask[i] && trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$') && trimmedLine.length > 4) {
      if (isListItemLine(lines[i])) {
        result.push(lines[i]);
      } else {
        result.push('$$', ...normalizeMathBlockContent([trimmedLine.slice(2, -2)], context), '$$');
      }
      continue;
    }

    const currentMathFencePrefix = protectedMask[i] || codeMask[i] ? null : mathFencePrefix(lines[i]);
    if (currentMathFencePrefix !== null) {
      const content: string[] = [];
      let endIndex = -1;

      for (let j = i + 1; j < lines.length; j++) {
        if (!protectedMask[j] && !codeMask[j] && mathFencePrefix(lines[j]) === currentMathFencePrefix) {
          endIndex = j;
          break;
        }

        if (protectedMask[j] || codeMask[j]) {
          break;
        }

        content.push(currentMathFencePrefix === '' ? lines[j] : stripBlockquotePrefixes(lines[j]));
      }

      if (endIndex !== -1) {
        result.push(
            `${currentMathFencePrefix}$$`,
            ...normalizeMathBlockContent(content, context).map((line) => `${currentMathFencePrefix}${line}`),
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
