import {scanCodeFenceMask, scanMathBlockMask} from './scan';
import {FormatContext, PersonalFormatterScanResult} from './types';

export function linesOf(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n+$/g, '').split('\n');
}

export function getCodeFenceMask(lines: string[], context: FormatContext): boolean[] {
  return scanCodeFenceMask(lines, context);
}

export function createFormatContext(): FormatContext {
  return {
    codeFenceMaskCache: new WeakMap<string[], boolean[]>(),
    scanResultCache: new WeakMap<string[], PersonalFormatterScanResult>(),
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
  return scanMathBlockMask(lines);
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
