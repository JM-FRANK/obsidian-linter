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
  return {
    ...defaultPersonalFormatterProfile,
    callout: {
      ...defaultPersonalFormatterProfile.callout,
      // Keep legacy behavior until the public option is migrated to an explicit three-state setting.
      mathPlacement: (options.moveMathIntoCallout ?? true) ? 'move-into-callout' : 'move-out-of-callout',
    },
  };
}
