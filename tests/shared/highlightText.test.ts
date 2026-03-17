import { describe, expect, it } from 'vitest';
import { buildHighlightSegments } from '@/shared/lib/highlightText';

describe('buildHighlightSegments', () => {
  it('关键字为空时返回原文', () => {
    expect(buildHighlightSegments('获得2次免费刷新', [])).toEqual([
      {
        text: '获得2次免费刷新',
        highlighted: false,
      },
    ]);
  });

  it('按多个关键字切分并标记高亮片段', () => {
    expect(
      buildHighlightSegments('每次获得层数并再次获得', ['获得', '层数']),
    ).toEqual([
      {
        text: '每次',
        highlighted: false,
      },
      {
        text: '获得',
        highlighted: true,
      },
      {
        text: '层数',
        highlighted: true,
      },
      {
        text: '并再次',
        highlighted: false,
      },
      {
        text: '获得',
        highlighted: true,
      },
    ]);
  });

  it('长关键字优先，避免短关键字拆碎标签文本', () => {
    expect(buildHighlightSegments('<获得时>获得2次刷新', ['获得', '获得时'])).toEqual([
      {
        text: '<',
        highlighted: false,
      },
      {
        text: '获得时',
        highlighted: true,
      },
      {
        text: '>',
        highlighted: false,
      },
      {
        text: '获得',
        highlighted: true,
      },
      {
        text: '2次刷新',
        highlighted: false,
      },
    ]);
  });
});
