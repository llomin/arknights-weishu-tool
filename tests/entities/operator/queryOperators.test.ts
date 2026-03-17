import { describe, expect, it } from 'vitest';
import { buildOperatorGroups } from '@/entities/operator/model/buildOperatorGroups';
import { filterOperators } from '@/entities/operator/model/queryOperators';
import type { OperatorEntity } from '@/shared/types/domain';

const operators: OperatorEntity[] = [
  {
    id: '甲',
    name: '甲',
    covenants: ['炎', '迅捷'],
    traitCategory: '持续叠加',
    traitTags: [],
    description: '每次攻击使已激活的[炎]层数+2',
    tierLabel: '6阶',
    tier: 6,
    priorityBucket: 'each_and_layers',
    priorityWeight: 0,
    searchText: '每次攻击使已激活的[炎]层数+2',
  },
  {
    id: '乙',
    name: '乙',
    covenants: ['炎'],
    traitCategory: '单次叠加',
    traitTags: [],
    description: '<获得时>使自身攻击力提升',
    tierLabel: '5阶',
    tier: 5,
    priorityBucket: 'gain',
    priorityWeight: 2,
    searchText: '<获得时>使自身攻击力提升',
  },
  {
    id: '丙',
    name: '丙',
    covenants: ['迅捷'],
    traitCategory: '作战能力',
    traitTags: [],
    description: '攻击速度提升(受层数影响)',
    tierLabel: '4阶',
    tier: 4,
    priorityBucket: 'layers',
    priorityWeight: 1,
    searchText: '攻击速度提升(受层数影响)',
  },
];

describe('filterOperators', () => {
  it('只返回命中已选盟约且通过搜索的干员', () => {
    expect(filterOperators(operators, ['炎'], '获得').map((item) => item.id)).toEqual([
      '乙',
    ]);
  });

  it('支持空格分隔的多关键字搜索', () => {
    expect(
      filterOperators(operators, ['炎', '迅捷'], '攻击 层数').map(
        (item) => item.id,
      ),
    ).toEqual(['甲', '丙']);
  });

  it('会过滤当次删掉的干员', () => {
    expect(
      filterOperators(operators, ['炎', '迅捷'], '', ['甲']).map(
        (item) => item.id,
      ),
    ).toEqual(['丙', '乙']);
  });

  it('按优先级和阶位排序', () => {
    expect(filterOperators(operators, ['炎', '迅捷'], '').map((item) => item.id)).toEqual(
      ['甲', '丙', '乙'],
    );
  });
});

describe('buildOperatorGroups', () => {
  it('按盟约分组，并过滤掉空分组', () => {
    const groups = buildOperatorGroups(operators, ['炎', '谢拉格'], '');

    expect(groups).toHaveLength(1);
    expect(groups[0]?.covenantId).toBe('炎');
    expect(groups[0]?.operators.map((item) => item.id)).toEqual(['甲', '乙']);
  });

  it('组内继续遵循搜索条件', () => {
    const groups = buildOperatorGroups(operators, ['炎', '迅捷'], '攻击 层数');

    expect(groups).toHaveLength(2);
    expect(groups[0]?.operators.map((item) => item.id)).toEqual(['甲']);
    expect(groups[1]?.operators.map((item) => item.id)).toEqual(['甲', '丙']);
  });

  it('会在分组里排除已删干员', () => {
    const groups = buildOperatorGroups(operators, ['炎', '迅捷'], '', ['甲']);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.operators.map((item) => item.id)).toEqual(['乙']);
    expect(groups[1]?.operators.map((item) => item.id)).toEqual(['丙']);
  });
});
