# 温州城市事实发布引擎 · 交付验证（Fact Publishing Engine Demo）

这是「城市可信内容枢纽对外事实发布层」的**交付验证演示**：模拟如果该系统实施，它最终通过互联网交付的实时页面是什么样子。

**在线演示**：https://huangzuomin.github.io/wz-fact-engine-demo/fact/

## 这是什么

不是新的新闻网站，也不是第二套 CMS，而是位于「城市可信内容枢纽」与外部互联网之间的一层**事实发布基础设施**：

- 10 个高价值城市实体（文旅空间 / 美食产业 / 重大工程 / 公共服务），每个实体一个永久 ID（如 `WZ-PLACE-00001237`）
- 每个实体一页事实档案：当前事实（含状态机）、历史时间线、证据链（原文引用 + 物理锚点 + span 哈希）、相关事实、相关新闻
- 六类机器出口：HTML（服务端直出）、JSON API（`<ID>.json`）、JSON-LD（schema.org）、Sitemap、RSS/JSON Feed、MCP 说明
- 事实状态机：`active / superseded / expired / corrected / retracted / disputed / uncertain / unverified`，旧值不覆盖、保留替代关系
- 原生时间模型：`sourcePublishedAt / validFrom / validTo / lastVerifiedAt / reviewAfter`，六档时间精度

全部 53 条事实、112 条证据均来自「城市可信内容枢纽 news-base-mcp」的真实数据（12 万+篇媒体资产、16 万+条证据片段），未引入外部知识。

## 亮点事实（演示状态机真实场景）

- 大黄鱼养殖产量：2022 年 17318 吨（`superseded`）→ 2025 年 2.2 万吨（`active`），版本替代关系保留可查
- 园博园精确开园日期：无公告级证据，明确表达 `uncertain` 而非虚构精度
- 产值「15 亿 vs 19 亿」：仅标题级证据，进入 `uncertain` + L3 人工复核
- 2026 大黄鱼品牌嘉年华：活动到期自动转 `expired`
- 一条 2019 年教育口径证据：主张与锚点错位，标 `unverified` 不作权威引用

## 目录结构

```
build/
  facts.data.js   # 策展事实数据集（10 实体 × 事实/时间线/证据引用）
  render.js       # 站点生成器（HTML + JSON-LD + JSON API + sitemap + feed）
  server.js       # 本地预览服务（干净 URL）
  sanitize.js     # 发布前 Token 净化
_mcp/
  call.js         # MCP 客户端（需环境变量 MCP_TOKEN / MCP_SESSION）
  harvest.js      # 实体数据采集脚本
  data/           # 从枢纽采集的原始返回（证据片段/资产/画像）
  titles.json     # get_asset_detail 批量补齐的证据标题档案
```

## 本地重建

```bash
# 本地版（根路径部署）
node build/render.js
node build/server.js   # http://127.0.0.1:8010/fact/

# GitHub Pages 版（子路径部署）
DEPLOY_BASE=https://<user>.github.io/<repo> OUT_DIR=deploy node build/render.js
```

## 声明

- 本仓库仅为技术方案交付验证演示；内容数据版权归**温州新闻网（温州日报报业集团）**所有
- 内部实施方案文档不包含在本仓库中
- 事实内容引用请保留实体永久 ID 与证据回链
