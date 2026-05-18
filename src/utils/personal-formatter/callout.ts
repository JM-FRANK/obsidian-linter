import {calloutStartRegex} from './constants';
import {FormatContext} from './types';
import {findInlineMathEnd} from './inline-math';
import {getCodeFenceMask, getMathBlockMask, headingLevel, mathFencePrefix, stripBlockquotePrefixes} from './line-utils';
import {scanProtectedLineMask} from './scan';

function isPlainMathFence(line: string): boolean {
  return line.trim() === '$$';
}

function moveMathLineIntoCallout(line: string): string {
  return `> ${stripBlockquotePrefixes(line)}`;
}

function findPlainMathBlockEnd(lines: string[], codeMask: boolean[], startIndex: number): number {
  if (startIndex >= lines.length || codeMask[startIndex] || !isPlainMathFence(lines[startIndex])) {
    return -1;
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (codeMask[i]) {
      return -1;
    }

    if (isPlainMathFence(lines[i])) {
      return i;
    }
  }

  return -1;
}

function findMathBlockEndAtPrefix(lines: string[], codeMask: boolean[], startIndex: number, prefix: string): number {
  if (startIndex >= lines.length || codeMask[startIndex] || mathFencePrefix(lines[startIndex]) !== prefix) {
    return -1;
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (codeMask[i]) {
      return -1;
    }

    if (mathFencePrefix(lines[i]) === prefix) {
      return i;
    }
  }

  return -1;
}

function isInlineMathParagraphStart(line: string): boolean {
  const trimmedLine = line.trim();
  return trimmedLine.startsWith('$') && !trimmedLine.startsWith('$$') && findInlineMathEnd(trimmedLine, 0) !== -1;
}

function isInlineMathParagraphContinuation(line: string): boolean {
  const trimmedLine = line.trim();
  return trimmedLine !== '' &&
    !trimmedLine.startsWith('>') &&
    !isPlainMathFence(trimmedLine) &&
    !calloutStartRegex.test(trimmedLine) &&
    headingLevel(trimmedLine) === null &&
    trimmedLine.includes('$');
}

export function moveFollowingMathIntoCallout(lines: string[], context: FormatContext): string[] {
  const protectedMask = scanProtectedLineMask(lines, context);
  const codeMask = getCodeFenceMask(lines, context);
  const mathBlockMask = getMathBlockMask(lines);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (protectedMask[i] || codeMask[i] || mathBlockMask[i] || !calloutStartRegex.test(lines[i])) {
      result.push(lines[i]);
      continue;
    }

    const calloutLines: string[] = [];
    let j = i;
    while (j < lines.length && !protectedMask[j] && !codeMask[j] && lines[j].startsWith('>') && (j === i || !calloutStartRegex.test(lines[j]))) {
      calloutLines.push(lines[j]);
      j++;
    }

    const calloutWithMathLines = [...calloutLines];
    let nextIndex = j;
    let movedMath = false;

    while (nextIndex < lines.length && !protectedMask[nextIndex] && !codeMask[nextIndex]) {
      while (nextIndex < lines.length && !protectedMask[nextIndex] && !codeMask[nextIndex] && lines[nextIndex].startsWith('>') && !calloutStartRegex.test(lines[nextIndex])) {
        calloutWithMathLines.push(lines[nextIndex]);
        nextIndex++;
      }

      let mathStart = nextIndex;
      if (mathStart < lines.length && !protectedMask[mathStart] && !codeMask[mathStart] && lines[mathStart].trim() === '') {
        break;
      }

      if (isInlineMathParagraphStart(lines[mathStart])) {
        while (mathStart < lines.length && !protectedMask[mathStart] && !codeMask[mathStart] && isInlineMathParagraphContinuation(lines[mathStart])) {
          calloutWithMathLines.push(moveMathLineIntoCallout(lines[mathStart]));
          mathStart++;
        }

        movedMath = true;
        nextIndex = mathStart;
        continue;
      }

      const mathEnd = findPlainMathBlockEnd(lines, codeMask, mathStart);
      if (mathEnd === -1) {
        break;
      }

      for (let k = mathStart; k <= mathEnd; k++) {
        calloutWithMathLines.push(moveMathLineIntoCallout(lines[k]));
      }

      movedMath = true;
      nextIndex = mathEnd + 1;
    }

    if (movedMath) {
      result.push(...calloutWithMathLines);
      i = nextIndex - 1;
      continue;
    }

    result.push(...calloutLines);
    i = j - 1;
  }

  return result;
}

function isBlockquoteLineAtDepth(line: string, depth: number): boolean {
  return (line.match(/>/g)?.length ?? 0) >= depth;
}

export function moveMathOutOfCallouts(lines: string[], context: FormatContext): string[] {
  const protectedMask = scanProtectedLineMask(lines, context);
  const codeMask = getCodeFenceMask(lines, context);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (protectedMask[i] || codeMask[i] || !calloutStartRegex.test(lines[i])) {
      result.push(lines[i]);
      continue;
    }

    const calloutDepth = lines[i].match(/>/g)?.length ?? 1;
    result.push(lines[i]);

    for (let j = i + 1; j < lines.length; j++) {
      if (protectedMask[j] || codeMask[j] || calloutStartRegex.test(lines[j]) || !isBlockquoteLineAtDepth(lines[j], calloutDepth)) {
        i = j - 1;
        break;
      }

      if (mathFencePrefix(lines[j]) === `${'> '.repeat(calloutDepth)}`) {
        const mathEnd = findMathBlockEndAtPrefix(lines, codeMask, j, `${'> '.repeat(calloutDepth)}`);
        if (mathEnd !== -1) {
          for (let k = j; k <= mathEnd; k++) {
            result.push(stripBlockquotePrefixes(lines[k]));
          }
          i = mathEnd;
          j = mathEnd;
          continue;
        }
      }

      result.push(lines[j]);
      i = j;
    }
  }

  return result;
}
