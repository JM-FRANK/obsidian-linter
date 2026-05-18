import {FormatContext} from './types';
import {getCodeFenceMask, headingLevel, isTagOnlyLine} from './line-utils';

export function normalizePersonalHeadingSpacing(lines: string[], context: FormatContext): string[] {
  const codeMask = getCodeFenceMask(lines, context);
  const result: string[] = [];
  let currentContentHeadingLevel: number | null = null;
  let latestHeadingLevel: number | null = null;
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
    const lineIsTagOnly = isTagOnlyLine(line);

    if (line.trim() === '') {
      pendingBlank = true;
      continue;
    }

    if (lineHeadingLevel !== null) {
      const previousLine = result[result.length - 1];
      const previousHeadingLevel = previousLine ? headingLevel(previousLine) : null;
      const previousIsHeading = previousHeadingLevel !== null;
      const previousIsTagOnly = previousLine !== undefined && isTagOnlyLine(previousLine);
      const previousIsContent = previousLine !== undefined && previousLine.trim() !== '' && !previousIsHeading && !previousIsTagOnly;

      if (previousIsHeading) {
        pendingBlank = previousHeadingLevel > lineHeadingLevel;
      } else if (previousIsContent) {
        pendingBlank = currentContentHeadingLevel !== null && currentContentHeadingLevel !== lineHeadingLevel;
      } else if (previousIsTagOnly) {
        pendingBlank = false;
      }

      if (pendingBlank && result.length > 0) {
        result.push('');
      }

      result.push(line);
      latestHeadingLevel = lineHeadingLevel;
      pendingBlank = false;
      continue;
    }

    if (pendingBlank) {
      const previousLine = result[result.length - 1];
      if (previousLine !== undefined && previousLine.trim() !== '' && headingLevel(previousLine) === null && !isTagOnlyLine(previousLine)) {
        result.push('');
      }
    }

    result.push(line);
    pendingBlank = false;
    if (!lineIsTagOnly) {
      currentContentHeadingLevel = latestHeadingLevel;
    }
  }

  return result;
}
