// ============================================================
// 城市实时可信内容分发系统 · 实时链路数据层
// News = Event（刚刚发生了什么） / Fact = State（现在是什么状态）
// ------------------------------------------------------------
// 标注约定：
//   simulated: true  -> 本事件及其遥测为演示模拟（Demo Simulation），页面必须显著标注
//   simulated: false -> 新闻本体为枢纽真实档案（content_id 即真实资产号），
//                       但 Fast Lane 遥测与审核时间为系统重建回放，亦属演示模拟
// 所有 Fact Change 仅允许：new / update / supersede / expire / conflict / no_change
// ============================================================

const TODAY = '2026-09-08';

// ---- 状态词表 ----
const NEWS_LIFECYCLE = {
  published: '已发布', distributed: '已分发', entity_anchored: '实体已锚定',
  claims_extracted: 'Claim 已抽取', fact_change_detected: '检测到事实变化',
  reviewed: '已完成审核', fact_updated: '事实已更新',
};
const CHANGE_TYPES = {
  new: 'New Fact 新增', update: 'Update 更新', supersede: 'Supersede 替代',
  expire: 'Expire 失效', conflict: 'Conflict 冲突', no_change: 'No Change 无变化',
};
const CHANGE_TYPES_SHORT = { new: 'New Fact', update: 'Update', supersede: 'Supersede', expire: 'Expire', conflict: 'Conflict', no_change: 'No Change' };
const REVIEW_STATUS = {
  pending: '待人工确认', approved: '已确认', modified: '已修改确认',
  rejected: '已拒绝', disputed: '已标记冲突',
};
const CLAIM_TYPES = {
  observed_fact: '已发生事实 observed_fact',
  planned: '计划 planned',
  statistics: '统计数据 statistics',
};
const CLAIM_STATUS = { candidate: 'candidate 待处理', accepted: 'accepted 已采纳', rejected: 'rejected 已拒绝' };
const ANCHOR_STATE = { confirmed: 'confirmed 已确认', candidate: 'candidate 候选', rejected: 'rejected 已拒绝' };

// ---- Fast Lane 步骤模板（每事件带独立时间与结果） ----
function fastLane(publishedAt, opts = {}) {
  const t = (offsetSec) => {
    const [h, m] = publishedAt.split(':').map(Number);
    const total = h * 3600 + m * 60 + offsetSec;
    const p = (n) => String(Math.floor(n / 3600) % 24).padStart(2, '0') + ':' + String(Math.floor((n % 3600) / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
    return p(total);
  };
  return [
    { step: '新闻发布', time: t(0), status: 'success', result: 'CMS 发布回调触发 · Content ID 入队' },
    { step: 'Sitemap 更新', time: t(2), status: 'success', result: 'sitemap.xml lastmod 已刷新 · 本次含 1 个新 URL' },
    { step: 'IndexNow 提交', time: t(3), status: 'success', result: 'HTTP 202 Accepted · 1 URL 提交至 Bing / Seznam / Yandex 通道' },
    { step: '百度收录提交', time: t(4), status: opts.baiduFail ? 'failed' : 'success', result: opts.baiduFail ? '普通收录推送超时，已进入重试队列（第 2 次重试成功 13:07:22）' : '普通收录推送成功 · 当日剩余配额 1987/2000' },
    { step: 'Feed 追加', time: t(5), status: 'success', result: 'RSS / JSON Feed 各追加 1 条（News = Event）' },
  ];
}

// ---- 新闻事件 ----
const NEWS_EVENTS = [
  // ============ 今日 · 完整案例 A：大黄鱼产值（已走完全链路） ============
  {
    contentId: '20260908-0347',
    title: '2025年温州大黄鱼全产业链产值达19.2亿元',
    source: '温州新闻网',
    publishedAt: TODAY + ' 10:32',
    publishedAtSec: '10:32:00',
    modifiedAt: TODAY + ' 10:40',
    cmsUrl: 'https://news.66wz.com/system/2026/09/08/105837220.shtml',
    simulated: true,
    excerpt: '记者从温州大黄鱼产业高质量发展专题会上获悉，2025年温州大黄鱼全产业链产值达19.2亿元，养殖产量2.2万吨，其中洞头鹿西一地产量2780吨。会议明确下一步将推进"温州大黄鱼"标准化、品牌化、国际化。',
    lifecycle: 'fact_updated',
    fastLane: fastLane('10:32'),
    anchors: [
      { entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼', matchMethod: '标准名 + 产业关键词（产值/产量）', confidence: 0.97, para: 1, start: 12, end: 18, quote: '大黄鱼全产业链产值达19.2亿元', state: 'confirmed' },
    ],
    claims: [
      {
        claimId: 'cl-20260908-0347-1', entityId: 'WZ-GOOD-00000512',
        predicate: 'industry_output_value（产业产值·年度）', value: '19.2亿元（2025年度）',
        claimType: 'statistics', evidenceText: '文章第1段："2025年温州大黄鱼全产业链产值达19.2亿元"',
        confidence: 0.95, status: 'accepted', changeId: 'chg-20260908-001',
      },
      {
        claimId: 'cl-20260908-0347-2', entityId: 'WZ-GOOD-00000512',
        predicate: 'aquaculture_output_2025（养殖产量·2025）', value: '2.2万吨',
        claimType: 'statistics', evidenceText: '文章第1段："养殖产量2.2万吨"',
        confidence: 0.96, status: 'accepted', changeId: 'chg-20260908-006',
      },
    ],
    reviewSummary: '1 项 Update 经确认生效；1 项与既有事实一致（No Change）',
  },

  // ============ 今日 · 完整案例 B：学校开工（待人工确认） ============
  {
    contentId: '20260908-0361',
    title: '温州市实验中学教育集团滨江校区工程今日正式开工',
    source: '温州新闻网',
    publishedAt: TODAY + ' 13:05',
    publishedAtSec: '13:05:00',
    modifiedAt: TODAY + ' 13:09',
    cmsUrl: 'https://news.66wz.com/system/2026/09/08/105837361.shtml',
    simulated: true,
    excerpt: '9月8日上午，温州市实验中学教育集团滨江校区工程举行开工仪式。该项目位于鹿城区滨江街道，为全市中小学校新建改扩建年度项目之一，总投资约4.2亿元，规划办学规模36个班，预计2028年秋季建成投用。',
    lifecycle: 'fact_change_detected',
    fastLane: fastLane('13:05'),
    anchors: [
      { entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程', matchMethod: '标准名 + 项目类型（年度项目之一）', confidence: 0.96, para: 3, start: 26, end: 38, quote: '全市中小学校新建改扩建年度项目之一', state: 'confirmed' },
      { entityId: null, entityName: '温州实验中学教育集团滨江校区（未建档）', matchMethod: '专名候选 · 受控实体库无此校', confidence: 0.71, para: 1, start: 5, end: 19, quote: '温州市实验中学教育集团滨江校区', state: 'candidate', note: '建议进入建档评估队列，建档前 Claims 仅挂靠市级工程实体' },
    ],
    claims: [
      {
        claimId: 'cl-20260908-0361-1', entityId: 'WZ-SCHOOL-00001782',
        predicate: 'construction_started_on（开工日期）', value: '2026-09-08（滨江校区项目开工）',
        claimType: 'observed_fact', evidenceText: '文章第1段："9月8日上午……工程举行开工仪式"（第3段关联至市级工程实体）',
        confidence: 0.94, status: 'candidate', changeId: 'chg-20260908-002',
      },
      {
        claimId: 'cl-20260908-0361-2', entityId: 'WZ-SCHOOL-00001782',
        predicate: 'planned_completion_year（计划建成年份）', value: '2028年秋季（预计）',
        claimType: 'planned', evidenceText: '文章第3段："预计2028年秋季建成投用" —— 计划口径，不得与已发生事实混同',
        confidence: 0.93, status: 'candidate', changeId: 'chg-20260908-003',
      },
      {
        claimId: 'cl-20260908-0361-3', entityId: 'WZ-SCHOOL-00001782',
        predicate: 'project_total_investment（项目总投资）', value: '约4.2亿元（滨江校区）',
        claimType: 'planned', evidenceText: '文章第3段："总投资约4.2亿元"（"约"字表明计划/概算口径）',
        confidence: 0.92, status: 'candidate', changeId: 'chg-20260908-005',
      },
    ],
    reviewSummary: '3 项 New Fact 待人工确认（其中 2 项为计划口径，须与已发生事实分开建条）',
  },

  // ============ 今日 · No Change 案例 ============
  {
    contentId: '20260908-0365',
    title: 'S1线惠民路站"轨道+美食"惠民市集本周末开市',
    source: '温州新闻网',
    publishedAt: TODAY + ' 11:48',
    publishedAtSec: '11:48:00',
    modifiedAt: TODAY + ' 11:52',
    cmsUrl: 'https://news.66wz.com/system/2026/09/08/105837365.shtml',
    simulated: true,
    excerpt: '本周末，S1线惠民路站"轨道+美食"惠民市集将开市，市民凭S1/S2线车票在大排档等点位消费可享满减优惠，人文寻根线可前往五马街历史文化街区、朱自清旧居。',
    lifecycle: 'reviewed',
    fastLane: fastLane('11:48'),
    anchors: [
      { entityId: 'WZ-TRANS-00000864', entityName: '温州市域铁路（S线网络）', matchMethod: '标准名 + 线路关键词', confidence: 0.95, para: 1, start: 4, end: 10, quote: 'S1线惠民路站', state: 'confirmed' },
    ],
    claims: [
      {
        claimId: 'cl-20260908-0365-1', entityId: 'WZ-TRANS-00000864',
        predicate: 'rail_plus_consumption（轨道+消费场景）', value: '凭S1/S2线车票享满减（惠民市集本周末开市）',
        claimType: 'planned', evidenceText: '文章第1段：与既有事实 WZ-F-00864-05（轨道+消费联动）口径一致',
        confidence: 0.94, status: 'accepted', changeId: 'chg-20260908-004',
      },
    ],
    reviewSummary: 'Claim 与既有事实一致 → No Change，无需人工介入，不产生新版本',
  },

  // ============ 今日 · 仅 Fast Lane 案例 ============
  {
    contentId: '20260908-0368',
    title: '瓯海泽雅高山番薯迎来丰收季 村民增收有盼头',
    source: '温州新闻网',
    publishedAt: TODAY + ' 12:10',
    publishedAtSec: '12:10:00',
    modifiedAt: TODAY + ' 12:15',
    cmsUrl: 'https://news.66wz.com/system/2026/09/08/105837368.shtml',
    simulated: true,
    excerpt: '金秋时节，瓯海区泽雅镇的高山番薯陆续采挖上市，今年品质好于往年，村民收入有望稳步增长。',
    lifecycle: 'distributed',
    fastLane: fastLane('12:10'),
    anchors: [
      { entityId: null, entityName: '泽雅风景名胜区（未建档）', matchMethod: '地名候选 · 与受控实体匹配度过低', confidence: 0.38, para: 1, start: 4, end: 6, quote: '泽雅', state: 'rejected', note: '低于锚定阈值 0.60，新闻不进入 Fact Lane' },
    ],
    claims: [],
    reviewSummary: '无受控实体锚定 → 本条仅走 Fast Lane（发布即分发），不产生 Claim',
  },

  // ============ 历史 · 真实档案（新闻本体真实，遥测为回放） ============
  {
    contentId: '105697993',
    title: '温州全市已实施新改扩建中小学项目92个',
    source: '温州新闻网',
    publishedAt: '2025-08-29 08:31',
    publishedAtSec: '08:31:00',
    modifiedAt: '2025-08-29 08:31',
    cmsUrl: 'https://www.66wz.com/system/2025/08/29/105697993.shtml',
    simulated: false,
    excerpt: '截至目前，全市已实施中小学新改扩建项目92个，其中34个项目顺利完工，包括整校新建项目10个，一批现代化、高品质新校园正陆续投用。',
    lifecycle: 'fact_updated',
    fastLane: fastLane('08:31'),
    telemetryReplay: true,
    anchors: [
      { entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程', matchMethod: '标准名 + 数值口径', confidence: 0.96, para: 1, start: 28, end: 114, quote: '全市已实施中小学新改扩建项目92个，其中34个项目顺利完工', state: 'confirmed' },
    ],
    claims: [
      {
        claimId: 'cl-20250829-101', entityId: 'WZ-SCHOOL-00001782',
        predicate: 'annual_projects_progress（年度进度）', value: '92个实施 / 34个完工（2025年度）',
        claimType: 'statistics', evidenceText: '文章第1段（原文引用，物理锚点见事实页 E1）',
        confidence: 0.97, status: 'accepted', changeId: 'chg-20250829-101',
      },
    ],
    reviewSummary: 'Update 已确认 → 事实 WZ-F-01782-01 现行有效',
  },
  {
    contentId: '105738139',
    title: '"一尾鱼"游出19亿元产值，从鱼苗到餐桌的闭环如何炼成',
    source: '温州新闻网',
    publishedAt: '2026-04-21 09:05',
    publishedAtSec: '09:05:00',
    modifiedAt: '2026-04-21 09:05',
    cmsUrl: 'https://www.66wz.com/system/2026/04/21/105738139.shtml',
    simulated: false,
    excerpt: '2025年，温州交出的成绩单是：产量2.2万吨；2025年仅鹿西一地大黄鱼产量就达2780吨。',
    lifecycle: 'fact_updated',
    fastLane: fastLane('09:05'),
    telemetryReplay: true,
    anchors: [
      { entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼', matchMethod: '标准名 + 数值口径', confidence: 0.97, para: 1, start: 23, end: 46, quote: '2025年，温州交出的成绩单是：产量2.2万吨', state: 'confirmed' },
    ],
    claims: [
      {
        claimId: 'cl-20260421-102', entityId: 'WZ-GOOD-00000512',
        predicate: 'aquaculture_output（养殖产量·年度）', value: '2.2万吨（2025年度）',
        claimType: 'statistics', evidenceText: '文章第1段（原文引用，物理锚点 [23,46)）',
        confidence: 0.98, status: 'accepted', changeId: 'chg-20260421-102',
      },
    ],
    reviewSummary: 'Update 已确认 → 替代 2022 年度 17318 吨旧口径（WZ-F-00512-02 → superseded）',
  },
  {
    contentId: '105743242',
    title: '张振丰专题研究文旅区域联动发展和大黄鱼产业高质量发展',
    source: '温州新闻网',
    publishedAt: '2026-05-08 18:22',
    publishedAtSec: '18:22:00',
    modifiedAt: '2026-05-08 18:22',
    cmsUrl: 'https://www.66wz.com/system/2026/05/08/105743242.shtml',
    simulated: false,
    excerpt: '强调以农文旅融合推动产业升级，打造"温州大黄鱼"品牌，推进标准化、品牌化和国际化路径。',
    lifecycle: 'fact_updated',
    fastLane: fastLane('18:22'),
    telemetryReplay: true,
    anchors: [
      { entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼', matchMethod: '标准名 + 会议主题', confidence: 0.93, para: 1, start: 0, end: 24, quote: '专题研究……大黄鱼产业高质量发展', state: 'confirmed' },
    ],
    claims: [
      {
        claimId: 'cl-20260508-103', entityId: 'WZ-GOOD-00000512',
        predicate: 'city_industry_deployment（市级产业部署）', value: '市级专题推进大黄鱼产业高质量发展（2026-05）',
        claimType: 'observed_fact', evidenceText: '文章标题与首段（标题/摘要级 → 经审核按"当前状态"口径建档）',
        confidence: 0.88, status: 'accepted', changeId: 'chg-20260508-103',
      },
    ],
    reviewSummary: 'New Fact 已确认 → 事实 WZ-F-00512-08 现行有效',
  },
];

// ---- Fact Change 记录 ----
const CHANGES = [
  {
    changeId: 'chg-20260908-001', contentId: '20260908-0347',
    entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼',
    predicate: 'industry_output_value（产业产值·年度）',
    changeType: 'update', risk: 'L2', domain: '产业经济',
    currentValue: { factId: 'WZ-F-00512-03', value: '产值突破15亿元（2022年度口径）', status: 'uncertain' },
    proposedValue: { factId: 'WZ-F-00512-09', value: '19.2亿元（2025年度·全产业链口径）', status: 'active' },
    systemJudgement: 'Update：新证据为正文级统计口径（年份更新），且可解决既有 uncertain 状态（6-11 视频标题"19亿"线索获正文确认）',
    suggestion: '旧版本 WZ-F-00512-03 → superseded（保留备查）；新版本 WZ-F-00512-09 → active',
    reviewStatus: 'approved', reviewedAt: TODAY + ' 13:18', reviewer: '领域编辑 · 产业经济组',
    changedAt: TODAY + ' 13:18:22',
    reason: '新新闻提供更新证据（2025年度口径），替代 2022 年度旧口径',
  },
  {
    changeId: 'chg-20260908-002', contentId: '20260908-0361',
    entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程',
    predicate: 'construction_started_on（开工日期）',
    changeType: 'new', risk: 'L2', domain: '公共服务（教育）',
    currentValue: null,
    proposedValue: { factId: '（待分配）', value: '滨江校区项目于 2026-09-08 开工', status: 'active（待确认）' },
    systemJudgement: 'New Fact：该谓词下无既有事实；claim_type = observed_fact（正文记述开工仪式已发生）',
    suggestion: '确认后新增事实（active）；同步记录关联候选实体"滨江校区（未建档）"进入建档评估',
    reviewStatus: 'pending', reviewedAt: null, reviewer: null,
    changedAt: TODAY + ' 13:14:40',
    reason: '新检测到的已发生事件，当前事实库无对应记录',
  },
  {
    changeId: 'chg-20260908-003', contentId: '20260908-0361',
    entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程',
    predicate: 'planned_completion_year（计划建成年份）',
    changeType: 'new', risk: 'L2', domain: '公共服务（教育）',
    currentValue: null,
    proposedValue: { factId: '（待分配）', value: '预计 2028 年秋季建成投用（计划口径）', status: 'active（计划·待确认）' },
    systemJudgement: 'New Fact：claim_type = planned（"预计"），必须与已发生事实分开建条，不得伪装为已发生',
    suggestion: '确认后按"计划"类型新增（active），TTL 按工程计划周期 90 天',
    reviewStatus: 'pending', reviewedAt: null, reviewer: null,
    changedAt: TODAY + ' 13:14:41',
    reason: '计划口径新主张，与已发生事实分开管理',
  },
  {
    changeId: 'chg-20260908-005', contentId: '20260908-0361',
    entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程',
    predicate: 'project_total_investment（项目总投资）',
    changeType: 'new', risk: 'L2', domain: '公共服务（教育）',
    currentValue: null,
    proposedValue: { factId: '（待分配）', value: '滨江校区总投资约 4.2 亿元（概算口径）', status: 'active（计划·待确认）' },
    systemJudgement: 'New Fact：claim_type = planned（"约"为概算口径）',
    suggestion: '确认后按"计划"类型新增；若后续批复概算发布则走 Update',
    reviewStatus: 'pending', reviewedAt: null, reviewer: null,
    changedAt: TODAY + ' 13:14:42',
    reason: '计划/概算口径新主张',
  },
  {
    changeId: 'chg-20260908-004', contentId: '20260908-0365',
    entityId: 'WZ-TRANS-00000864', entityName: '温州市域铁路（S线网络）',
    predicate: 'rail_plus_consumption（轨道+消费场景）',
    changeType: 'no_change', risk: 'L1', domain: '交通',
    currentValue: { factId: 'WZ-F-00864-05', value: '凭S1/S2线车票享满减等消费联动（2026-03 起）', status: 'active' },
    proposedValue: null,
    systemJudgement: 'No Change：新 Claim 与既有事实口径一致，仅时间范围延长',
    suggestion: '无需动作；既有事实 lastVerifiedAt 自动刷新',
    reviewStatus: 'approved', reviewedAt: TODAY + ' 12:02', reviewer: '系统自动（L1）',
    changedAt: TODAY + ' 12:02:10',
    reason: '新证据与既有事实一致，确认其仍然有效',
  },
  {
    changeId: 'chg-20260908-006', contentId: '20260908-0347',
    entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼',
    predicate: 'aquaculture_output_2025（养殖产量·2025）',
    changeType: 'no_change', risk: 'L1', domain: '产业经济',
    currentValue: { factId: 'WZ-F-00512-01', value: '2025年温州大黄鱼养殖产量 2.2万吨', status: 'active' },
    proposedValue: null,
    systemJudgement: 'No Change：数值与现行事实一致，多源一致性 +1',
    suggestion: '无需动作；多源一致性计数 +1，事实新鲜度提升',
    reviewStatus: 'approved', reviewedAt: TODAY + ' 13:17', reviewer: '系统自动（L1）',
    changedAt: TODAY + ' 13:17:58',
    reason: '独立第二来源确认现行事实',
  },
  // ---- 历史（真实档案触发，已闭环） ----
  {
    changeId: 'chg-20250829-101', contentId: '105697993',
    entityId: 'WZ-SCHOOL-00001782', entityName: '温州市中小学校新建改扩建工程',
    predicate: 'annual_projects_progress（年度进度）',
    changeType: 'update', risk: 'L2', domain: '公共服务（教育）',
    currentValue: { factId: '（历史版本）', value: '2024 年度口径（已归档）', status: 'superseded' },
    proposedValue: { factId: 'WZ-F-01782-01', value: '92个实施 / 34个完工（2025年度）', status: 'active' },
    systemJudgement: 'Update：年度统计口径滚动更新',
    suggestion: '旧年度口径归档；新口径 active，TTL 至 2026-10-08',
    reviewStatus: 'approved', reviewedAt: '2025-08-29 14:05', reviewer: '领域编辑 · 公共服务组',
    changedAt: '2025-08-29 14:05:30',
    reason: '年度进度数据更新',
  },
  {
    changeId: 'chg-20260421-102', contentId: '105738139',
    entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼',
    predicate: 'aquaculture_output（养殖产量·年度）',
    changeType: 'update', risk: 'L1', domain: '产业经济',
    currentValue: { factId: 'WZ-F-00512-02', value: '17318吨（2022年度）', status: 'superseded' },
    proposedValue: { factId: 'WZ-F-00512-01', value: '2.2万吨（2025年度）', status: 'active' },
    systemJudgement: 'Update：新统计年度发布，替代旧年度值（旧值为不同年份统计，非错误）',
    suggestion: 'WZ-F-00512-02 → superseded 保留；WZ-F-00512-01 → active',
    reviewStatus: 'approved', reviewedAt: '2026-04-21 09:40', reviewer: '系统自动（L1·权威统计口径）',
    changedAt: '2026-04-21 09:40:12',
    reason: '新统计年度数据发布',
  },
  {
    changeId: 'chg-20260508-103', contentId: '105743242',
    entityId: 'WZ-GOOD-00000512', entityName: '温州大黄鱼',
    predicate: 'city_industry_deployment（市级产业部署）',
    changeType: 'new', risk: 'L2', domain: '产业经济',
    currentValue: null,
    proposedValue: { factId: 'WZ-F-00512-08', value: '市级专题推进大黄鱼产业高质量发展（2026-05）', status: 'active' },
    systemJudgement: 'New Fact：市级部署类事实首次出现',
    suggestion: '新增"当前状态"类事实，TTL 180 天',
    reviewStatus: 'approved', reviewedAt: '2026-05-08 15:12', reviewer: '领域编辑 · 产业经济组',
    changedAt: '2026-05-08 15:12:00',
    reason: '市级部署新主张',
  },
];

// ---- AI Citation Observatory ----
const OBSERVATORY = {
  demoNote: '本页全部监测数据为演示模拟（Demo Simulation），用于展示真实系统的数据结构与产品形态；接入真实探测管线后按同结构回填。',
  kpis: {
    discoveryLag: { label: 'Discovery Lag', value: '4h40m', sub: '新闻发布 → 搜索首次发现（近7日中位数，n=4）' },
    aiFreshnessLag: { label: 'AI Freshness Lag', value: '20h02m', sub: '事实更新 → AI 首次正确采用（最近一次完整追踪）' },
    citationRate: { label: 'Citation Rate', value: '16%', sub: '固定问题集 50 题中引用我方内容 8 题 · 较上期 +3pp' },
  },
  lastCitation: { at: '2026-09-05 16:42', model: '元宝', question: '南塘风貌街是温州的美食街吗', citedUrl: '/fact/WZ-PLACE-00000322/' },
  tracking: [
    {
      eventTitle: '2025年温州大黄鱼全产业链产值达19.2亿元',
      contentId: '20260908-0347', entityId: 'WZ-GOOD-00000512',
      simulated: true,
      milestones: [
        { label: '新闻发布', at: TODAY + ' 10:32', state: 'done' },
        { label: 'Fast Lane 推送（IndexNow + 百度）', at: TODAY + ' 10:32:05', state: 'done' },
        { label: 'Search 首次发现', at: TODAY + ' 15:12（预计）', state: 'tracking' },
        { label: 'DeepSeek 首次答对新口径', at: '待测 · 下次探测 09-09 09:20', state: 'planned' },
        { label: 'DeepSeek 首次引用 66wz 事实页', at: '待测', state: 'planned' },
        { label: '豆包开始采用新口径', at: '待测', state: 'planned' },
      ],
    },
    {
      eventTitle: '温州市实验中学教育集团滨江校区工程今日正式开工',
      contentId: '20260908-0361', entityId: 'WZ-SCHOOL-00001782',
      simulated: true,
      milestones: [
        { label: '新闻发布', at: TODAY + ' 13:05', state: 'done' },
        { label: 'Fast Lane 推送', at: TODAY + ' 13:05:16', state: 'done' },
        { label: 'Search 首次发现', at: '追踪中（预计明日）', state: 'tracking' },
        { label: 'AI 采用', at: '待 Fact 更新后开始追踪', state: 'planned' },
      ],
    },
    {
      eventTitle: '温州全市已实施新改扩建中小学项目92个（完整闭环回放）',
      contentId: '105697993', entityId: 'WZ-SCHOOL-00001782',
      simulated: true, backfill: true,
      milestones: [
        { label: '新闻发布', at: '2025-08-29 08:31', state: 'done' },
        { label: 'Fast Lane 推送', at: '2025-08-29 08:31:12', state: 'done' },
        { label: '百度首次收录', at: '2025-08-30 07:52', state: 'done' },
        { label: '元宝首次引用事实页（92项目口径）', at: '2025-09-02 14:20', state: 'done' },
        { label: 'AI Freshness Lag 实测', at: '4 天 5 小时（当年无 IndexNow，现管道预期压缩至小时级）', state: 'done' },
      ],
    },
  ],
  questionSet: [
    { q: '温州大黄鱼2025年全产业链产值是多少？', expect: '19.2亿元（今日新口径）', models: { DeepSeek: '待测 09-09', 豆包: '待测', 元宝: '待测', 千问: '待测' }, state: 'tracking' },
    { q: '温州大黄鱼2025年养殖产量？', expect: '2.2万吨', models: { DeepSeek: '引用事实页', 豆包: '引用事实页', 元宝: '引用事实页', 千问: '未引用' }, state: 'cited' },
    { q: '温州S1线现在运营吗？', expect: '运营中（S1/S2 双线）', models: { DeepSeek: '引用事实页', 豆包: '引用其他', 元宝: '引用事实页', 千问: '引用事实页' }, state: 'cited' },
    { q: '温州园博园开园了吗？', expect: '已开园运行（具体开园日待公告核验）', models: { DeepSeek: '引用事实页', 豆包: '未引用', 元宝: '引用新闻', 千问: '未引用' }, state: 'cited' },
    { q: '五马街是什么街区？', expect: '温州历史文化街区·首批省旅游休闲街区', models: { DeepSeek: '引用事实页', 豆包: '引用事实页', 元宝: '引用事实页', 千问: '引用其他' }, state: 'cited' },
    { q: '滨江CBD有哪些总部大楼在建？', expect: '正泰/民商银行/华峰/青山/万洋 5 栋', models: { DeepSeek: '未引用', 豆包: '未引用', 元宝: '引用事实页', 千问: '未引用' }, state: 'partial' },
  ],
};

const REVIEW_ACTIONS = ['确认', '修改', '拒绝', '标记冲突', '需要更多证据'];

module.exports = {
  TODAY, NEWS_EVENTS, CHANGES, OBSERVATORY,
  NEWS_LIFECYCLE, CHANGE_TYPES, CHANGE_TYPES_SHORT, REVIEW_STATUS, CLAIM_TYPES, CLAIM_STATUS, ANCHOR_STATE, REVIEW_ACTIONS,
};
