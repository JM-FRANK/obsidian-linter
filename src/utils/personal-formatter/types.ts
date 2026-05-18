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

export type PersonalObsidianFormatterOptions = {
  moveMathIntoCallout?: boolean;
};
