import {PersonalFormatterProfile, PersonalObsidianFormatterOptions} from './types';

export const defaultPersonalFormatterProfile: PersonalFormatterProfile = {
  mathBlock: {
    normalizeBlockMath: true,
    collapseSimpleEquations: true,
  },
  inlineMath: {
    normalizeSpacing: true,
  },
  callout: {
    mathPlacement: 'move-into-callout',
    preserveInternalBlankQuoteLines: false,
  },
  spacing: {
    tableBlankLines: 'one',
    calloutBlankLines: 'one-around',
  },
  headings: {
    strategy: 'personal-compact',
  },
};

export function resolvePersonalFormatterProfile(options: PersonalObsidianFormatterOptions = {}): PersonalFormatterProfile {
  const mathPlacement = options.mathPlacement ??
    ((options.moveMathIntoCallout ?? true) ? 'move-into-callout' : 'move-out-of-callout');

  return {
    ...defaultPersonalFormatterProfile,
    callout: {
      ...defaultPersonalFormatterProfile.callout,
      mathPlacement,
    },
  };
}
