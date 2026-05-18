import {codeFenceRegex} from './constants';
import {CodeFenceInfo, FormatContext} from './types';

export function linesOf(text: string): string[] {
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

export function getCodeFenceMask(lines: string[], context: FormatContext): boolean[] {
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

export function createFormatContext(): FormatContext {
  return {
    codeFenceMaskCache: new WeakMap<string[], boolean[]>(),
    latexParseCache: new Map<string, unknown[] | null>(),
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function mathFencePrefix(line: string): string | null {
  const match = line.match(/^((?:>\s*)*)\$\$\s*$/);
  if (!match) {
    return null;
  }

  const quoteDepth = match[1].match(/>/g)?.length ?? 0;
  return quoteDepth === 0 ? '' : `${'> '.repeat(quoteDepth)}`;
}

export function getMathBlockMask(lines: string[]): boolean[] {
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

export function stripBlockquotePrefixes(line: string): string {
  return line.replace(/^(>\s*)+/, '');
}

export function headingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+\S/);
  return match ? match[1].length : null;
}

export function isTagOnlyLine(line: string): boolean {
  return /^(?:#[^\s#]+)(?:\s+#[^\s#]+)*$/.test(line.trim());
}
