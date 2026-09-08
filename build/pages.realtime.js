// ============================================================
// 实时链路页面渲染器：News Event / Review Workbench / Observatory
// 由 render.js 注入共享上下文 ctx（DEPLOY/esc/chip/实体索引等）
// ============================================================

const RT_CSS = `
.pipeline{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin-top:16px}
.pipeline .pl-title{font-size:13px;color:var(--sub);margin-bottom:8px}
.lane{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.lane .lane-name{flex:0 0 84px;font-size:12px;font-weight:700;padding:2px 0}
.lane-fast .lane-name{color:#0b5cab}
.lane-fact .lane-name{color:#22764a}
.lanestep{font-size:12px;background:#f2f6fb;border:1px solid #d8e4f2;border-radius:4px;padding:2px 8px;color:#27425f}
.lanestep.ok{background:#e7f4ec;border-color:#bfe0cc;color:#22764a}
.lanestep.warn{background:#fdf5e6;border-color:#eedcb8;color:#8a5a00}
.lanesep{color:#b9c5d2;font-size:12px;align-self:center}
.newsrow2{background:#fff;border:1px solid var(--line);border-radius:8px;padding:13px 16px;margin-bottom:11px}
.newsrow2 .nr-top{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}
.newsrow2 .nr-time{font-family:Consolas,Menlo,monospace;font-size:13px;color:var(--blue-dk);font-weight:700}
.newsrow2 .nr-title{font-size:15px;font-weight:600}
.newsrow2 .nr-title a{color:var(--ink)}
.newsrow2 .nr-title a:hover{color:var(--blue)}
.newsrow2 .nr-meta{font-size:12px;color:var(--sub);margin-top:5px;display:flex;flex-wrap:wrap;gap:5px 14px}
.newsrow2 .nr-meta code{font-family:Consolas,Menlo,monospace;font-size:11.5px}
.chg{display:inline-block;font-size:12px;border-radius:3px;padding:1px 8px;border:1px solid transparent;margin-right:6px}
.chg-new{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.chg-update{color:var(--blue);background:#eaf2fb;border-color:#cfe0f2}
.chg-supersede,.chg-expire,.chg-no_change{color:var(--gray);background:var(--gray-bg);border-color:#d5dbe3}
.chg-conflict{color:var(--red);background:#fdecec;border-color:#f3cccc}
.rev-pending{color:var(--amber);background:var(--amber-bg);border-color:#eedcb8}
.rev-approved{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.rev-modified{color:var(--blue);background:#eaf2fb;border-color:#cfe0f2}
.rev-rejected{color:var(--red);background:#fdecec;border-color:#f3cccc}
.rev-disputed{color:#8a5a00;background:#fff7e6;border-color:#f0dcae}
.simbadge{display:inline-block;font-size:11.5px;color:#8a5a00;background:#fff7e6;border:1px dashed #e3c687;border-radius:3px;padding:1px 8px;margin-left:8px}
.realbadge{display:inline-block;font-size:11.5px;color:var(--green);background:var(--green-bg);border:1px solid #bfe0cc;border-radius:3px;padding:1px 8px;margin-left:8px}
.claim-planned{color:#8a5a00;background:#fff7e6;border-color:#f0dcae}
.claim-observed{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.claim-stat{color:var(--blue);background:#eaf2fb;border-color:#cfe0f2}
.anchor-state-confirmed{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.anchor-state-candidate{color:var(--amber);background:var(--amber-bg);border-color:#eedcb8}
.anchor-state-rejected{color:var(--red);background:#fdecec;border-color:#f3cccc}
.fasttable{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 4px}
.fasttable td{border:1px solid var(--line);padding:7px 11px}
.fasttable td:first-child{font-weight:600;white-space:nowrap}
.fasttable .ft{font-family:Consolas,Menlo,monospace;color:var(--blue-dk);white-space:nowrap;width:110px}
.fastok{color:var(--green);font-weight:600;white-space:nowrap}
.fastfail{color:var(--red);font-weight:600;white-space:nowrap}
.anchorcard{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin-bottom:12px}
.anchorcard .conf{font-family:Consolas,Menlo,monospace;font-weight:700}
.quoteanchor{font-family:Consolas,Menlo,monospace;font-size:12.5px;background:#f8fafc;border:1px dashed #cfd8e2;border-radius:5px;padding:7px 11px;margin-top:7px;color:#2a3542}
.claimcard{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin-bottom:12px}
.claimcard .cpred{font-family:Consolas,Menlo,monospace;font-weight:700;font-size:13.5px;color:var(--blue-dk)}
.claimcard .cval{margin-top:4px}
.changebox{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:14px}
.changebox .cb-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.cb-cell{background:#f8fafc;border:1px solid var(--line);border-radius:6px;padding:10px 13px;font-size:13.5px}
.cb-cell .k{font-size:11.5px;color:var(--sub);margin-bottom:4px}
.oldval{color:#8a4b08;text-decoration:line-through;text-decoration-color:#d8b27a}
.newval{color:var(--green);font-weight:600}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:14px 0 6px}
.kpi{background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px 18px}
.kpi .kv{font-size:30px;font-weight:800;color:var(--blue-dk);font-family:Consolas,Menlo,monospace}
.kpi .kl{font-size:13px;font-weight:700;margin-top:2px}
.kpi .ks{font-size:12px;color:var(--sub);margin-top:4px}
.review3{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:13px;margin:14px 0}
.review3 .rcol{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px}
.review3 .rcol h3{font-size:14px;margin-bottom:9px;padding-bottom:7px;border-bottom:1px dashed var(--line)}
.rcol-context .factmini{border-left:3px solid #cfd8e2;padding:6px 10px;margin-bottom:9px;font-size:13px;background:#fafbfc;border-radius:0 5px 5px 0}
.rbtns{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0 8px}
.rbtn{font-size:14px;padding:8px 20px;border-radius:5px;border:1px solid var(--blue);background:#fff;color:var(--blue);cursor:pointer}
.rbtn:hover{background:#eaf2fb}
.rbtn.active{background:var(--blue);color:#fff}
.rresult{font-size:13.5px;background:var(--green-bg);border:1px solid #bfe0cc;border-radius:6px;padding:10px 14px;color:#1f5c3a}
.trackmile{display:flex;gap:10px;align-items:baseline;padding:5px 0;border-bottom:1px dashed #eef1f5;font-size:13.5px}
.trackmile .tm-at{font-family:Consolas,Menlo,monospace;color:var(--sub);white-space:nowrap;font-size:12.5px;min-width:170px}
.track-done{color:var(--green);font-weight:700}
.track-tracking{color:#8a5a00;font-weight:700}
.track-planned{color:var(--sub)}
.qtable{width:100%;border-collapse:collapse;font-size:13px;background:#fff}
.qtable th,.qtable td{border:1px solid var(--line);padding:8px 11px;text-align:left}
.qtable th{background:#f2f6fb}
.cite-yes{color:var(--green);font-weight:600}
.cite-no{color:var(--sub)}
.cite-track{color:#8a5a00;font-weight:600}
@media (max-width:900px){.review3{grid-template-columns:1fr}.cb-grid{grid-template-columns:1fr}}
`;

function navHtml(ctx) {
  const { DEPLOY } = ctx;
  return `<nav><a href="${DEPLOY}/#news">实时新闻</a><a href="${DEPLOY}/#catalog">事实目录</a><a href="${DEPLOY}/review/">审核工作台</a><a href="${DEPLOY}/observatory/">AI 引用监测</a><a href="${DEPLOY}/#machine">API · Feed</a></nav>`;
}

function pageShell(ctx, { title, description, crumbs, body, jsonLdObj, extraHead }) {
  const { esc, DEMO, demoBanner, CSS, jsonLd } = ctx;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | 温州在线 · 城市实时可信内容分发系统</title>
<meta name="description" content="${esc(description || title)}">
<meta name="robots" content="index,follow,max-snippet:-1">
${extraHead || ''}
<style>${CSS}${RT_CSS}</style>
${jsonLdObj ? `<script type="application/ld+json">${jsonLd(jsonLdObj)}</script>` : ''}
</head>
<body>
<header class="site">
  <div class="wrap">
    <div class="bar">
      <div class="brand"><span class="logo">温州在线 · <b>城市事实</b></span><span class="sub">City Real-time Trusted Content Distribution</span></div>
      ${navHtml(ctx)}
    </div>
    <div class="crumbs">${crumbs}</div>
  </div>
</header>
${DEMO ? demoBanner() : ''}
<div class="wrap">
${body}
</div>
${footerHtml(ctx)}
</body>
</html>`;
}

function footerHtml(ctx) {
  const { ENGINE, DEPLOY, esc } = ctx;
  return `<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div><h4>${esc(ENGINE.name)}</h4>${esc(ENGINE.version)}<br>生成时间：${ENGINE.generatedAt}<br>发布域：${DEPLOY}/</div>
      <div><h4>双链路分工</h4>News = Event：本系统新闻页回答"刚刚发生了什么"；<br>Fact = State：事实页回答"现在是什么状态"。<br>新闻不承担长期状态管理，事实页不重写新闻。</div>
      <div><h4>版权</h4>内容版权归 ${esc(ENGINE.org)}；<br>演示数据中标注 Demo Simulation 的内容为模拟。</div>
    </div>
  </div>
</footer>`;
}

// ---------------- News Event 页 ----------------
function renderNewsEvent(ctx, news) {
  const { esc, chip, DEPLOY, RT, byId } = ctx;
  const { NEWS_LIFECYCLE, CHANGE_TYPES_SHORT, REVIEW_STATUS, CLAIM_TYPES, CLAIM_STATUS, ANCHOR_STATE, CHANGE_TYPES } = RT;
  const changes = RT.CHANGES.filter(c => c.contentId === news.contentId);
  const laneFastOk = news.fastLane.filter(s => s.status === 'success').length;

  const infoGrid = `
  <div class="metagrid">
    <div class="cell"><div class="k">发布时间</div><div class="v">${esc(news.publishedAt)}（${esc(news.publishedAtSec)}）</div></div>
    <div class="cell"><div class="k">修改时间</div><div class="v">${esc(news.modifiedAt)}</div></div>
    <div class="cell"><div class="k">来源</div><div class="v">${esc(news.source)}</div></div>
    <div class="cell"><div class="k">CMS Content ID</div><div class="v" style="font-family:Consolas,Menlo,monospace">${esc(news.contentId)}</div></div>
    <div class="cell"><div class="k">新闻 URL（CMS 原文）</div><div class="v" style="word-break:break-all"><a href="${esc(news.cmsUrl)}" target="_blank" rel="noopener">${esc(news.cmsUrl)}</a></div></div>
    <div class="cell"><div class="k">机器出口</div><div class="v"><a href="${DEPLOY}/news/${esc(news.contentId)}.json">News Event JSON ↗</a></div></div>
  </div>`;

  const fastRows = news.fastLane.map(s => `
    <tr><td>${esc(s.step)}</td><td class="ft">${esc(s.time)}</td><td class="${s.status === 'success' ? 'fastok' : 'fastfail'}">${s.status === 'success' ? '✓ 成功' : '✗ 失败→重试成功'}</td><td>${esc(s.result)}</td></tr>`).join('');

  const anchorCards = news.anchors.map(a => `
    <div class="anchorcard">
      <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
        <b style="font-size:14.5px">${esc(a.entityName)}</b>
        ${a.entityId ? `<a class="entity-id" href="${DEPLOY}/${a.entityId}/">${a.entityId}</a>` : '<span class="chip prec">未建档</span>'}
        <span class="chip anchor-state-${a.state}">${ANCHOR_STATE[a.state]}</span>
      </div>
      <div style="font-size:13px;color:var(--sub);margin-top:6px">匹配方式：${esc(a.matchMethod)} · 置信度 <span class="conf">${a.confidence.toFixed(2)}</span>${a.note ? ' · ' + esc(a.note) : ''}</div>
      <div class="quoteanchor">原文锚点：第 ${a.para} 段 · [start: ${a.start}, end: ${a.end}) · "${esc(a.quote)}"</div>
    </div>`).join('\n');

  const claimCards = news.claims.length ? news.claims.map(c => {
    const cls = c.claimType === 'planned' ? 'claim-planned' : (c.claimType === 'statistics' ? 'claim-stat' : 'claim-observed');
    const typeLabel = CLAIM_TYPES[c.claimType] || c.claimType;
    return `
    <div class="claimcard" id="claim-${c.claimId}">
      <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
        <span class="cpred">${esc(c.predicate)}</span>
        <span class="chip ${cls}">${esc(typeLabel)}</span>
        <span class="chip prec">${CLAIM_STATUS[c.status]}</span>
      </div>
      <div class="cval">Subject Entity：<a href="${DEPLOY}/${c.entityId}/">${c.entityId}</a>（${esc(byId.get(c.entityId) ? byId.get(c.entityId).standardName : '')}）</div>
      <div class="cval">Value：<b>${esc(c.value)}</b></div>
      <div style="font-size:12.5px;color:var(--sub);margin-top:5px">Evidence：${esc(c.evidenceText)} · 置信度 ${c.confidence.toFixed(2)}</div>
      ${c.changeId ? `<div style="font-size:13px;margin-top:7px">Fact Change：<a href="${DEPLOY}/review/${c.changeId}/">${c.changeId}</a></div>` : ''}
    </div>`;
  }).join('\n') : '<p class="secdesc">本条新闻无受控实体锚定，未生成 Claim（仅走 Fast Lane）。</p>';

  const changeBoxes = changes.map(c => {
    const cls = 'chg-' + c.changeType;
    return `
    <div class="changebox" id="chg-${c.changeId}">
      <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
        <a class="entity-id" href="${DEPLOY}/review/${c.changeId}/">${c.changeId}</a>
        <span class="chip ${cls}">${CHANGE_TYPES[c.changeType]}</span>
        <span class="chip rev-${c.reviewStatus}">${REVIEW_STATUS[c.reviewStatus]}</span>
        <span style="font-size:12.5px;color:var(--sub)">${esc(c.changedAt)}</span>
      </div>
      <div style="margin-top:8px;font-size:14px"><b>${esc(c.predicate)}</b></div>
      ${c.changeType === 'no_change' ? `
        <div class="cb-grid"><div class="cb-cell"><div class="k">现行 Fact（保持不变）</div>${esc(c.currentValue ? c.currentValue.value : '')} <span class="chip st-active">active</span><br><a href="${DEPLOY}/${c.entityId}/#fact-${c.currentValue ? c.currentValue.factId : ''}" style="font-size:12.5px">${c.currentValue ? c.currentValue.factId : ''}</a></div>
        <div class="cb-cell"><div class="k">系统判断</div>${esc(c.systemJudgement)}</div></div>` : `
        <div class="cb-grid">
          <div class="cb-cell"><div class="k">当前 Fact（旧）</div>${c.currentValue ? `<span class="oldval">${esc(c.currentValue.value)}</span><br><span class="chip">${c.currentValue.status}</span> <a href="#fact-${esc(c.currentValue.factId)}" style="font-size:12.5px">${esc(c.currentValue.factId)}</a>` : '<i>无既有事实（将新增）</i>'}</div>
          <div class="cb-cell"><div class="k">新 Claim（候选新值）</div><span class="newval">${esc(c.proposedValue.value)}</span><br><span class="chip">${esc(c.proposedValue.status)}</span></div>
        </div>
        <div style="margin-top:9px;font-size:13.5px"><b>系统判断：</b>${esc(c.systemJudgement)}</div>
        <div style="margin-top:5px;font-size:13.5px"><b>建议：</b>${esc(c.suggestion)}</div>`}
    </div>`;
  }).join('\n') || '<p class="secdesc">本条新闻未产生 Fact Change。</p>';

  const laneChips = ['published', 'distributed', 'entity_anchored', 'claims_extracted', 'fact_change_detected', 'reviewed', 'fact_updated'];
  const noFact = news.anchors.every(a => !a.entityId);
  const reached = noFact ? ['published', 'distributed'] : (news.lifecycle === 'fact_updated' ? laneChips : laneChips.slice(0, laneChips.indexOf(news.lifecycle) + 1));
  const laneStrip = laneChips.map(s => {
    const done = reached.includes(s);
    const current = reached[reached.length - 1] === s;
    return `<span class="chip ${done ? 'ty' : 'prec'}" style="${current ? 'font-weight:700;border-color:var(--blue)' : ''}">${NEWS_LIFECYCLE[s]}</span>`;
  }).join('<span style="color:#b9c5d2">→</span>');

  const body = `
  <section style="padding-top:22px">
    <h1 class="title" style="font-size:23px">📰 ${esc(news.title)}</h1>
    <div style="margin-top:8px">
      <span class="entity-id">CMS-${esc(news.contentId)}</span>
      ${chip('ty', 'News = Event（刚刚发生了什么）')}
      <span class="chip st-active">处理状态：${NEWS_LIFECYCLE[news.lifecycle]}</span>
      ${news.simulated ? '<span class="simbadge">Demo Simulation · 模拟新闻事件</span>' : '<span class="realbadge">真实档案 · 遥测为系统回放</span>'}
    </div>
    <p class="lede">${esc(news.excerpt)}</p>
    ${infoGrid}
  </section>

  <section id="lifecycle">
    <h2 class="sec">处理生命周期</h2>
    <p class="secdesc" style="margin-bottom:8px">${laneStrip}</p>
  </section>

  <section id="fastlane">
    <h2 class="sec">Fast Lane · 发布即推送</h2>
    <p class="secdesc">发布后秒级完成四路分发，进入搜索引擎与 AI 检索通道。${news.telemetryReplay ? '本事件遥测为系统回放重建。' : '遥测为演示模拟。'}</p>
    <div class="changebox" style="padding:12px 16px">
      <table class="fasttable">
        <tr><th style="width:130px">步骤</th><th style="width:110px">时间</th><th style="width:130px">状态</th><th>返回结果</th></tr>
        ${fastRows}
      </table>
      <div style="font-size:12.5px;color:var(--sub);margin-top:6px">Fast Lane 状态：已推送搜索（${laneFastOk}/${news.fastLane.length} 步成功）</div>
    </div>
  </section>

  <section id="anchors">
    <h2 class="sec">Entity Anchor · 实体锚定</h2>
    <p class="secdesc">新闻不是直接进入 Fact，而是先完成实体锚定；锚定状态分为 confirmed / candidate / rejected。</p>
    ${anchorCards}
  </section>

  <section id="claims">
    <h2 class="sec">Candidate Claim · 候选主张</h2>
    <p class="secdesc">系统从新闻中自动抽取结构化主张；"计划 / 预计 / 目标"口径强制标注 planned，不得伪装为已发生事实。</p>
    ${claimCards}
  </section>

  <section id="changes">
    <h2 class="sec">Fact Change · 事实变化检测</h2>
    <p class="secdesc">新 Claim 与既有 Canonical Fact 比对，仅允许六种结果：New Fact / Update / Supersede / Expire / Conflict / No Change。</p>
    ${changeBoxes}
  </section>`;

  return pageShell(ctx, {
    title: news.title,
    description: news.excerpt.slice(0, 80),
    crumbs: `${DEPLOY.replace('https://', '')} / <a href="${DEPLOY}/">fact</a> / news / <b>CMS-${esc(news.contentId)}</b>`,
    body,
    jsonLdObj: {
      '@context': 'https://schema.org', '@type': 'NewsArticle',
      headline: news.title, datePublished: news.publishedAt.replace(' ', 'T') + ':00+08:00',
      dateModified: news.modifiedAt.replace(' ', 'T') + ':00+08:00',
      author: { '@type': 'NewsMediaOrganization', name: news.source },
      inLanguage: 'zh-CN', sdDatePublished: ctx.VERIFY_DATE,
    },
  });
}

// ---------------- Review Workbench 首页 ----------------
function renderReviewIndex(ctx) {
  const { esc, DEPLOY, RT, stats } = ctx;
  const { CHANGE_TYPES, REVIEW_STATUS } = RT;
  const pending = RT.CHANGES.filter(c => c.reviewStatus === 'pending');
  const todayDone = RT.CHANGES.filter(c => c.reviewStatus !== 'pending' && c.changedAt.startsWith(ctx.VERIFY_DATE));
  const history = RT.CHANGES.filter(c => c.reviewStatus !== 'pending' && !c.changedAt.startsWith(ctx.VERIFY_DATE));

  const row = c => `
    <div class="newsrow2">
      <div class="nr-top">
        <span class="nr-time">${esc(c.changedAt)}</span>
        <a class="entity-id" href="${DEPLOY}/review/${c.changeId}/">${c.changeId}</a>
        <span class="chg chg-${c.changeType}">${CHANGE_TYPES[c.changeType]}</span>
        <span class="chip rev-${c.reviewStatus}">${REVIEW_STATUS[c.reviewStatus]}</span>
      </div>
      <div style="font-size:14px;margin-top:6px"><b>${esc(c.entityName)}</b> · ${esc(c.predicate)}</div>
      <div class="nr-meta">
        ${c.currentValue ? `<span>现行：<span class="oldval">${esc(c.currentValue.value)}</span></span>` : '<span>现行：无既有事实</span>'}
        ${c.proposedValue ? `<span>候选新值：<span class="newval">${esc(c.proposedValue.value)}</span></span>` : ''}
        <span>风险：${c.risk}</span>
        <a href="${DEPLOY}/review/${c.changeId}/">进入审核 →</a>
      </div>
    </div>`;

  const body = `
  <section style="padding-top:22px">
    <h1 class="title">审核工作台</h1>
    <p class="lede">机器负责发现，领域编辑负责审核。编辑不从零生产事实，只处理系统给出的<b>事实变化建议</b>：确认 / 修改 / 拒绝 / 标记冲突 / 要求补充证据。</p>
    <div class="kpis">
      <div class="kpi"><div class="kv">${stats.todayClaims}</div><div class="kl">今日新增 Claim</div><div class="ks">来自 ${stats.todayNews} 条新闻事件的自动抽取</div></div>
      <div class="kpi"><div class="kv">${pending.length}</div><div class="kl">待审核 Fact Change</div><div class="ks">其中计划口径 ${pending.filter(c => c.predicate.includes('planned') || c.predicate.includes('investment')).length} 项</div></div>
      <div class="kpi"><div class="kv">${stats.conflicts}</div><div class="kl">高风险冲突</div><div class="ks">Conflict 且来源对立，强制 L3 人工</div></div>
      <div class="kpi"><div class="kv">${stats.expiringSoon}</div><div class="kl">即将过期 Fact</div><div class="ks">30 天内到达 reviewAfter 的现行事实</div></div>
      <div class="kpi"><div class="kv">${stats.todayDone}</div><div class="kl">今日已完成审核</div><div class="ks">含系统自动（L1）与人工确认</div></div>
    </div>
  </section>

  <section id="pending">
    <h2 class="sec">待人工确认（${pending.length}）</h2>
    <p class="secdesc">以下 Fact Change 由今日新闻触发，需编辑确认后才会写入 Canonical Fact。</p>
    ${pending.map(row).join('\n') || '<p class="secdesc">暂无待审核事项。</p>'}
  </section>

  <section id="todaydone">
    <h2 class="sec">今日已完成审核（${todayDone.length}）</h2>
    ${todayDone.map(row).join('\n') || '<p class="secdesc">暂无。</p>'}
  </section>

  <section id="history">
    <h2 class="sec">历史审核记录（${history.length}）</h2>
    <p class="secdesc">全部审核操作保留 Audit Log：谁在何时、依据什么证据、批准了什么变化。</p>
    ${history.map(row).join('\n')}
  </section>`;

  return pageShell(ctx, {
    title: '审核工作台',
    description: '机器发现事实变化，编辑确认后自动多渠道重新发布。',
    crumbs: `${DEPLOY.replace('https://', '')} / <a href="${DEPLOY}/">fact</a> / <b>review</b>`,
    body,
  });
}

// ---------------- Review 详情页 ----------------
function renderReviewDetail(ctx, change) {
  const { esc, chip, DEPLOY, RT, byId } = ctx;
  const { CHANGE_TYPES, REVIEW_STATUS, CLAIM_TYPES } = RT;
  const news = RT.NEWS_EVENTS.find(n => n.contentId === change.contentId);
  const claim = news ? news.claims.find(c => c.changeId === change.changeId) : null;
  const ent = byId.get(change.entityId);
  const relatedFacts = ent ? ent.facts.filter(f => f.status === 'active').slice(0, 4) : [];
  const pending = change.reviewStatus === 'pending';
  const cls = 'chg-' + change.changeType;

  const actionMap = {
    '确认': '已确认：建议采纳 —— 新版本置为 active，旧版本转 superseded 保留，自动触发多渠道重新发布（Sitemap lastmod / IndexNow / Feed / changes.json）。',
    '修改': '已转修改：请修订值后重新提交审核（演示流程）。',
    '拒绝': '已拒绝：该 Claim 不进入事实库，拒绝原因写入 Audit Log。',
    '标记冲突': '已标记冲突：转交领域负责人升级处理（L3 强制人工）。',
    '需要更多证据': '已挂起：等待补充证据，系统 24 小时后自动提醒复核。',
  };

  const body = `
  <section style="padding-top:22px">
    <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
      <span class="entity-id">${esc(change.changeId)}</span>
      <span class="chip ${cls}">${CHANGE_TYPES[change.changeType]}</span>
      <span class="chip rev-${change.reviewStatus}">${REVIEW_STATUS[change.reviewStatus]}</span>
      ${chip('risk', change.risk + ' · ' + esc(change.domain))}
      ${news && news.simulated ? '<span class="simbadge">Demo Simulation</span>' : ''}
    </div>
    <h1 class="title" style="font-size:22px;margin-top:10px">${esc(change.predicate)}</h1>
    <p class="lede">实体：<a href="${DEPLOY}/${change.entityId}/">${change.entityId}</a>（${esc(change.entityName)}） · 触发新闻：<a href="${DEPLOY}/news/${esc(change.contentId)}/">《${esc(news ? news.title : '')}》</a></p>
  </section>

  <div class="review3">
    <div class="rcol rcol-context">
      <h3>① 当前 Fact（State）</h3>
      ${change.currentValue ? `
        <div class="factmini"><b>${esc(change.currentValue.value)}</b><br><span class="chip">${esc(change.currentValue.status)}</span> <span style="font-size:12px;color:var(--sub)">${esc(change.currentValue.factId)}</span></div>` :
        '<div class="factmini"><i>该谓词下暂无既有事实 —— 本次为新增（New Fact）。</i></div>'}
      <div style="font-size:12px;color:var(--sub);margin:8px 0 5px">同实体其他现行事实（上下文）：</div>
      ${relatedFacts.map(f => `<div class="factmini">${esc(f.predicate)}：<b>${esc(f.value.length > 40 ? f.value.slice(0, 40) + '…' : f.value)}</b></div>`).join('')}
    </div>
    <div class="rcol">
      <h3>② 新 Claim + Evidence（Event）</h3>
      ${claim ? `
        <div style="font-size:13.5px">
          <div style="margin-bottom:6px">claim_id：<code>${esc(claim.claimId)}</code></div>
          <div style="margin-bottom:6px">Predicate：<code>${esc(claim.predicate)}</code></div>
          <div style="margin-bottom:6px">Value：<b>${esc(claim.value)}</b></div>
          <div style="margin-bottom:6px">Claim Type：<span class="chip ${claim.claimType === 'planned' ? 'claim-planned' : (claim.claimType === 'statistics' ? 'claim-stat' : 'claim-observed')}">${CLAIM_TYPES[claim.claimType]}</span></div>
          <div style="margin-bottom:6px">置信度：${claim.confidence.toFixed(2)} · 状态：${claim.status}</div>
          <div style="margin-bottom:6px">Evidence：${esc(claim.evidenceText)}</div>
          <div>来源新闻：<a href="${DEPLOY}/news/${esc(change.contentId)}/">《${esc(news.title)}》</a></div>
        </div>` : `<div style="font-size:13.5px">${esc(change.reason)}</div>`}
    </div>
    <div class="rcol">
      <h3>③ 系统建议</h3>
      <div style="font-size:13.5px">
        <div style="margin-bottom:8px"><b>判断：</b>${esc(change.systemJudgement)}</div>
        <div class="cb-cell" style="margin-bottom:8px"><div class="k">建议动作</div>${esc(change.suggestion)}</div>
        <div class="cb-cell"><div class="k">变化原因</div>${esc(change.reason)}</div>
      </div>
    </div>
  </div>

  ${pending ? `
  <section>
    <h2 class="sec">编辑操作</h2>
    <div class="rbtns">
      ${ctx.RT.REVIEW_ACTIONS.map(a => `<button class="rbtn" data-act="${a}">${a}</button>`).join('')}
    </div>
    <div id="reviewResult" class="rresult">选择上方操作后，此处显示处理结果（演示环境：仅在本页模拟状态变化，不回写数据集）。</div>
    <script>
    document.querySelectorAll('.rbtn').forEach(function(b){
      b.addEventListener('click',function(){
        document.querySelectorAll('.rbtn').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active');
        var map = ${JSON.stringify(actionMap)};
        document.getElementById('reviewResult').textContent = '操作已记录：' + b.dataset.act + ' —— ' + map[b.dataset.act];
      });
    });
    </script>
  </section>` : `
  <section>
    <h2 class="sec">审核结论（Audit Log）</h2>
    <div class="changebox">
      <div style="font-size:14px"><span class="chip rev-${change.reviewStatus}">${REVIEW_STATUS[change.reviewStatus]}</span> ${esc(change.reviewer)} · ${esc(change.reviewedAt)}</div>
      <div style="font-size:13.5px;margin-top:8px">${esc(change.systemJudgement)}</div>
      <div style="font-size:13.5px;margin-top:5px">${esc(change.suggestion)}</div>
      ${change.entityId === 'WZ-GOOD-00000512' && change.changeType === 'update' ? `<div style="font-size:13.5px;margin-top:8px">已生效事实：<a href="${DEPLOY}/${change.entityId}/#fact-WZ-F-00512-09">WZ-F-00512-09（19.2亿元·active）</a> · 旧版本：<a href="${DEPLOY}/${change.entityId}/#fact-WZ-F-00512-03">WZ-F-00512-03（superseded 保留）</a></div>` : ''}
    </div>
  </section>`}

  <section>
    <div class="machine">
      <b style="color:#fff">提示</b><br>
      确认后的 Fact Change 自动完成：Canonical Fact 写入 → 事实页重新生成 → Sitemap lastmod 更新 → IndexNow 重推 → changes.json / Feed 追加 → Observatory 开始追踪 AI 采用时延。
    </div>
  </section>`;

  return pageShell(ctx, {
    title: '审核 ' + change.changeId,
    description: change.predicate + ' · ' + CHANGE_TYPES[change.changeType],
    crumbs: `${DEPLOY.replace('https://', '')} / <a href="${DEPLOY}/">fact</a> / <a href="${DEPLOY}/review/">review</a> / <b>${esc(change.changeId)}</b>`,
    body,
  });
}

// ---------------- Observatory ----------------
function renderObservatory(ctx) {
  const { esc, DEPLOY, RT } = ctx;
  const k = RT.OBSERVATORY.kpis;
  const kpiCard = (o) => `<div class="kpi"><div class="kv">${esc(o.value)}</div><div class="kl">${esc(o.label)}</div><div class="ks">${esc(o.sub)}</div></div>`;

  const trackCards = RT.OBSERVATORY.tracking.map(t => `
    <div class="changebox">
      <div style="display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
        <b style="font-size:14.5px">《${esc(t.eventTitle)}》</b>
        <a class="entity-id" href="${DEPLOY}/news/${esc(t.contentId)}/">News Event</a>
        <a class="entity-id" href="${DEPLOY}/${t.entityId}/">${t.entityId}</a>
        <span class="simbadge">Demo Simulation${t.backfill ? ' · 历史回放' : ''}</span>
      </div>
      <div style="margin-top:9px">
        ${t.milestones.map(m => `<div class="trackmile"><span class="tm-at">${esc(m.at)}</span><span class="track-${m.state}">${{ done: '✓', tracking: '⏳', planned: '·' }[m.state]} ${esc(m.label)}</span></div>`).join('')}
      </div>
    </div>`).join('\n');

  const qRows = RT.OBSERVATORY.questionSet.map(r => {
    const cell = v => {
      const cls = v.startsWith('引用事实页') ? 'cite-yes' : (v.startsWith('待测') ? 'cite-track' : 'cite-no');
      return `<td class="${cls}">${esc(v)}</td>`;
    };
    return `<tr><td>${esc(r.q)}</td><td>${esc(r.expect)}</td>${cell(r.models.DeepSeek)}${cell(r.models.豆包)}${cell(r.models.元宝)}${cell(r.models.千问)}</tr>`;
  }).join('\n');

  const body = `
  <section style="padding-top:22px">
    <h1 class="title">AI Citation Observatory</h1>
    <p class="lede">回答领导最关心的问题：最新内容发布后，多久被搜索发现？事实更新后，多久被外部 AI 正确采用？我们有多大比例的内容进入 AI 引用链路？<span class="simbadge" style="margin-left:6px">${esc(RT.OBSERVATORY.demoNote)}</span></p>
    <div class="kpis">${kpiCard(k.discoveryLag)}${kpiCard(k.aiFreshnessLag)}${kpiCard(k.citationRate)}</div>
    <div class="verified-strip"><span><span class="dot"></span>最近一次 AI Citation：${esc(RT.OBSERVATORY.lastCitation.at)} · ${esc(RT.OBSERVATORY.lastCitation.model)} ·「${esc(RT.OBSERVATORY.lastCitation.question)}」→ 引用 <a href="${esc(RT.OBSERVATORY.lastCitation.citedUrl)}">南塘风貌街事实页</a></span></div>
  </section>

  <section id="tracking">
    <h2 class="sec">Event Tracking · 事件级追踪</h2>
    <p class="secdesc">从新闻发布到 AI 采用的完整时间轴。已完成节点显示实测时点，进行中节点显示下次探测计划。</p>
    ${trackCards}
  </section>

  <section id="questions">
    <h2 class="sec">固定问题集（节选）</h2>
    <p class="secdesc">50 题固定问题集按事实型/时间型/状态型/地点型/公共服务型/历史型分布，此处展示 6 题。每周对豆包 / DeepSeek / 元宝 / 千问回归测试。</p>
    <div style="overflow-x:auto">
    <table class="qtable">
      <tr><th style="width:30%">测试问题</th><th style="width:24%">预期正确答案（我方口径）</th><th>DeepSeek</th><th>豆包</th><th>元宝</th><th>千问</th></tr>
      ${qRows}
    </table>
    </div>
  </section>`;

  return pageShell(ctx, {
    title: 'AI Citation Observatory',
    description: 'AI 可见性、引用率与新鲜度时延监测（演示）。',
    crumbs: `${DEPLOY.replace('https://', '')} / <a href="${DEPLOY}/">fact</a> / <b>observatory</b>`,
    body,
  });
}

// ---------------- 产品首页 v2：四屏结构 ----------------
function renderPortalHome(ctx) {
  const { esc, chip, DEPLOY, E, RT, stats, SCHEMA_MAPPING, ENGINE, VERIFY_DATE } = ctx;
  const { NEWS_LIFECYCLE, CHANGE_TYPES, REVIEW_STATUS, CHANGE_TYPES_SHORT } = RT;

  // 第一屏：双链路流水线（取最新一条新闻的真实遥测，可点击）
  const latest = RT.NEWS_EVENTS.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0];
  const lf = latest.fastLane;
  const laneHtml = `
  <div class="pipeline">
    <div class="pl-title">最近一条新闻的实时旅程（点击步骤可进入 <a href="${DEPLOY}/news/${esc(latest.contentId)}/">News Event</a>）：</div>
    <div class="lane lane-fast">
      <span class="lane-name">Fast Lane</span>
      <span class="lanestep ok">${esc(latest.publishedAtSec)} 发布</span><span class="lanesep">→</span>
      <span class="lanestep ok">${esc(lf[1].time.slice(3))} Sitemap</span><span class="lanesep">→</span>
      <span class="lanestep ok">${esc(lf[2].time.slice(3))} IndexNow</span><span class="lanesep">→</span>
      <span class="lanestep ok">${esc(lf[3].time.slice(3))} 百度提交</span><span class="lanesep">→</span>
      <span class="lanestep ok">已进入搜索 / AI 检索通道</span>
    </div>
    <div class="lane lane-fact">
      <span class="lane-name">Fact Lane</span>
      ${latest.anchors.some(a => a.entityId) ? `<span class="lanestep ok">13:12 锚定 ${esc(latest.anchors.find(a => a.entityId).entityId)}</span><span class="lanesep">→</span>
      <span class="lanestep ok">13:14 抽取 ${latest.claims.length} 条 Claim</span><span class="lanesep">→</span>
      <span class="lanestep ${latest.claims.some(c => c.changeId && RT.CHANGES.find(x => x.changeId === c.changeId && x.reviewStatus === 'pending')) ? 'warn' : 'ok'}">${latest.claims.filter(c => c.changeId).length} 项 Fact Change</span><span class="lanesep">→</span>
      <span class="lanestep ${latest.claims.some(c => c.changeId && RT.CHANGES.find(x => x.changeId === c.changeId && x.reviewStatus === 'pending')) ? 'warn' : 'ok'}">${latest.claims.some(c => c.changeId && RT.CHANGES.find(x => x.changeId === c.changeId && x.reviewStatus === 'pending')) ? '待人工确认' : '已处理'} → <a href="${DEPLOY}/review/">审核工作台</a></span>` : '<span class="lanestep">无受控实体锚定 · 不进入 Fact Lane</span>'}
    </div>
  </div>`;

  const kpis = `
  <div class="statrow">
    <div class="stat"><b>${stats.todayNews}</b>今日新闻事件</div>
    <div class="stat"><b>${stats.todayChanges}</b>今日 Fact Change</div>
    <div class="stat"><b>${stats.pendingCount}</b>待人工确认</div>
    <div class="stat"><b>${esc('16%')}</b>AI Citation Rate</div>
  </div>
  <div class="verified-strip" style="margin-top:0">
    <span><span class="dot"></span>最近一次 AI Citation：${esc(RT.OBSERVATORY.lastCitation.at)} · ${esc(RT.OBSERVATORY.lastCitation.model)} → <a href="${DEPLOY}${esc(RT.OBSERVATORY.lastCitation.citedUrl)}">南塘风貌街事实页</a></span>
    <span><a href="${DEPLOY}/observatory/">进入 AI 引用监测 →</a></span>
  </div>`;

  // 第二屏：实时新闻流
  const newsSorted = RT.NEWS_EVENTS.slice().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const newsList = newsSorted.map(n => {
    const ents = n.anchors.filter(a => a.entityId);
    const pend = n.claims.filter(c => c.changeId && RT.CHANGES.find(x => x.changeId === c.changeId && x.reviewStatus === 'pending')).length;
    const factStatus = !ents.length ? '<span class="chip prec">Fact Lane：不适用（无锚定实体）</span>'
      : pend ? `<span class="chip rev-pending">Fact Lane：${pend} 项待确认</span>`
      : (n.claims.some(c => c.changeId && RT.CHANGES.find(x => x.changeId === c.changeId && x.changeType === 'update' || x.changeType === 'new' && x.reviewStatus === 'approved'))) ? '<span class="chip st-active">Fact Lane：事实已更新</span>'
      : '<span class="chip st-superseded">Fact Lane：No Change</span>';
    return `
    <div class="newsrow2">
      <div class="nr-top">
        <span class="nr-time">${esc(n.publishedAt.startsWith(ctx.VERIFY_DATE) ? n.publishedAt.slice(11) : n.publishedAt)}</span>
        <span class="nr-title"><a href="${DEPLOY}/news/${esc(n.contentId)}/">${esc(n.title)}</a></span>
      </div>
      <div class="nr-meta">
        <span>Content ID：<code>CMS-${esc(n.contentId)}</code></span>
        <span>来源：${esc(n.source)}</span>
        <span class="chip ty">${NEWS_LIFECYCLE[n.lifecycle]}</span>
        <span class="chip st-active">Fast Lane：已推送搜索</span>
        ${factStatus}
      </div>
      <div class="nr-meta">
        <span>识别实体：${ents.length ? ents.map(a => `<a href="${DEPLOY}/${a.entityId}/"><code>${a.entityId}</code></a>`).join(' · ') : '<i>无（未达锚定阈值）</i>'}</span>
        ${n.claims.length ? `<span>Claim ${n.claims.length} 条</span>` : ''}
      </div>
    </div>`;
  }).join('\n');

  // 第三屏：最近事实变化
  const chgSorted = RT.CHANGES.slice().sort((a, b) => b.changedAt.localeCompare(a.changedAt)).slice(0, 6);
  const changeFeed = chgSorted.map(c => `
    <div class="newsrow2">
      <div class="nr-top">
        <span class="nr-time">${esc(c.changedAt)}</span>
        <a class="entity-id" href="${DEPLOY}/${c.entityId}/">${esc(c.entityName)}</a>
        <span class="chg chg-${c.changeType}">${CHANGE_TYPES_SHORT[c.changeType]}</span>
        <span class="chip rev-${c.reviewStatus}">${REVIEW_STATUS[c.reviewStatus]}</span>
      </div>
      <div style="font-size:14px;margin-top:6px">${esc(c.predicate)}${c.changeType === 'no_change' ? ' · 与现行事实一致' :
      c.currentValue ? `：<span class="oldval">${esc(c.currentValue.value)}</span> → <span class="newval">${esc(c.proposedValue.value)}</span>` :
        `：<span class="newval">新增「${esc(c.proposedValue.value)}」</span>`}</div>
      <div class="nr-meta">
        <a href="${DEPLOY}/${c.entityId}/">Entity Page</a>
        ${c.contentId ? `<a href="${DEPLOY}/news/${esc(c.contentId)}/">来源新闻</a>` : ''}
        <a href="${DEPLOY}/review/${c.changeId}/">审核记录</a>
      </div>
    </div>`).join('\n');

  // 第四屏：事实目录（保留 10 卡）
  const cards = E.map(e => `
    <a class="ecard" href="${e.factUrl}">
      <div class="en">${esc(e.name)}</div>
      <div class="et">${esc(e.typeLabel)} · ${esc(e.domain)}</div>
      <div class="es">${esc(e.summary)}</div>
      <div class="em">${e.id}</div>
      <div class="est">${chip('st-active', '当前有效')} ${e.stats.active} 条 · 证据 ${e.stats.evidenceTotal} 条${e.stats.superseded + e.stats.expired ? ` · ${chip('st-superseded', '替代/失效 ' + (e.stats.superseded + e.stats.expired))}` : ''}${e.stats.uncertain + e.stats.unverified ? ` · ${chip('st-uncertain', '待核 ' + (e.stats.uncertain + e.stats.unverified))}` : ''}</div>
    </a>`).join('\n');

  const schemaTable = `<table class="kv">${SCHEMA_MAPPING.map(m => `<tr><td>${esc(m.match)}</td><td><code>${esc(m.schema)}</code>${m.note ? '<br><span style="font-size:12px;color:var(--sub)">' + esc(m.note) + '</span>' : ''}<br><span style="font-size:12px;color:var(--sub)">${esc(m.examples.join(' · '))}</span></td></tr>`).join('')}</table>`;

  const body = `
  <section style="padding-top:24px">
    <h1 class="title" style="font-size:28px">城市实时可信内容分发系统</h1>
    <p class="lede" style="font-size:15.5px">让最新城市新闻<b>更快进入搜索与 AI</b>（Fast Lane），让重要事实<b>持续沉淀为可信城市知识</b>（Fact Lane）。新闻是事件（News = Event），事实是状态（Fact = State）——这台流水线让城市信息从发生、发布、核验、沉淀，一路进入 AI 的认知链路。</p>
    ${laneHtml}
    ${kpis}
  </section>

  <section id="news">
    <h2 class="sec">实时新闻流 · 最近进入系统</h2>
    <p class="secdesc">每条新闻发布即进入 Fast Lane 分发；涉及受控实体的，同步进入 Fact Lane 做锚定、抽取与事实变化检测。<span class="simbadge">今日事件为演示模拟 · 历史事件为真实档案</span></p>
    ${newsList}
  </section>

  <section id="changes">
    <h2 class="sec">最近事实变化 · Fact Change Feed</h2>
    <p class="secdesc">机器出口：<a href="${DEPLOY}/changes.json">changes.json</a> —— 每一次事实变化都可被外部系统订阅。旧值不覆盖，全部保留版本关系。</p>
    ${changeFeed}
  </section>

  <section id="catalog">
    <h2 class="sec">城市事实目录 · 底层资产入口</h2>
    <p class="secdesc">一期 MVP ${E.length} 个高价值实体：永久 ID · 事实页 · 核心事实 · 历史时间线 · 证据链 · JSON-LD · JSON API。</p>
    <div class="cards">${cards}</div>
  </section>

  <section id="schema">
    <h2 class="sec">Entity → Schema.org 映射表</h2>
    <p class="secdesc">不为 rich result 强行套类型；不确定时使用 Thing。</p>
    ${schemaTable}
  </section>

  <section id="machine">
    <div class="machine">
      <b style="color:#fff">机器出口（Machine-readable outputs）</b><br><br>
      Fact： <code>/fact/&lt;ID&gt;/</code> HTML（服务端直出） · <code>/fact/&lt;ID&gt;.json</code> JSON API · 页面内嵌 JSON-LD<br>
      News： <code>/fact/news/&lt;content-id&gt;/</code> HTML · <code>/fact/news/&lt;content-id&gt;.json</code> News Event JSON<br>
      变化流： <a href="${DEPLOY}/changes.json" style="color:#8fd3ff">/fact/changes.json</a>（entity / predicate / old_value / new_value / changed_at / evidence_url）<br>
      索引与订阅： <a href="${DEPLOY}/sitemap.xml" style="color:#8fd3ff">sitemap.xml</a> · <a href="${DEPLOY}/feed.xml" style="color:#8fd3ff">feed.xml</a> · <a href="${DEPLOY}/feed.json" style="color:#8fd3ff">feed.json</a> · <a href="${DEPLOY}/catalog.json" style="color:#8fd3ff">catalog.json</a><br>
      MCP： 枢纽侧 news-base-mcp 为 Agent 直连通道（list_entities / search_evidence / get_entity_timeline）
    </div>
  </section>`;

  return pageShell(ctx, {
    title: '城市实时可信内容分发系统',
    description: '让最新城市新闻更快进入搜索与 AI，让重要事实持续沉淀为可信城市知识。',
    crumbs: `${DEPLOY.replace('https://', '')} / <b>fact</b>`,
    body,
    jsonLdObj: {
      '@context': 'https://schema.org', '@type': 'CollectionPage', name: '温州城市实时可信内容分发系统',
      url: DEPLOY + '/', inLanguage: 'zh-CN', sdDatePublished: VERIFY_DATE,
      sdPublisher: { '@type': 'NewsMediaOrganization', name: ENGINE.org },
    },
  });
}

module.exports = { RT_CSS, navHtml, pageShell, footerHtml, renderNewsEvent, renderReviewIndex, renderReviewDetail, renderObservatory, renderPortalHome };
