// Harvest data for 10 entities from the news-assets hub MCP
const fs = require('fs');
const path = require('path');
const ENDPOINT = 'https://rongmei.66wz.net/mcp';
const TOKEN = 'Bearer ' + (process.env.MCP_TOKEN || '');
const SESSION = process.env.MCP_SESSION;
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

let nextId = 500;
async function callTool(name, args = {}) {
  const body = { jsonrpc: '2.0', id: nextId++, method: 'tools/call', params: { name, arguments: args } };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: TOKEN,
      'mcp-session-id': SESSION,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = text;
  if (text.startsWith('event:')) {
    for (const line of text.split('\n')) if (line.startsWith('data:')) { data = line.slice(5).trim(); break; }
  }
  const payload = JSON.parse(data);
  if (payload.error) throw new Error(name + ' rpc error: ' + JSON.stringify(payload.error));
  if (payload.result && payload.result.isError) return { error: payload.result.content };
  let out = '';
  for (const c of payload.result.content || []) if (c.type === 'text') out += c.text;
  try { return JSON.parse(out); } catch { return { raw: out }; }
}

// ---- 10 entities chosen per doc MVP scope (文旅 / 美食之都 / 大黄鱼 / 学校 / 交通 / 重大工程 / 公共服务) ----
const ENTITIES = [
  { slug: 'wuma-street',      hubId: 'wz:entity:food:poi:wuma_street',       name: '五马街',       alias: '五马历史文化街区', queries: ['五马街 历史文化街区 改造', '五马街 客流 消费'] },
  { slug: 'nantang-street',   hubId: 'wz:entity:food:poi:nantang_street',    name: '南塘风貌街',   alias: '印象南塘',         queries: ['南塘风貌街 夜经济', '南塘街 文化旅游'] },
  { slug: 'jiangxinyu',       hubId: 'wz:entity:food:poi:jiangxinyu',        name: '江心屿',       alias: '江心孤屿',         queries: ['江心屿 改造提升', '江心屿 景区'] },
  { slug: 'yellow-croaker',   hubId: 'wz:entity:food:ingredient:yellow_croaker', name: '温州大黄鱼', alias: '洞头大黄鱼',     queries: ['大黄鱼 深水网箱 养殖', '大黄鱼 产量 产值', '大黄鱼 品牌'] },
  { slug: 'ou-cai',           hubId: 'wz:entity:food:cuisine:oucai',         name: '瓯菜',         alias: '温州菜',           queries: ['瓯菜 世界美食之都', '瓯菜 非遗'] },
  { slug: 'education-facility', hubId: 'CityPublicSpaceGlossary.PublicAmenities.EducationFacility', name: '公建教育配套设施', alias: '学校点位', queries: ['新建学校 投用 招生', '学校 建设 开工'] },
  { slug: 'rail-transit',     hubId: 'CityPublicSpaceGlossary.Transportation.RailTransit', name: '城市轨道交通网络', alias: '市域铁路S1线S2线', queries: ['市域铁路 S2线', '轨道交通 S1线 客运'] },
  { slug: 'cbd-headquarters', hubId: 'QiangChengGlossary.LandmarkAchievements.CBDHeadquartersCluster', name: '滨江商务区CBD总部大楼群', alias: '滨江CBD总部楼宇', queries: ['滨江商务区 总部大楼', '滨江CBD 金融'] },
  { slug: 'garden-expo',      hubId: 'QiangChengGlossary.LandmarkAchievements.CitywideGardenExpo', name: '第十五届中国国际园博会', alias: '全城园博', queries: ['园博会 温州 筹备', '园博园 建设'] },
  { slug: 'urban-renewal',    hubId: 'QiangChengGlossary.Planning.UrbanRenewal', name: '城市更新与旧城改造', alias: '老旧小区改造', queries: ['老旧小区改造 完成', '城中村改造 安置'] },
];

async function main() {
  const only = process.argv[2]; // optional slug filter
  for (const ent of ENTITIES) {
    if (only && ent.slug !== only) continue;
    const out = { slug: ent.slug, hubId: ent.hubId, name: ent.name, alias: ent.alias };
    console.error('harvesting', ent.slug);
    const tasks = [];
    // timeline by name (id variant errored)
    tasks.push(['timeline_name', () => callTool('get_entity_timeline', { entity_name: ent.name })]);
    tasks.push(['timeline_id',   () => callTool('get_entity_timeline', { entity_id: ent.hubId })]);
    tasks.push(['context',       () => callTool('get_asset_context', { entity_name: ent.name, format: 'json' })]);
    ent.queries.forEach((q, i) => {
      tasks.push(['evidence_' + i, () => callTool('search_evidence', { query: q, limit: 8, min_confidence: 0.5 })]);
    });
    tasks.push(['assets_recent', () => callTool('search_assets', { query: ent.name, limit: 10, sort: 'date_desc' })]);
    tasks.push(['assets_relevant', () => callTool('search_assets', { query: ent.name + ' ' + ent.alias, limit: 10 })]);
    for (const [key, fn] of tasks) {
      try {
        const r = await fn();
        if (r && r.error) { out[key] = { error: r.error }; console.error('  ', key, 'TOOL ERROR'); }
        else out[key] = r;
      } catch (e) {
        out[key] = { error: String(e.message).slice(0, 300) };
        console.error('  ', key, 'FAIL', String(e.message).slice(0, 120));
      }
      await new Promise(r => setTimeout(r, 250));
    }
    fs.writeFileSync(path.join(DATA_DIR, ent.slug + '.json'), JSON.stringify(out, null, 1), 'utf8');
    console.error('  saved', ent.slug);
  }
  console.error('DONE');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
