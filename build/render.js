// ============================================================
// 城市事实发布引擎 · 交付验证站点生成器
// 输入：build/facts.data.js（策展事实） + _mcp/data/*.json（枢纽原始证据）
// 输出：site/ 静态站点（HTML + JSON-LD + JSON API + sitemap + feed）
// ============================================================
const fs = require('fs');
const path = require('path');
const { ENTITIES, ENGINE, VERIFY_DATE, HUB_SOURCES } = require('./facts.data.js');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, '_mcp', 'data');
// DEPLOY_BASE：本次部署的 URL 前缀（如 https://<user>.github.io/<repo>），缺省为本地根部署
// OUT_DIR：输出目录，缺省 ../site
const DEPLOY_BASE = (process.env.DEPLOY_BASE || '').replace(/\/+$/, '');
const OUT_DIR = process.env.OUT_DIR ? path.resolve(ROOT, process.env.OUT_DIR) : path.join(ROOT, 'site');
const SITE = OUT_DIR;
const BASE = ENGINE.canonicalBase.replace(/\/$/, ''); // 生产规划发布域（用于文案表述）
const DEPLOY = DEPLOY_BASE + '/fact';                 // 本次部署的事实根路径（功能性链接全部使用它）
const DEMO = DEPLOY_BASE !== '';

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE, 'fact'), { recursive: true });

function demoBanner() {
  return DEMO
    ? `<div style="background:#fff7e6;border-bottom:1px solid #f0dcae;color:#8a5a00;font-size:12.5px;text-align:center;padding:6px 14px">交付验证 · 演示部署（GitHub Pages）· 生产规划发布域为 ${BASE}/</div>`
    : '';
}

// ------------------------------------------------------------
// 1. 构建证据注册表（来自枢纽原始返回，不做二次加工）
// ------------------------------------------------------------
const harvest = {}; // slug -> file json
for (const f of fs.readdirSync(DATA_DIR).filter(x => x.endsWith('.json'))) {
  harvest[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
}

// EV 注册表：baseKey('YYYYMMDD:NNNN') -> [items]
const EV = new Map();
// CTX 注册表：'ctx:'+url -> item ；视频 'ctx:video:<slug>'
const CTX = new Map();
// ASSET 注册表：asset_id -> {title, pub, media, grade, usable, summary}
const ASSETS = new Map();
// 档案标题注册表：get_asset_detail 批量补齐（证据片段返回不含题名）
const TITLES = JSON.parse(fs.readFileSync(path.join(ROOT, '_mcp', 'titles.json'), 'utf8'));
function archivedTitle(assetId) {
  const t = TITLES[assetId];
  return t && t.title ? { title: t.title, date: t.date, media: t.media || '温州新闻网' } : null;
}

function addEv(assetId, item) {
  const m = assetId.match(/news:(\d{8}):(.+)$/);
  const base = m ? m[1] + ':' + m[2] : assetId;
  if (!EV.has(base)) EV.set(base, []);
  const list = EV.get(base);
  if (!list.some(x => x.span_hash === item.span_hash && x.start_offset === item.start_offset)) list.push(item);
}

for (const [slug, d] of Object.entries(harvest)) {
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('evidence_') && v && Array.isArray(v.evidence)) {
      for (const it of v.evidence) addEv(it.asset_id, it);
    }
  }
  const c = d.context || {};
  for (const s of c.canonical_news_samples || []) {
    CTX.set('ctx:' + s.source_url, { ...s, slug });
  }
  if (c.multimodal_video && c.multimodal_video.title) {
    CTX.set('ctx:video:' + slug, { ...c.multimodal_video, slug, isVideo: true });
  }
  for (const key of ['assets_relevant', 'assets_recent']) {
    for (const a of ((d[key] || {}).items || [])) {
      if (!ASSETS.has(a.asset_id)) ASSETS.set(a.asset_id, a);
    }
  }
}

// ------------------------------------------------------------
// 2. 证据解析与展示元数据
// ------------------------------------------------------------
function parseAssetId(key) {
  // 'YYYYMMDD:NNNN' -> {date, id, urn}
  const m = key.match(/^(\d{8}):(.+)$/);
  if (!m) return null;
  const date = m[1] === '19700101' ? null : `${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}`;
  const rawId = m[2];
  const numeric = rawId.replace(/^66wz_/, '');
  return { date, rawId, numeric, urn: `urn:wz:asset:66wz:news:${m[1]}:${rawId}` };
}

function sourceUrlFor(key, kind) {
  if (kind === 'ctx') return key.slice(4);
  const p = parseAssetId(key);
  if (!p || !p.date) return null;
  if (!/^\d+$/.test(p.numeric)) return null; // 视频等非新闻资产不生成 shtml 链接
  const [y, mo, d] = p.date.split('-');
  return `https://www.66wz.com/system/${y}/${mo}/${d}/${p.numeric}.shtml`;
}

function resolveEvidence(key) {
  // 返回 {kind, sourceOrg, title, pubDate, url, quote, statement, anchors, spanHash, confidence, verification, grade, usable, urn}
  if (key.startsWith('hub:')) {
    const h = HUB_SOURCES[key];
    return { kind: 'hub', sourceOrg: h.sourceOrg, title: h.title, statement: h.statement, quote: h.statement, authority: h.authority, verification: 'controlled_vocabulary' };
  }
  if (key.startsWith('ctx:video:')) {
    const v = CTX.get(key);
    return {
      kind: 'video', sourceOrg: '温州新闻网（视频报道）', title: v ? v.title : '视频报道',
      pubDate: v && v.pub_date ? v.pub_date.slice(0, 10) : null,
      url: v && v.canonical_url ? v.canonical_url : null,
      quote: v ? '《' + v.title + '》（视频标题级主张）' : '', directness: '标题级', grade: 'B', usable: true,
      verification: 'title_level',
    };
  }
  if (key.startsWith('ctx:')) {
    const s = CTX.get(key);
    if (!s) return { kind: 'ctx', missing: true };
    return {
      kind: 'ctx', sourceOrg: '温州新闻网', title: s.title, pubDate: (s.pub_date || '').slice(0, 10),
      url: s.canonical_url, quote: s.exact_quote, statement: '规范新闻样本（枢纽核验）',
      anchors: [s.start_offset, s.end_offset], spanHash: (s.span_hash || '').slice(0, 8),
      textHash: (s.source_text_hash || '').slice(0, 16), directness: '原文引用', grade: 'A', usable: true,
      verification: 'rule_verified',
    };
  }
  if (key.startsWith('asset:')) {
    const id = 'urn:wz:asset:66wz:news:' + key.slice(6);
    const a = ASSETS.get(id);
    const p = parseAssetId(key.slice(6));
    const arch = archivedTitle(id);
    return {
      kind: 'asset', sourceOrg: (a && a.publication_name) || (arch && arch.media) || '温州新闻网',
      title: (a && a.title) || (arch && arch.title) || '原始报道（题名未随证据返回）',
      pubDate: (a && a.pub_date) || (arch && arch.date) || (p && p.date),
      url: sourceUrlFor(key.slice(6), 'asset'), quote: a && a.summary ? a.summary.slice(0, 160) : '',
      statement: '检索命中资产（标题/摘要级）', directness: '标题/摘要级',
      grade: (a && a.grade) || (arch && arch.grade) || null, usable: a ? a.usable : true, urn: id, verification: 'metadata_only',
    };
  }
  // EV 证据片段
  const [base, hash8] = key.split('#');
  const list = EV.get(base) || [];
  let it = hash8 ? list.find(x => (x.span_hash || '').startsWith(hash8)) : list[0];
  if (!it && hash8) it = list[0];
  const p = parseAssetId(base);
  const a = ASSETS.get(it ? it.asset_id : '');
  const arch = archivedTitle(it ? it.asset_id : '');
  return {
    kind: 'span', sourceOrg: (a && a.publication_name) || (arch && arch.media) || '温州新闻网',
    title: (a && a.title) || (arch && arch.title) || '原始报道（题名未随证据返回）',
    pubDate: (p && p.date) || (arch && arch.date) || null, url: sourceUrlFor(base, 'span'),
    quote: it ? it.quote : '', statement: it ? it.statement : '',
    anchors: it ? [it.start_offset, it.end_offset] : null, spanHash: it ? (it.span_hash || '').slice(0, 8) : null,
    confidence: it ? it.confidence : null, directness: '原文引用（物理锚点）',
    grade: a ? a.grade : null, usable: a ? a.usable : true,
    urn: it ? it.asset_id : (p && p.urn), verification: it ? it.verification_status : 'unknown',
  };
}

const STATUS_META = {
  active:    { label: '当前有效',  cls: 'st-active' },
  superseded:{ label: '已被替代',  cls: 'st-superseded' },
  expired:   { label: '已失效',    cls: 'st-expired' },
  corrected: { label: '已纠正',    cls: 'st-corrected' },
  retracted: { label: '已撤回',    cls: 'st-retracted' },
  disputed:  { label: '存在争议',  cls: 'st-disputed' },
  uncertain: { label: '不确定',    cls: 'st-uncertain' },
  unverified:{ label: '未核验',    cls: 'st-unverified' },
};
const TYPE_LABEL = { '已发生事实': '已发生', '当前状态': '当前状态', '统计数据': '统计', '计划': '计划', '活动': '活动', '来源主张': '来源主张' };
const RISK_LABEL = { L1: 'L1 自动更新', L2: 'L2 人工快速确认', L3: 'L3 强制人工审核' };

function freshnessDays(pubDate) {
  if (!pubDate) return null;
  const d = Math.round((new Date(VERIFY_DATE) - new Date(pubDate)) / 86400000);
  return d;
}
function freshnessLabel(days) {
  if (days === null) return '日期不详';
  if (days <= 7) return `最新证据 ${days} 天前`;
  if (days <= 30) return `证据 ${days} 天前`;
  if (days <= 365) return `证据 ${Math.round(days / 30)} 个月前`;
  return `证据 ${(days / 365).toFixed(1)} 年前`;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function jsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// ------------------------------------------------------------
// 3. 实体解析：为每个实体绑定证据编号 / 相关新闻 / 统计
// ------------------------------------------------------------
function buildEntity(ent) {
  const evKeys = [];
  for (const f of ent.facts) for (const k of (f.evidence || [])) if (!evKeys.includes(k)) evKeys.push(k);
  for (const t of ent.timeline) for (const k of (t.evidence || [])) if (!evKeys.includes(k)) evKeys.push(k);
  const evIndex = new Map(evKeys.map((k, i) => [k, 'E' + (i + 1)]));
  const evidences = evKeys.map(k => ({ key: k, no: evIndex.get(k), ...resolveEvidence(k) }));

  // 相关新闻：仅用相关性检索结果（assets_relevant），按实体名过滤并按标题去重；
  // 不使用 assets_recent（该接口按时间排序会混入全库最新稿，与实体无关）。
  const news = [];
  const seenUrl = new Set();
  const seenTitle = new Set();
  const nameHints = [ent.name, ent.standardName, ...ent.aliases].filter(Boolean);
  const isRelevant = (text) => nameHints.some(h => text && text.includes(h.replace(/（.*?）/g, '')));
  const pushNews = (item) => {
    const id = item.url || item.urn;
    if (!id || seenUrl.has(id)) return;
    const tkey = (item.title || '').replace(/\s+/g, '');
    if (!tkey || seenTitle.has(tkey)) return;
    seenUrl.add(id); seenTitle.add(tkey);
    news.push(item);
  };
  for (const e of evidences) {
    if (e.url && e.title && e.pubDate) pushNews({ title: e.title, pubDate: e.pubDate, url: e.url, media: e.sourceOrg, grade: e.grade, viaEvidence: true });
  }
  const c = (harvest[ent.slug] || {}).context || {};
  for (const s of c.canonical_news_samples || []) {
    pushNews({ title: s.title, pubDate: (s.pub_date || '').slice(0, 10), url: s.source_url, media: '温州新闻网' });
  }
  for (const a of ((harvest[ent.slug].assets_relevant || {}).items || [])) {
    if (a.usable === false) continue;
    if (!isRelevant((a.title || '') + (a.summary || ''))) continue;
    const p = (a.asset_id || '').match(/news:(\d{8}):(.+)$/);
    let url = null;
    if (p && p[1] !== '19700101') {
      const num = p[2].replace(/^66wz_/, '');
      if (/^\d+$/.test(num)) url = `https://www.66wz.com/system/${p[1].slice(0,4)}/${p[1].slice(4,6)}/${p[1].slice(6,8)}/${num}.shtml`;
    }
    pushNews({ title: a.title, pubDate: a.pub_date, url, media: a.publication_name || '温州新闻网', grade: a.grade, urn: a.asset_id });
  }
  news.sort((x, y) => (y.pubDate || '').localeCompare(x.pubDate || ''));

  const facts = ent.facts.map(f => {
    const evs = (f.evidence || []).map(k => evIndex.get(k));
    const latestPub = (f.evidence || []).map(k => resolveEvidence(k).pubDate).filter(Boolean).sort().pop();
    return { ...f, evNos: evs, latestSourcePub: latestPub };
  });
  const timeline = ent.timeline.map(t => ({ ...t, evNos: (t.evidence || []).map(k => evIndex.get(k)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const count = s => facts.filter(f => f.status === s).length;
  return {
    ...ent,
    facts, timeline, evidences, news,
    factUrl: `${DEPLOY}/${ent.id}/`,
    jsonUrl: `${DEPLOY}/${ent.id}.json`,
    stats: {
      total: facts.length,
      active: count('active'), superseded: count('superseded'), expired: count('expired'),
      uncertain: count('uncertain'), unverified: count('unverified'),
      evidenceTotal: evidences.length,
      evidenceSpanQuote: evidences.filter(e => e.kind === 'span' || e.kind === 'ctx').length,
      newsCount: news.length,
    },
  };
}

const E = ENTITIES.map(buildEntity);
const byId = new Map(E.map(x => [x.id, x]));

// ------------------------------------------------------------
// 4. HTML 渲染
// ------------------------------------------------------------
const CSS = `
:root{--ink:#1c2430;--sub:#5a6572;--line:#e3e7ec;--paper:#f6f7f9;--card:#ffffff;--blue:#0b5cab;--blue-dk:#08427a;--amber:#9c6b1d;--amber-bg:#fdf5e6;--green:#22764a;--green-bg:#e7f4ec;--red:#b23b3b;--purple:#6b46c1;--purple-bg:#f1e9fd;--gray:#66707d;--gray-bg:#eceff3;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"PingFang SC","Microsoft YaHei","Segoe UI",system-ui,sans-serif;color:var(--ink);background:var(--paper);line-height:1.65;font-size:15px}
a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px}
header.site{background:linear-gradient(135deg,#0b2f56 0%,#0b5cab 100%);color:#fff;padding:18px 0 0}
header.site .bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.brand{display:flex;align-items:baseline;gap:12px}
.brand .logo{font-size:20px;font-weight:700;letter-spacing:.5px}
.brand .logo b{color:#ffd166}
.brand .sub{font-size:12px;opacity:.85}
header.site nav a{color:#dce9f7;font-size:13px;margin-left:16px}
.crumbs{font-size:12.5px;color:#c9d9ea;padding:12px 0 14px;font-family:Consolas,Menlo,monospace}
.crumbs b{color:#fff}
.hero{background:#fff;border-bottom:1px solid var(--line);padding:26px 0 22px}
h1.title{font-size:26px;line-height:1.3;margin-bottom:6px}
.entity-id{font-family:Consolas,Menlo,monospace;font-size:13px;color:var(--blue);background:#eaf2fb;border:1px solid #cfE0f2;border-radius:4px;padding:2px 8px;display:inline-block}
.lede{color:var(--sub);margin-top:10px;max-width:820px}
.metagrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:16px}
.metagrid .cell{background:var(--paper);border:1px solid var(--line);border-radius:6px;padding:9px 12px}
.metagrid .cell .k{font-size:12px;color:var(--sub)}
.metagrid .cell .v{font-size:13.5px;margin-top:2px}
.verified-strip{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px;background:var(--green-bg);border:1px solid #cfe7d8;border-radius:6px;padding:10px 14px;font-size:13px}
.verified-strip .dot{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;margin-right:6px}
section{padding:30px 0 6px}
h2.sec{font-size:19px;padding-left:10px;border-left:4px solid var(--blue);margin-bottom:6px}
p.secdesc{color:var(--sub);font-size:13px;margin-bottom:14px}
.chip{display:inline-block;font-size:12px;border-radius:3px;padding:1px 8px;border:1px solid transparent;margin-right:6px;vertical-align:middle}
.st-active{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.st-superseded{color:var(--gray);background:var(--gray-bg);border-color:#d5dbe3}
.st-expired{color:#5f6b78;background:#e8ebef;border-color:#d5dbe3}
.st-uncertain{color:var(--amber);background:var(--amber-bg);border-color:#eedcb8}
.st-unverified{color:var(--purple);background:var(--purple-bg);border-color:#ddcdf5}
.ty{color:#0b5cab;background:#eaf2fb;border-color:#cfe0f2}
.risk{color:#8a5a00;background:#fff7e6;border-color:#f0dcae}
.prec{color:var(--sub);background:var(--gray-bg);border-color:#d5dbe3}
.factcard{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:14px}
.factcard .pred{font-weight:600;font-size:15.5px}
.factcard .val{margin-top:5px;font-size:15px}
.factcard .meta{margin-top:9px;font-size:12.5px;color:var(--sub);display:flex;flex-wrap:wrap;gap:7px 16px}
.factcard .note{margin-top:9px;font-size:13px;color:#6d4b0d;background:var(--amber-bg);border:1px dashed #eedcb8;border-radius:5px;padding:8px 11px}
.factcard .evs{margin-top:9px;font-size:12.5px}
.factcard .evs a{margin-right:10px;white-space:nowrap}
.timeline{position:relative;margin:10px 0 30px 8px;padding-left:26px;border-left:2px solid #cfd8e2}
.tl-item{position:relative;padding-bottom:22px}
.tl-item::before{content:"";position:absolute;left:-33px;top:6px;width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid var(--blue)}
.tl-item.sup::before{border-color:#9aa5b1}
.tl-item .tl-date{font-family:Consolas,Menlo,monospace;font-size:13px;color:var(--blue-dk);font-weight:700}
.tl-item .tl-date .prec{margin-left:8px;font-weight:400}
.tl-item .tl-title{font-weight:600;margin-top:2px}
.tl-item .tl-detail{color:var(--sub);font-size:13.5px;margin-top:2px}
.tl-item .tl-refs{font-size:12px;margin-top:4px}
.evcard{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:15px 18px;margin-bottom:14px}
.evcard .evhead{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:13px;color:var(--sub)}
.evcard .evno{font-family:Consolas,Menlo,monospace;font-weight:700;color:var(--blue);font-size:13.5px}
.evcard .evtitle{font-weight:600;font-size:14.5px;margin-top:6px}
.evcard blockquote{margin:9px 0;padding:10px 14px;background:#f8fafc;border-left:3px solid var(--blue);color:#2a3542;font-size:14px;border-radius:0 5px 5px 0}
.evcard .anchors{font-family:Consolas,Menlo,monospace;font-size:12px;color:var(--sub);margin-top:6px;word-break:break-all}
.evcard .evlinks{margin-top:7px;font-size:13px}
.gradeA{color:var(--green);background:var(--green-bg);border-color:#bfe0cc}
.gradeB{color:#8a5a00;background:#fff7e6;border-color:#f0dcae}
.gradeC{color:var(--red);background:#fdecec;border-color:#f3cccc}
.relgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:26px}
.relcard{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:13px 15px}
.relcard .rn{font-weight:600}
.relcard .rt{font-size:12px;color:var(--sub);margin-top:2px}
.relcard .rid{font-family:Consolas,Menlo,monospace;font-size:11.5px;color:var(--blue);margin-top:6px}
.newslist{margin-bottom:26px}
.newsrow{display:flex;gap:12px;padding:9px 4px;border-bottom:1px dashed var(--line);font-size:13.5px;align-items:baseline}
.newsrow .nd{font-family:Consolas,Menlo,monospace;color:var(--sub);white-space:nowrap;font-size:12.5px}
.newsrow .nm{color:var(--sub);white-space:nowrap;font-size:12.5px}
.machine{background:#0e1726;color:#c8d6e5;border-radius:8px;padding:16px 18px;font-size:13px;margin-bottom:30px}
.machine code{color:#8fd3ff;font-family:Consolas,Menlo,monospace}
.machine a{color:#8fd3ff}
footer.site{border-top:1px solid var(--line);background:#fff;margin-top:20px;padding:22px 0 40px;color:var(--sub);font-size:12.5px}
footer.site .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
footer.site h4{font-size:13px;color:var(--ink);margin-bottom:6px}
.tagline{font-size:12.5px;color:#c9d9ea}
.statrow{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 4px}
.stat{background:#fff;border:1px solid var(--line);border-radius:6px;padding:8px 14px;font-size:12.5px;color:var(--sub)}
.stat b{display:block;font-size:18px;color:var(--ink)}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin:18px 0 8px}
.ecard{background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px 18px;display:block;color:var(--ink)}
.ecard:hover{border-color:var(--blue);text-decoration:none;box-shadow:0 2px 10px rgba(11,92,171,.08)}
.ecard .en{font-weight:700;font-size:16px}
.ecard .et{color:var(--sub);font-size:12.5px;margin-top:2px}
.ecard .es{font-size:13px;color:#3c4654;margin-top:8px}
.ecard .em{font-family:Consolas,Menlo,monospace;font-size:11.5px;margin-top:9px;color:var(--blue)}
.ecard .est{margin-top:8px;font-size:11.5px}
.mech{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px 20px;margin-bottom:14px}
.mech h3{font-size:15.5px;margin-bottom:8px}
.mech p,.mech li{font-size:13.5px;color:#3c4654}
.mech ul{padding-left:20px}
.mech code{background:#f1f4f8;border:1px solid var(--line);border-radius:3px;padding:0 5px;font-size:12px;font-family:Consolas,Menlo,monospace}
table.kv{border-collapse:collapse;width:100%;font-size:13px;margin-top:6px}
table.kv td{border:1px solid var(--line);padding:6px 10px}
table.kv td:first-child{background:#f8fafc;color:var(--sub);white-space:nowrap;width:170px}
`;

function chip(cls, text) { return `<span class="chip ${cls}">${esc(text)}</span>`; }
function statusChip(s) { const m = STATUS_META[s] || { label: s, cls: 'prec' }; return chip(m.cls, m.label); }
function typeChip(t) { return chip('ty', TYPE_LABEL[t] || t); }
function riskChip(r) { return chip('risk', RISK_LABEL[r] || r); }
function gradeChip(g, usable) {
  if (!g) return '';
  const label = { A: '质量 A', B: '质量 B', C: '质量 C' }[g] || g;
  const cls = 'grade' + g;
  const extra = usable === false ? ' · 不可用源' : '';
  return chip(cls, label + extra);
}
function directChip(d) { return d ? chip('prec', d) : ''; }
function verifyLabel(v) {
  return { rule_verified: '规则核验通过', controlled_vocabulary: '受控词表', title_level: '标题级主张（待核）', metadata_only: '元数据级', unknown: '待核验' }[v] || v;
}
function fmtDate(d) { return d || '日期不详'; }
function evAnchor(e) { return `<a href="#ev-${e.no}">${e.no}</a>`; }

function renderEntityPage(ent) {
  const activeFacts = ent.facts.filter(f => f.status === 'active');
  const newestPub = ent.evidences.map(e => e.pubDate).filter(Boolean).sort().pop();
  const leadFact = activeFacts.find(f => f.type === '统计数据' || f.type === '当前状态') || activeFacts[0];

  // ---- JSON-LD ----
  const subjectOf = ent.evidences.filter(e => e.url && e.title).slice(0, 12).map(e => ({
    '@type': 'NewsArticle', url: e.url, headline: e.title,
    ...(e.pubDate ? { datePublished: e.pubDate } : {}),
  }));
  const addProps = activeFacts.map(f => ({ '@type': 'PropertyValue', name: f.predicate, value: f.value }));
  const addr = { '@type': 'PostalAddress', addressCountry: 'CN', addressLocality: '温州市', streetAddress: ent.location.replace('浙江省温州市', '').replace('（.*?）', '') };
  let main;
  const common = {
    '@type': ent.schemaType, name: ent.standardName, alternateName: ent.aliases,
    description: ent.summary, identifier: ent.id, url: ent.factUrl,
    inLanguage: 'zh-CN', sdDatePublished: VERIFY_DATE + 'T10:00:00+08:00',
    sdPublisher: { '@type': 'NewsMediaOrganization', name: '温州新闻网', url: 'https://www.66wz.com' },
    subjectOf: subjectOf, additionalProperty: addProps,
  };
  if (ent.schemaType === 'Product') {
    main = { ...common, brand: { '@type': 'Brand', name: '温州大黄鱼' }, category: '海水养殖农产品' };
  } else if (ent.schemaType === 'GovernmentService') {
    main = { ...common, serviceArea: { '@type': 'AdministrativeArea', name: '温州市' } };
  } else if (ent.schemaType === 'Event') {
    main = { ...common, location: { '@type': 'Place', name: '温州园博园', address: addr } };
  } else {
    main = { ...common, address: addr, containedInPlace: { '@type': 'City', name: '温州市' } };
  }
  const ld = { '@context': 'https://schema.org', '@graph': [main] };

  // ---- sections ----
  const factCards = ent.facts.map(f => `
    <div class="factcard" id="fact-${f.fid}">
      <div class="pred">${esc(f.predicate)}</div>
      <div class="val">${esc(f.value)}${f.unit ? ' ' + esc(f.unit) : ''}</div>
      <div style="margin-top:8px">
        ${statusChip(f.status)}${typeChip(f.type)}${riskChip(f.risk)}${chip('prec', '时间精度：' + f.precision)}
      </div>
      <div class="meta">
        <span>生效：${fmtDate(f.validFrom)}${f.validTo ? ' ～ ' + fmtDate(f.validTo) : ' 至今'}</span>
        <span>来源发布：${fmtDate(f.latestSourcePub)}</span>
        <span>最后核验：${fmtDate(f.lastVerifiedAt)}</span>
        <span>下次复核：${fmtDate(f.reviewAfter)}</span>
      </div>
      ${f.note ? `<div class="note">⚙ ${esc(f.note)}</div>` : ''}
      ${f.supersededBy ? `<div class="meta"><span>替代者：<a href="#fact-${f.supersededBy}">${f.supersededBy}</a></span></div>` : ''}
      ${f.supersedes ? `<div class="meta"><span>替代：<a href="#fact-${f.supersedes}">${f.supersedes}</a></span></div>` : ''}
      <div class="evs">证据：${f.evNos.map(no => `<a href="#ev-${no}">${no}</a>`).join('')}</div>
    </div>`).join('\n');

  const timelineHtml = ent.timeline.map(t => {
    const st = t.factRef ? (ent.facts.find(f => f.fid === t.factRef) || {}).status : null;
    return `
    <div class="tl-item ${st === 'superseded' ? 'sup' : ''}">
      <div class="tl-date">${fmtDate(t.date)}${chip('prec', t.precision)}</div>
      <div class="tl-title">${esc(t.title)}</div>
      <div class="tl-detail">${esc(t.detail)}</div>
      ${t.note ? `<div class="tl-detail" style="color:#6d4b0d">⚙ ${esc(t.note)}</div>` : ''}
      <div class="tl-refs">证据：${t.evNos.map(no => `<a href="#ev-${no}">${no}</a>`).join(' ')}${t.factRef ? ` · 对应事实 <a href="#fact-${t.factRef}">${t.factRef}</a>` : ''}</div>
    </div>`;
  }).join('\n');

  const evCards = ent.evidences.map(e => {
    const anchorLine = [];
    if (e.anchors) anchorLine.push(`物理锚点 [${e.anchors[0]}, ${e.anchors[1]})`);
    if (e.spanHash) anchorLine.push(`span_hash ${e.spanHash}`);
    if (e.textHash) anchorLine.push(`text_hash ${e.textHash}`);
    if (e.confidence != null) anchorLine.push(`抽取置信度 ${e.confidence}`);
    if (e.urn) anchorLine.push(e.urn);
    const factsUsing = ent.facts.filter(f => (f.evidence || []).includes(e.key)).map(f => f.fid);
    return `
    <div class="evcard" id="ev-${e.no}">
      <div class="evhead">
        <span class="evno">${e.no}</span>
        <span>${esc(e.sourceOrg)}</span>
        <span>发布：${fmtDate(e.pubDate)}</span>
        ${e.pubDate ? `<span>${freshnessLabel(freshnessDays(e.pubDate))}</span>` : ''}
        ${gradeChip(e.grade, e.usable)}${directChip(e.directness)}${chip('prec', verifyLabel(e.verification))}
      </div>
      <div class="evtitle">${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)}</div>
      ${e.statement && e.kind === 'hub' ? `<div style="font-size:13.5px;margin-top:6px">${esc(e.statement)}</div>` : ''}
      ${e.statement && e.kind !== 'hub' ? `<div style="font-size:12.5px;color:var(--sub);margin-top:4px">抽取主张：${esc(e.statement)}</div>` : ''}
      ${e.quote ? `<blockquote>“${esc(e.quote)}”</blockquote>` : ''}
      ${anchorLine.length ? `<div class="anchors">${esc(anchorLine.join(' · '))}</div>` : ''}
      ${e.authority ? `<div class="anchors">${esc(e.authority)}</div>` : ''}
      <div class="evlinks">
        ${e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">查看原始报道 ↗</a>` : (e.urn ? `<span class="chip prec">无公网链接（档案标识见上）</span>` : '')}
        ${e.usable === false ? `<span class="chip gradeC">该来源未通过质量门槛，不作为事实依据</span>` : ''}
        ${factsUsing.length ? `<span style="color:var(--sub);margin-left:10px">支撑事实：${factsUsing.map(id => `<a href="#fact-${id}">${id}</a>`).join('、')}</span>` : ''}
      </div>
    </div>`;
  }).join('\n');

  const relCards = ent.related.map(id => {
    const r = byId.get(id);
    if (!r) return '';
    return `<a class="relcard" href="${r.factUrl}">
      <div class="rn">${esc(r.name)}</div>
      <div class="rt">${esc(r.typeLabel)}</div>
      <div class="rid">${r.id}</div>
    </a>`;
  }).join('\n');

  const newsRows = ent.news.slice(0, 14).map(n => `
    <div class="newsrow">
      <span class="nd">${fmtDate(n.pubDate)}</span>
      <span class="nm">${esc((n.media || '').replace('（视频报道）', ''))}</span>
      <span>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.title)}</a>` : esc(n.title)}</span>
      ${gradeChip(n.grade, true)}
    </div>`).join('\n');

  const s = ent.stats;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ent.name)} · 事实档案 ${ent.id} | 温州在线 · 城市事实</title>
<meta name="description" content="${esc(ent.summary)}">
<meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
<link rel="canonical" href="${ent.factUrl}">
<link rel="alternate" type="application/json" title="JSON API" href="${ent.jsonUrl}">
<style>${CSS}</style>
<script type="application/ld+json">${jsonLd(ld)}</script>
</head>
<body>
<header class="site">
  <div class="wrap">
    <div class="bar">
      <div class="brand"><span class="logo">温州在线 · <b>城市事实</b></span><span class="sub">城市事实发布引擎 Fact Publishing Engine</span></div>
      <nav><a href="${DEPLOY}/">事实目录</a><a href="#evidence">证据链</a><a href="${ent.jsonUrl}">JSON API</a><a href="${DEPLOY}/">机器出口</a></nav>
    </div>
    <div class="crumbs">www.66wz.net / fact / <b>${ent.id}</b></div>
  </div>
</header>
${demoBanner()}

<div class="hero">
  <div class="wrap">
    <h1 class="title">${esc(ent.name)}</h1>
    <div><span class="entity-id">${ent.id}</span> ${chip('ty', ent.typeLabel)} ${chip('prec', '领域：' + ent.domain)}</div>
    <p class="lede">${esc(ent.summary)}</p>
    <div class="metagrid">
      <div class="cell"><div class="k">标准名称</div><div class="v">${esc(ent.standardName)}</div></div>
      <div class="cell"><div class="k">别名</div><div class="v">${esc(ent.aliases.join(' · '))}</div></div>
      <div class="cell"><div class="k">位置</div><div class="v">${esc(ent.location)}</div></div>
      <div class="cell"><div class="k">枢纽实体溯源</div><div class="v" style="font-family:Consolas,Menlo,monospace;font-size:11.5px;word-break:break-all">${esc(ent.hub.entityRef)}</div></div>
    </div>
    <div class="verified-strip">
      <span><span class="dot"></span>最后核验：${VERIFY_DATE}</span>
      <span>最新证据：${fmtDate(newestPub)}（${freshnessLabel(freshnessDays(newestPub))}）</span>
      <span>保鲜期 TTL：${ent.ttlDays} 天</span>
      <span>领域负责：${esc(ent.domainOwner)}</span>
      <span>核验政策：${esc(ent.updateRiskNote)}</span>
    </div>
    <div class="statrow">
      <div class="stat"><b>${s.total}</b>公开事实</div>
      <div class="stat"><b>${s.active}</b>当前有效</div>
      <div class="stat"><b>${s.superseded + s.expired}</b>已被替代/失效</div>
      <div class="stat"><b>${s.uncertain + s.unverified}</b>不确定/待核验</div>
      <div class="stat"><b>${s.evidenceTotal}</b>证据条目</div>
      <div class="stat"><b>${s.newsCount}</b>相关报道</div>
    </div>
  </div>
</div>

<div class="wrap">
  <section id="current">
    <h2 class="sec">当前事实</h2>
    <p class="secdesc">区分【已发生事实 / 当前状态 / 统计 / 计划 / 活动 / 来源主张】六类口径；任何事实不直接覆盖旧值，状态机见每张卡片右上角。每条事实可点击证据编号下钻到原文锚点。</p>
    ${factCards}
  </section>

  <section id="timeline">
    <h2 class="sec">历史时间线</h2>
    <p class="secdesc">由历史报道（证据来源身份）转化而来的状态变化序列。灰色节点对应已被替代口径的历史事实。</p>
    <div class="timeline">${timelineHtml}</div>
  </section>

  <section id="evidence">
    <h2 class="sec">证据链（凭什么？）</h2>
    <p class="secdesc">每条证据给出：来源机构、材料标题、原始发布时间、原文引用片段、物理锚点 [start, end) 与 span 哈希。本页不展示"综合可信度百分比"，按来源权威性 / 证据直接性 / 时间新鲜度 / 核验状态分项标注。</p>
    ${evCards}
  </section>

  <section id="related">
    <h2 class="sec">相关事实</h2>
    <div class="relgrid">${relCards}</div>
  </section>

  <section id="news">
    <h2 class="sec">相关新闻（原 CMS 报道）</h2>
    <p class="secdesc">历史报道不重新发布，作为证据与事实页互相链接；下列为原始新闻页面。</p>
    <div class="newslist">${newsRows}</div>
  </section>

  <section>
    <div class="machine">
      <b style="color:#fff">机器出口（Machine-readable outputs）</b><br><br>
      JSON API： <code>${ent.jsonUrl}</code><br>
      JSON-LD： 本页内嵌 <code>application/ld+json</code>（schema.org:${ent.schemaType}，含 sdDatePublished / subjectOf 证据回链）<br>
      索引： <a href="${DEPLOY}/sitemap.xml">sitemap.xml</a>（lastmod=${VERIFY_DATE}） · <a href="${DEPLOY}/feed.xml">feed.xml</a> · <a href="${DEPLOY}/feed.json">feed.json</a> · <a href="${DEPLOY}/catalog.json">catalog.json</a><br>
      Agent 接入： 枢纽侧 MCP（news-base-mcp）提供 list_entities / search_evidence / get_entity_timeline 等工具，事实层与枢纽通过实体 ID 互通。
    </div>
  </section>
</div>

<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div>
        <h4>${esc(ENGINE.name)} ${esc(ENGINE.version)}</h4>
        本页由事实发布引擎于 ${ENGINE.generatedAt} 生成。<br>
        数据来源：${esc(ENGINE.hubName)}（${ENGINE.hubStats.assets.toLocaleString()} 篇资产 / ${ENGINE.hubStats.evidence.toLocaleString()} 条证据片段）。<br>
        发布域：${DEPLOY}/
      </div>
      <div>
        <h4>可信声明</h4>
        事实均有来源与证据锚点；计划与已发生事实分开表达；<br>
        无法确认的信息明确标注"不确定/待核验"；<br>
        事实旧值不删除，保留版本与替代关系。
      </div>
      <div>
        <h4>转载与引用</h4>
        内容版权归 ${esc(ENGINE.org)}；<br>
        机器引用请保留 ${ent.id} 永久标识与证据回链。<br>
        AI Citation 监测：本页已纳入固定问题集观测范围。
      </div>
    </div>
  </div>
</footer>
</body>
</html>`;
}

function entityJson(ent) {
  return {
    api: { name: ENGINE.name, version: 'v0.1', generatedAt: ENGINE.generatedAt, canonicalBase: DEPLOY + '/' },
    entity: {
      id: ent.id, standardName: ent.standardName, name: ent.name, aliases: ent.aliases,
      type: ent.typeLabel, schemaType: ent.schemaType, domain: ent.domain, location: ent.location,
      hubRef: ent.hub, summary: ent.summary,
      lastVerifiedAt: VERIFY_DATE, reviewAfter: null, ttlDays: ent.ttlDays,
      htmlUrl: ent.factUrl, jsonUrl: ent.jsonUrl,
    },
    facts: ent.facts.map(f => ({
      factId: f.fid, predicate: f.predicate, value: f.value, factType: f.type,
      status: f.status, timePrecision: f.precision,
      validFrom: f.validFrom || null, validTo: f.validTo || null,
      sourcePublishedAt: f.latestSourcePub || null, lastVerifiedAt: f.lastVerifiedAt,
      reviewAfter: f.reviewAfter || null, updateRiskLevel: f.risk,
      supersedes: f.supersedes || null, supersededBy: f.supersededBy || null, note: f.note || null,
      evidence: f.evidence,
    })),
    timeline: ent.timeline.map(t => ({ date: t.date, precision: t.precision, title: t.title, detail: t.detail, factRef: t.factRef || null, evidence: t.evidence, note: t.note || null })),
    evidence: ent.evidences.map(e => ({
      key: e.key, sourceOrg: e.sourceOrg, title: e.title, publishedAt: e.pubDate,
      quote: e.quote || null, statement: e.statement || null, anchors: e.anchors || null,
      spanHash: e.spanHash || null, confidence: e.confidence ?? null,
      verification: e.verification, directness: e.directness || null,
      qualityGrade: e.grade || null, usable: e.usable !== false,
      url: e.url || null, urn: e.urn || null,
    })),
    relatedEntities: ent.related,
    relatedNews: ent.news.slice(0, 14),
  };
}

// ------------------------------------------------------------
// 5. 门户页
// ------------------------------------------------------------
function renderPortal() {
  const totals = E.reduce((a, e) => ({
    facts: a.facts + e.stats.total, active: a.active + e.stats.active,
    sup: a.sup + e.stats.superseded + e.stats.expired, unc: a.unc + e.stats.uncertain + e.stats.unverified,
    ev: a.ev + e.stats.evidenceTotal,
  }), { facts: 0, active: 0, sup: 0, unc: 0, ev: 0 });

  const cards = E.map(e => `
    <a class="ecard" href="${e.factUrl}">
      <div class="en">${esc(e.name)}</div>
      <div class="et">${esc(e.typeLabel)} · ${esc(e.domain)}</div>
      <div class="es">${esc(e.summary)}</div>
      <div class="em">${e.id}</div>
      <div class="est">${statusChip('active')}${e.stats.active} 条有效 · 证据 ${e.stats.evidenceTotal} 条${e.stats.superseded + e.stats.expired ? ` · ${chip('st-superseded', '替代/失效 ' + (e.stats.superseded + e.stats.expired))}` : ''}${e.stats.uncertain + e.stats.unverified ? ` · ${chip('st-uncertain', '待核 ' + (e.stats.uncertain + e.stats.unverified))}` : ''}</div>
    </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>城市事实目录 | 温州在线 · 城市事实发布引擎</title>
<meta name="description" content="温州城市可信内容枢纽对外事实发布层：有来源、有时间、有状态、有版本、可持续纠错的城市事实。">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${DEPLOY}/">
<link rel="alternate" type="application/json" title="Fact Catalog API" href="${DEPLOY}/catalog.json">
<link rel="alternate" type="application/rss+xml" title="事实更新 Feed" href="${DEPLOY}/feed.xml">
<link rel="alternate" type="application/feed+json" title="事实更新 JSON Feed" href="${DEPLOY}/feed.json">
<style>${CSS}</style>
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: '温州城市事实目录',
    url: DEPLOY + '/', inLanguage: 'zh-CN', sdDatePublished: VERIFY_DATE,
    sdPublisher: { '@type': 'NewsMediaOrganization', name: '温州新闻网' },
    mainEntity: { '@type': 'ItemList', itemListElement: E.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: e.factUrl, name: e.standardName })) },
  })}</script>
</head>
<body>
<header class="site">
  <div class="wrap">
    <div class="bar">
      <div class="brand"><span class="logo">温州在线 · <b>城市事实</b></span><span class="sub">城市事实发布引擎 Fact Publishing Engine</span></div>
      <nav><a href="${DEPLOY}/catalog.json">Catalog API</a><a href="${DEPLOY}/sitemap.xml">Sitemap</a><a href="${DEPLOY}/feed.xml">RSS</a><a href="${DEPLOY}/feed.json">JSON Feed</a></nav>
    </div>
    <div class="crumbs">www.66wz.net / fact / <b>目录</b></div>
  </div>
</header>
${demoBanner()}

<div class="hero">
  <div class="wrap">
    <h1 class="title">截至现在，我们有依据地知道什么。</h1>
    <p class="lede">这不是新的新闻网站，也不是第二套 CMS。事实发布层位于城市可信内容枢纽与互联网之间，把枢纽内已核验的城市事实，转化为搜索引擎、AI 与开发者能够<b>发现、理解、验证、引用</b>的公共数字资产。新闻 CMS 管"今天报道了什么"，事实发布层管"截至现在，我们有依据地知道什么"。</p>
    <div class="statrow">
      <div class="stat"><b>${E.length}</b>实体档案</div>
      <div class="stat"><b>${totals.facts}</b>公开事实</div>
      <div class="stat"><b>${totals.active}</b>当前有效</div>
      <div class="stat"><b>${totals.sup}</b>替代/失效留痕</div>
      <div class="stat"><b>${totals.unc}</b>不确定/待核验</div>
      <div class="stat"><b>${totals.ev}</b>证据条目</div>
      <div class="stat"><b>${ENGINE.hubStats.assets.toLocaleString()}</b>枢纽资产底座</div>
    </div>
  </div>
</div>

<div class="wrap">
  <section>
    <h2 class="sec">事实档案目录</h2>
    <p class="secdesc">一期 MVP 选取 ${E.length} 个高价值城市实体（文旅空间 / 美食产业 / 重大工程 / 公共服务），每个实体具备：永久 ID · 事实页 · 核心事实 · 历史时间线 · 证据链 · 最后核验时间 · JSON-LD · JSON API。</p>
    <div class="cards">${cards}</div>
  </section>

  <section>
    <h2 class="sec">发布机制（本层如何保证"可信"）</h2>
    <div class="mech">
      <h3>① 六类对象模型</h3>
      <p>Entity 实体（永久 ID）→ Source Artifact 原始材料 → Evidence Fragment 证据片段（原文锚点+哈希）→ Claim 来源主张 → Canonical Fact 标准事实 → Public Fact 对外事实。模型推断与未过公开策略过滤的内容不进入本层。</p>
    </div>
    <div class="mech">
      <h3>② 原生时间模型</h3>
      <table class="kv">
        <tr><td>sourcePublishedAt</td><td>原材料（新闻/文件）发布时间</td></tr>
        <tr><td>validFrom / validTo</td><td>事实有效期（支持日期/月份/年份/区间/约数/未知六档精度，不为数据库方便虚构精确日期）</td></tr>
        <tr><td>lastVerifiedAt</td><td>最后一次确认仍然有效的时间</td></tr>
        <tr><td>reviewAfter</td><td>保鲜期到期时间：交通管制小时级 · 活动日级 · 工程 7–30 天 · 政策 30–90 天 · 历史事实半年–一年</td></tr>
      </table>
    </div>
    <div class="mech">
      <h3>③ 事实状态机（不覆盖旧值）</h3>
      <p>${Object.entries(STATUS_META).map(([k, v]) => statusChip(k)).join(' ')} 超过保鲜期未核验自动进入复核队列；同一口径的新统计值生成替代关系（supersededBy），旧值保留可查。</p>
    </div>
    <div class="mech">
      <h3>④ 更新机制：事件驱动 + 定期巡检 + 人工审核</h3>
      <p>${chip('risk', RISK_LABEL.L1)} 低风险字段自动发布 · ${chip('risk', RISK_LABEL.L2)} 工程/进度类机器建议+编辑确认 · ${chip('risk', RISK_LABEL.L3)} 政策有效性/重大公共数字/来源冲突强制人工审核。每天新内容进入 Fact Change Engine：Claim 抽取 → Fact Diff → 变更建议 → 风险分级 → 审核工作台。</p>
    </div>
    <div class="mech">
      <h3>⑤ 来源与证据规则（不展示神秘综合分）</h3>
      <p>按事实类型决定来源优先级；每条证据分项标注：来源权威性（媒体/词表 Authority.A）、证据直接性（原文引用 &gt; 摘要 &gt; 标题级）、时间新鲜度、抽取置信度、核验状态。质量等级 C 的来源不作为事实依据。重要事实采用一个一级权威来源或两个以上独立可靠来源。</p>
    </div>
    <div class="mech">
      <h3>⑥ 六类机器出口</h3>
      <p>HTML（服务端直出，事实不依赖 JS） · <a href="${DEPLOY}/catalog.json">JSON API（&lt;ID&gt;.json）</a> · JSON-LD（schema.org，页面内嵌） · <a href="${DEPLOY}/sitemap.xml">Sitemap（自动 lastmod）</a> · <a href="${DEPLOY}/feed.xml">RSS</a>/<a href="${DEPLOY}/feed.json">JSON Feed</a> · MCP（枢纽侧 Agent Interface，与事实层实体 ID 互通）。发布后自动进入搜索提交 / IndexNow / 站内新闻"相关事实"互链 / AI Citation Monitoring 流程。</p>
    </div>
  </section>
</div>

<footer class="site">
  <div class="wrap">
    <div class="cols">
      <div><h4>${esc(ENGINE.name)}</h4>${esc(ENGINE.version)}<br>生成时间：${ENGINE.generatedAt}<br>发布域：${DEPLOY}/</div>
      <div><h4>数据来源</h4>${esc(ENGINE.hubName)}<br>受控实体 ${ENGINE.hubStats.entities} 个 · 资产 ${ENGINE.hubStats.assets.toLocaleString()} 篇 · 证据片段 ${ENGINE.hubStats.evidence.toLocaleString()} 条</div>
      <div><h4>版权</h4>内容版权归 ${esc(ENGINE.org)}；引用请保留事实 ID 与证据回链。</div>
    </div>
  </div>
</footer>
</body>
</html>`;
}

// ------------------------------------------------------------
// 6. 写出全部文件
// ------------------------------------------------------------
// 门户
fs.writeFileSync(path.join(SITE, 'fact', 'index.html'), renderPortal());
// 根跳转（部署根 → /fact/）
fs.writeFileSync(path.join(SITE, 'index.html'), `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0; url=${DEPLOY}/"><title>温州在线 · 城市事实</title></head><body><script>location.replace('${DEPLOY}/')</script></body></html>`);

// 实体页 + JSON API
for (const ent of E) {
  fs.mkdirSync(path.join(SITE, 'fact', ent.id), { recursive: true });
  fs.writeFileSync(path.join(SITE, 'fact', ent.id, 'index.html'), renderEntityPage(ent));
  fs.writeFileSync(path.join(SITE, 'fact', ent.id + '.json'), JSON.stringify(entityJson(ent), null, 1), 'utf8');
}

// sitemap.xml
const urls = [{ loc: DEPLOY + '/', lastmod: VERIFY_DATE }];
for (const ent of E) urls.push({ loc: ent.factUrl, lastmod: VERIFY_DATE });
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>daily</changefreq><priority>${u.loc.endsWith('/fact/') ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(SITE, 'fact', 'sitemap.xml'), sitemap, 'utf8');

// feed.xml (RSS 2.0)
const feedDate = new Date(VERIFY_DATE + 'T10:00:00+08:00').toUTCString();
const feedItems = [];
for (const ent of E) {
  const active = ent.facts.filter(f => f.status === 'active').slice(0, 3);
  feedItems.push({
    title: `【事实档案】${ent.standardName}（${ent.id}）`,
    link: ent.factUrl,
    guid: ent.factUrl,
    date: VERIFY_DATE,
    desc: ent.summary + ' 当前有效事实：' + active.map(f => `${f.predicate}=${f.value}`).join('；'),
  });
}
feedItems.push(
  {
    title: `【事实替代】温州大黄鱼养殖产量更新为 2025 年度 2.2 万吨（替代 2022 年度 17318 吨口径）`,
    link: `${DEPLOY}/WZ-GOOD-00000512/#fact-WZ-F-00512-01`, guid: `${DEPLOY}/WZ-GOOD-00000512/#WZ-F-00512-01`, date: VERIFY_DATE,
    desc: 'Fact Change Engine 捕获 2026-04-21 报道新 Claim，与既有年度统计 Diff 后生成替代关系；旧值保留可查（WZ-F-00512-02，状态 superseded）。',
  },
  {
    title: `【状态变更·expired】2026温州大黄鱼品牌嘉年华（园博园）已结束`,
    link: `${DEPLOY}/WZ-GOOD-00000512/#fact-WZ-F-00512-07`, guid: `${DEPLOY}/WZ-GOOD-00000512/#WZ-F-00512-07`, date: VERIFY_DATE,
    desc: '活动有效期 2026-07-19 至 2026-07-24，到期后状态自动置为 expired，不再作为"即将举办"对外分发。',
  },
  {
    title: `【不确定表达】温州大黄鱼产值口径（15亿 vs 19亿线索）进入 L3 人工审核`,
    link: `${DEPLOY}/WZ-GOOD-00000512/#fact-WZ-F-00512-03`, guid: `${DEPLOY}/WZ-GOOD-00000512/#WZ-F-00512-03`, date: VERIFY_DATE,
    desc: '仅存在标题级证据（视频标题"卖了19亿"），不足以覆盖文字报道的"15亿元"口径，系统明确表达不确定。',
  },
  {
    title: `【待核验】园博园精确开园日期尚未取得公告级证据`,
    link: `${DEPLOY}/WZ-EVENT-00000073/#fact-WZ-F-00073-03`, guid: `${DEPLOY}/WZ-EVENT-00000073/#WZ-F-00073-03`, date: VERIFY_DATE,
    desc: '现有证据仅能证明 2026 年上半年已开放运行；为避免虚构时间精度，系统表达"不确定"，待官方公告回填。',
  },
);
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>温州城市事实 · 更新Feed</title>
<link>${DEPLOY}/</link>
<description>城市事实发布引擎：新增事实、事实更新与重大状态变化</description>
<language>zh-CN</language>
<lastBuildDate>${feedDate}</lastBuildDate>
<atom:link href="${DEPLOY}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems.map(i => `<item>
<title>${esc(i.title)}</title>
<link>${i.link}</link>
<guid isPermaLink="true">${i.guid}</guid>
<pubDate>${new Date(i.date + 'T10:00:00+08:00').toUTCString()}</pubDate>
<description>${esc(i.desc)}</description>
</item>`).join('\n')}
</channel>
</rss>`;
fs.writeFileSync(path.join(SITE, 'fact', 'feed.xml'), rss, 'utf8');

// feed.json (JSON Feed 1.1)
const jf = {
  version: 'https://jsonfeed.org/version/1.1',
  title: '温州城市事实 · 更新Feed',
  home_page_url: DEPLOY + '/',
  feed_url: DEPLOY + '/feed.json',
  language: 'zh-CN',
  description: '城市事实发布引擎：新增事实、事实更新与重大状态变化',
  items: feedItems.map(i => ({
    id: i.guid, url: i.link, title: i.title, content_text: i.desc,
    date_published: i.date + 'T10:00:00+08:00',
  })),
};
fs.writeFileSync(path.join(SITE, 'fact', 'feed.json'), JSON.stringify(jf, null, 1), 'utf8');

// catalog.json
const catalog = {
  engine: { name: ENGINE.name, version: 'v0.1', org: ENGINE.org, generatedAt: ENGINE.generatedAt, canonicalBase: DEPLOY + '/' },
  endpoints: {
    factHtml: DEPLOY + '/<ENTITY_ID>/',
    factJson: DEPLOY + '/<ENTITY_ID>.json',
    sitemap: DEPLOY + '/sitemap.xml',
    feeds: [DEPLOY + '/feed.xml', DEPLOY + '/feed.json'],
    mcp: 'news-base-mcp（城市可信内容枢纽侧 Agent Interface；工具：list_entities / get_entity_timeline / search_evidence / search_assets / get_asset_detail）',
  },
  policy: {
    statuses: Object.keys(STATUS_META),
    factTypes: Object.keys(TYPE_LABEL),
    riskLevels: RISK_LABEL,
    timePrecision: ['日', '月', '年', '区间', '约数', '未知'],
    sourcePolicy: '不提供综合可信度分；按来源权威性/证据直接性/新鲜度/多源一致性/置信度/核验状态分项标注',
  },
  entities: E.map(e => ({
    id: e.id, name: e.standardName, type: e.typeLabel, domain: e.domain,
    url: e.factUrl, jsonUrl: e.jsonUrl, lastVerifiedAt: VERIFY_DATE,
    factCount: e.stats.total, activeFacts: e.stats.active,
    supersededOrExpired: e.stats.superseded + e.stats.expired,
    uncertainOrUnverified: e.stats.uncertain + e.stats.unverified,
    evidenceCount: e.stats.evidenceTotal, hubRef: e.hub.entityRef,
  })),
};
fs.writeFileSync(path.join(SITE, 'fact', 'catalog.json'), JSON.stringify(catalog, null, 1), 'utf8');

// robots.txt
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /*.json$
Sitemap: ${DEPLOY}/sitemap.xml
`, 'utf8');

// 汇总
console.log('entities:', E.length);
for (const e of E) {
  console.log(`  ${e.id}  facts=${e.stats.total} active=${e.stats.active} sup/exp=${e.stats.superseded + e.stats.expired} unc/unv=${e.stats.uncertain + e.stats.unverified} ev=${e.stats.evidenceTotal} news=${e.stats.newsCount}`);
}
console.log('site written to', SITE);
