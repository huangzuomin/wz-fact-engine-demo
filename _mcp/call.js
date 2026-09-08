// Minimal MCP Streamable-HTTP client for the news-assets hub
const ENDPOINT = 'https://rongmei.66wz.net/mcp';
const TOKEN = 'Bearer ' + (process.env.MCP_TOKEN || '');

let sessionId = process.env.MCP_SESSION;
let nextId = 100;

function extractData(raw) {
  if (raw.startsWith('event:') || raw.includes('\ndata:') || raw.startsWith('data:')) {
    for (const line of raw.split('\n')) {
      if (line.startsWith('data:')) return line.slice(5).trim();
    }
  }
  return raw;
}

async function rpc(method, params, { notify = false } = {}) {
  const body = notify
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: nextId++, method, params };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': TOKEN,
      'mcp-session-id': sessionId,
    },
    body: JSON.stringify(body),
  });
  const sid = res.headers.get('mcp-session-id');
  if (sid) sessionId = sid;
  const text = await res.text();
  if (notify) return null;
  const payload = JSON.parse(extractData(text));
  if (payload.error) throw new Error(method + ' -> ' + JSON.stringify(payload.error));
  return payload.result;
}

async function callTool(name, args = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  if (result.isError) throw new Error(name + ' tool error: ' + JSON.stringify(result.content));
  let text = '';
  for (const c of result.content || []) {
    if (c.type === 'text') text += c.text;
  }
  // try parse JSON, else return raw text
  try { return { json: JSON.parse(text), text }; } catch { return { json: null, text }; }
}

const [,, cmd, toolName, argsJson] = process.argv;
(async () => {
  if (cmd === 'call') {
    const args = argsJson ? JSON.parse(argsJson) : {};
    const r = await callTool(toolName, args);
    console.log(r.text);
  } else if (cmd === 'init') {
    const r = await rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'fact-verify', version: '1.0' },
    });
    await rpc('notifications/initialized', {}, { notify: true });
    console.log('SESSION=' + sessionId);
    console.log(JSON.stringify(r.serverInfo));
  }
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
