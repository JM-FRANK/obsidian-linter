import {readFileSync} from 'fs';
import {formatPersonalObsidianMarkdown} from '../src/utils/personal-obsidian-formatter';

const baselineDir = 'test-vault/personal-formatter-baselines';
const realNoteFixtures = [
  '6、吉田さんは来月中国へ行きます',
  'Calc_L3、洛必达、泰勒麦克劳林展开、积分方法',
];

function getCodeFences(text: string): string[] {
  const fences: string[] = [];
  const lines = text.split('\n');
  let fence: { marker: string, length: number } | null = null;
  let currentFence: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*(`{3,}|~{3,})/);

    if (fence) {
      currentFence.push(line);

      if (match && match[1][0] === fence.marker && match[1].length >= fence.length) {
        fences.push(currentFence.join('\n'));
        fence = null;
        currentFence = [];
      }

      continue;
    }

    if (match) {
      fence = {
        marker: match[1][0],
        length: match[1].length,
      };
      currentFence = [line];
    }
  }

  return fences;
}

function countMatches(text: string, regex: RegExp): number {
  return (text.match(regex) ?? []).length;
}

function expectTablesToHaveOneBlankLineAroundThem(text: string) {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes('|') || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
      continue;
    }

    if (i > 0) {
      expect(lines[i - 1]).toBe('');
    }

    let tableEnd = i + 1;
    while (tableEnd + 1 < lines.length && lines[tableEnd + 1].includes('|') && lines[tableEnd + 1].trim() !== '') {
      tableEnd++;
    }

    if (tableEnd + 1 < lines.length && lines[tableEnd + 1] !== '') {
      expect(lines[tableEnd + 1]).toBe('');
    }

    i = tableEnd;
  }
}

describe('Personal Obsidian formatter real note fixtures', () => {
  for (const noteName of realNoteFixtures) {
    it(`${noteName} keeps protected structures while normalizing layout`, () => {
      const original = readFileSync(`${baselineDir}/${noteName}.original.md`, 'utf8');
      const formatted = formatPersonalObsidianMarkdown(original);

      expect(formatted.endsWith('\n')).toBe(true);
      expect(formatted).not.toMatch(/[ \t]+$/m);
      expect(formatted).not.toMatch(/\n[ \t]*\n[ \t]*\n/);
      expect(getCodeFences(formatted)).toEqual(getCodeFences(original));
      expect(countMatches(formatted, /\{[^\n{}|]*(?:\\\||\|)[^\n{}]*\}/g)).toBe(countMatches(original, /\{[^\n{}|]*(?:\\\||\|)[^\n{}]*\}/g));
      expect(countMatches(formatted, /^#rel\/\S+\s+\[\[[^\n]+\]\]/gm)).toBe(countMatches(original, /^#rel\/\S+\s+\[\[[^\n]+\]\]/gm));
      expect(countMatches(formatted, /^>\s*\[![^\]]+\]/gm)).toBe(countMatches(original, /^>\s*\[![^\]]+\]/gm));
      expectTablesToHaveOneBlankLineAroundThem(formatted);
    });
  }
});
