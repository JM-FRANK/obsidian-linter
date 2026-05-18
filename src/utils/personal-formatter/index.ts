import {moveFollowingMathIntoCallout, moveMathOutOfCallouts} from './callout';
import {normalizePersonalHeadingSpacing} from './headings';
import {normalizeInlineMathSpacing} from './inline-math';
import {createFormatContext, linesOf} from './line-utils';
import {normalizeBlockMath} from './math-block';
import {ensureTableAndCalloutSpacing, normalizeBasicLineCleanup} from './spacing';
import {PersonalObsidianFormatterOptions} from './types';

export type {PersonalObsidianFormatterOptions} from './types';

export function formatPersonalObsidianMarkdown(text: string, options: PersonalObsidianFormatterOptions = {}): string {
  const context = createFormatContext();
  let lines = linesOf(text);

  lines = normalizeBlockMath(lines, context);
  lines = normalizeInlineMathSpacing(lines, context);
  if (options.moveMathIntoCallout ?? true) {
    lines = moveFollowingMathIntoCallout(lines, context);
  } else {
    lines = moveMathOutOfCallouts(lines, context);
  }
  lines = normalizeBasicLineCleanup(lines, context);
  lines = normalizePersonalHeadingSpacing(lines, context);
  lines = ensureTableAndCalloutSpacing(lines, context);

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}
