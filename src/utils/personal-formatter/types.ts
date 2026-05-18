export type CodeFenceInfo = {
  marker: string;
  length: number;
};

export type CleanLatexBlock = {
  latexLines: string[];
  fallbackLines: string[];
  canUseAst: boolean;
};

export type FormatContext = {
  codeFenceMaskCache: WeakMap<string[], boolean[]>;
  scanResultCache: WeakMap<string[], PersonalFormatterScanResult>;
  latexParseCache: Map<string, unknown[] | null>;
};

export type PersonalFormatterSpanKind =
  | 'codeFence'
  | 'mathBlock'
  | 'callout'
  | 'table'
  | 'yaml'
  | 'customIgnore';

export type PersonalFormatterSpan = {
  kind: PersonalFormatterSpanKind;
  start: number;
  end: number;
  meta?: Record<string, unknown>;
};

export type PersonalFormatterScanResult = {
  lines: string[];
  spans: PersonalFormatterSpan[];
  codeFenceMask: boolean[];
  mathBlockMask: boolean[];
};

export type CalloutMathPlacement = 'move-into-callout' | 'move-out-of-callout' | 'keep';

export type PersonalFormatterProfile = {
  mathBlock: {
    normalizeBlockMath: boolean;
    collapseSimpleEquations: boolean;
  };
  inlineMath: {
    normalizeSpacing: boolean;
  };
  callout: {
    mathPlacement: CalloutMathPlacement;
    preserveInternalBlankQuoteLines: boolean;
  };
  spacing: {
    tableBlankLines: 'one';
    calloutBlankLines: 'one-around' | 'adjacent-only';
  };
  headings: {
    strategy: 'personal-compact' | 'none';
  };
};

export type PersonalObsidianFormatterOptions = {
  mathPlacement?: CalloutMathPlacement;
  moveMathIntoCallout?: boolean;
};
