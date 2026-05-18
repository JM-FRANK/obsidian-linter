import {moveFollowingMathIntoCallout, moveMathOutOfCallouts} from './callout';
import {normalizePersonalHeadingSpacing} from './headings';
import {normalizeInlineMathSpacing} from './inline-math';
import {createFormatContext, linesOf} from './line-utils';
import {normalizeBlockMath} from './math-block';
import {resolvePersonalFormatterProfile} from './profile';
import {ensureTableAndCalloutSpacing, normalizeBasicLineCleanup} from './spacing';
import {PersonalObsidianFormatterOptions} from './types';

export type {PersonalObsidianFormatterOptions} from './types';

export function formatPersonalObsidianMarkdown(text: string, options: PersonalObsidianFormatterOptions = {}): string {
  const context = createFormatContext();
  const profile = resolvePersonalFormatterProfile(options);
  let lines = linesOf(text);

  if (profile.mathBlock.normalizeBlockMath) {
    lines = normalizeBlockMath(lines, context);
  }
  if (profile.inlineMath.normalizeSpacing) {
    lines = normalizeInlineMathSpacing(lines, context);
  }
  if (profile.callout.mathPlacement === 'move-into-callout') {
    lines = moveFollowingMathIntoCallout(lines, context);
  } else if (profile.callout.mathPlacement === 'move-out-of-callout') {
    lines = moveMathOutOfCallouts(lines, context);
  }
  lines = normalizeBasicLineCleanup(lines, context);
  if (profile.headings.strategy === 'personal-compact') {
    lines = normalizePersonalHeadingSpacing(lines, context);
  }
  lines = ensureTableAndCalloutSpacing(lines, context);

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return `${lines.join('\n')}\n`;
}
