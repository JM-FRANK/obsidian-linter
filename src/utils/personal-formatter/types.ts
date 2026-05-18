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

export type PersonalObsidianFormatterOptions = {
  moveMathIntoCallout?: boolean;
};
