import { normalizeSearchText } from './normalizeSearchText';

export function getSearchKeywords(value: string) {
  return normalizeSearchText(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
