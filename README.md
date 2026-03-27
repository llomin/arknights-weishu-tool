# 卫戍协议助手

面向《明日方舟》“卫戍协议”模式的盟约筛选与抓牌辅助工具，帮助你更快完成“选盟约 -> 看可用干员 -> 组阵容”决策。

[在线体验](https://arknights-weishu-tool.llomin.top)

<p>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img alt="Vite 7" src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" />
</p>

<img alt="卫戍协议助手预览图" src="assets/overview.png" />

## 核心功能

- 盟约多选与阶段切换（同盟约循环切换激活人数）
- 基于盟约、最大人口、当前等级计算推荐阵容
- 干员按优先级分组展示（优先抓牌 / 其他可选）
- 描述分词搜索与关键词高亮
- 局内临时禁用、恢复与已抓牌标记

## 快速开始

### 在线使用

直接访问在线版，无需安装。

### 本地开发

环境要求：

- Node.js 20+
- npm

安装与启动：

```bash
npm install
npm run dev
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查并构建生产包 |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | 运行 ESLint |
| `npm run test` | 运行 Vitest |
| `npm run test:watch` | 监听模式测试 |

## 项目结构

```text
data/   # 本地静态数据（盟约、干员）
src/    # 页面、领域模型与交互逻辑
tests/  # 测试代码
```

## 数据维护

- 当前数据源：`data/covenants.json`、`data/operators.json`
- 页面加载时会执行数据标准化与结构校验
- 游戏内容更新后需同步更新数据与规则
