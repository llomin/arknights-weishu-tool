function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

function getUniqueKeywords(keywords: string[]) {
  return [...new Set(keywords.filter((keyword) => keyword.trim().length > 0))].sort(
    (left, right) => right.length - left.length,
  );
}

export function buildHighlightSegments(
  sourceText: string,
  keywords: string[],
): HighlightSegment[] {
  const normalizedKeywords = getUniqueKeywords(keywords);

  if (normalizedKeywords.length === 0) {
    return [
      {
        text: sourceText,
        highlighted: false,
      },
    ];
  }

  const matcher = new RegExp(
    `(${normalizedKeywords.map((keyword) => escapeRegExp(keyword)).join('|')})`,
    'gi',
  );
  const parts = sourceText.split(matcher).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return [
      {
        text: sourceText,
        highlighted: false,
      },
    ];
  }

  return parts.map((part) => ({
    text: part,
    highlighted: normalizedKeywords.some(
      (keyword) => part.toLocaleLowerCase() === keyword.toLocaleLowerCase(),
    ),
  }));
}
