# 卫戍协议拿牌策略工具

一个基于 `Vite + React + TypeScript` 的静态数据驱动工具，用来辅助“卫戍协议”对局内的盟约筛选与拿牌决策。

当前版本已实现：

- 盟约多选筛选
- 按盟约分组展示干员
- 按描述关键字搜索，支持空格分词
- 按业务优先级 + 阶位稳定排序
- 点击卡片标记“已拿牌”
- 单独移除本局不再考虑的干员，并支持恢复
- 描述命中词高亮

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发环境

```bash
npm run dev
```

默认使用 Vite 本地开发服务器。

### 3. 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发环境 |
| `npm run build` | TypeScript 构建检查 + 生产打包 |
| `npm run preview` | 预览打包结果 |
| `npm run lint` | 运行 ESLint |
| `npm run test` | 运行 Vitest 单测 |
| `npm run test:watch` | 监听模式运行测试 |

## 技术栈

- `Vite 7`
- `React 19`
- `TypeScript 5`
- `Zustand`：承载页面交互状态
- `Zod`：校验本地 JSON 数据结构
- `CSS Modules` + 全局样式令牌
- `Vitest` + `Testing Library`

## 项目结构

```text
.
├─ data/                     # 原始业务数据
├─ docs/                     # 设计与说明文档
├─ src/
│  ├─ app/                   # 应用入口
│  ├─ entities/              # 领域模型：盟约、干员
│  ├─ features/              # 交互状态与行为
│  ├─ pages/                 # 页面级组合
│  ├─ shared/                # 通用类型、工具函数、样式令牌
│  └─ tests/                 # 测试初始化
├─ tests/                    # 纯逻辑测试
├─ dist/                     # 构建产物，不要手改
└─ vite.config.ts            # Vite / Vitest 配置
```

## 关键入口

- 页面入口：[src/app/App.tsx](/D:/Project/js/llomin-weishu-tool/src/app/App.tsx)
- 主页面：[src/pages/strategy-board/StrategyBoardPage.tsx](/D:/Project/js/llomin-weishu-tool/src/pages/strategy-board/StrategyBoardPage.tsx)
- 状态管理：[src/features/strategy/model/useStrategyStore.ts](/D:/Project/js/llomin-weishu-tool/src/features/strategy/model/useStrategyStore.ts)
- 盟约标准化：[src/entities/covenant/model/normalizeCovenants.ts](/D:/Project/js/llomin-weishu-tool/src/entities/covenant/model/normalizeCovenants.ts)
- 干员标准化：[src/entities/operator/model/normalizeOperators.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/normalizeOperators.ts)
- 筛选与排序：[src/entities/operator/model/queryOperators.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/queryOperators.ts)
- 分组逻辑：[src/entities/operator/model/buildOperatorGroups.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/buildOperatorGroups.ts)
- 排序优先级规则：[src/entities/operator/model/operatorPriority.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/operatorPriority.ts)
- 初始设计文档：[docs/项目初始化设计.md](/D:/Project/js/llomin-weishu-tool/docs/项目初始化设计.md)

## 数据来源

项目使用本地静态 JSON 作为唯一数据源：

- [data/covenants.json](/D:/Project/js/llomin-weishu-tool/data/covenants.json)
- [data/operators.json](/D:/Project/js/llomin-weishu-tool/data/operators.json)

当前实现会在模块加载时完成一次标准化，并用 `Zod` 校验结构：

- 盟约：`对象映射 -> CovenantEntity[]`
- 干员：`对象映射 -> OperatorEntity[]`
- 阶位、排序权重、搜索文本都会预计算

当前数据规模：

- 盟约 `23` 个
- 干员 `115` 名
- “主要盟约”固定取前 `8` 个，规则见 `normalizeCovenants.ts`

## 当前业务规则

### 盟约筛选

- 支持多选
- 未选择任何盟约时，不展示干员列表
- 同一干员可同时属于多个盟约，因此可能出现在多个分组里

### 搜索

- 搜索范围是干员 `trait.description`
- 支持空格分词，例如：`获得 层数`
- 实际匹配逻辑为“所有关键词都命中”
- 搜索会和盟约筛选、已删干员过滤一起生效

### 排序

默认排序规则：

1. 描述同时包含“每”和“层数”
2. 描述包含“层数”
3. 描述包含“获得”
4. 描述包含“与其相同”
5. 其他

同一优先级下继续按：

1. 阶位降序
2. 名称升序

规则实现位置：

- [src/entities/operator/model/operatorPriority.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/operatorPriority.ts)
- [src/entities/operator/model/queryOperators.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/queryOperators.ts)

### 卡片状态

- 点击卡片：切换“已拿牌”
- 点击“删”：从本局结果中移除该干员
- 点击“恢复已删”：清空本局移除列表
- 点击“清空本局”：重置所有筛选和状态

状态存放在：

- [src/features/strategy/model/useStrategyStore.ts](/D:/Project/js/llomin-weishu-tool/src/features/strategy/model/useStrategyStore.ts)

## 维护时优先看哪里

### 1. 改页面交互或布局

优先查看：

- [src/pages/strategy-board/StrategyBoardPage.tsx](/D:/Project/js/llomin-weishu-tool/src/pages/strategy-board/StrategyBoardPage.tsx)
- [src/pages/strategy-board/StrategyBoardPage.module.css](/D:/Project/js/llomin-weishu-tool/src/pages/strategy-board/StrategyBoardPage.module.css)

### 2. 改盟约分组、主次分类

优先查看：

- [src/entities/covenant/model/normalizeCovenants.ts](/D:/Project/js/llomin-weishu-tool/src/entities/covenant/model/normalizeCovenants.ts)

注意：

- `PRIMARY_COVENANT_COUNT = 8` 控制“主要盟约 / 次要盟约”划分
- 当前划分基于源数据顺序，不是额外配置表

### 3. 改排序、搜索、过滤规则

优先查看：

- [src/entities/operator/model/operatorPriority.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/operatorPriority.ts)
- [src/entities/operator/model/queryOperators.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/queryOperators.ts)
- [src/entities/operator/model/buildOperatorGroups.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/buildOperatorGroups.ts)
- [src/shared/lib/normalizeSearchText.ts](/D:/Project/js/llomin-weishu-tool/src/shared/lib/normalizeSearchText.ts)
- [src/shared/lib/searchKeywords.ts](/D:/Project/js/llomin-weishu-tool/src/shared/lib/searchKeywords.ts)
- [src/shared/lib/highlightText.ts](/D:/Project/js/llomin-weishu-tool/src/shared/lib/highlightText.ts)

### 4. 改数据结构或新增字段

优先查看：

- [src/entities/covenant/model/covenant.schema.ts](/D:/Project/js/llomin-weishu-tool/src/entities/covenant/model/covenant.schema.ts)
- [src/entities/operator/model/operator.schema.ts](/D:/Project/js/llomin-weishu-tool/src/entities/operator/model/operator.schema.ts)
- [src/shared/types/domain.ts](/D:/Project/js/llomin-weishu-tool/src/shared/types/domain.ts)

如果 JSON 结构改了，通常要同时调整：

- `schema`
- `normalize`
- 相关测试

## 测试说明

当前测试主要覆盖纯逻辑：

- 排序优先级判断
- 干员标准化统计
- 搜索 / 分组 / 已删过滤
- 描述高亮切分

对应文件：

- [tests/entities/operator/operatorPriority.test.ts](/D:/Project/js/llomin-weishu-tool/tests/entities/operator/operatorPriority.test.ts)
- [tests/entities/operator/normalizeOperators.test.ts](/D:/Project/js/llomin-weishu-tool/tests/entities/operator/normalizeOperators.test.ts)
- [tests/entities/operator/queryOperators.test.ts](/D:/Project/js/llomin-weishu-tool/tests/entities/operator/queryOperators.test.ts)
- [tests/shared/highlightText.test.ts](/D:/Project/js/llomin-weishu-tool/tests/shared/highlightText.test.ts)

新增业务规则时，建议先补测试，再动实现。

## 开发约定

- 文件读写统一使用 `UTF-8`
- `@` 别名指向 `src/`
- `dist/` 是构建输出目录，不要直接修改
- 原始数据放在 `data/`，页面逻辑不要直接依赖未经标准化的原始字段

## 后续可继续扩展的方向

- 拆分页面内的大组件，细化到 `features/` 级别
- 增加本局状态持久化
- 增加 URL 分享或导入导出能力
- 为核心交互补充组件级测试
- 把“主要盟约”改成显式配置，而不是依赖源数据顺序
