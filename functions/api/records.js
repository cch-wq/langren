import { json, parseBody } from './_helpers.js'

// 合并端点：votes / check_results / daily_actions / night_actions
// 四张表都是相同模式的 CRUD（按 room_id 查、插入、按 room_id 删）
// 通过 ?type=xxx 区分，减少文件数量
//
// GET    /api/records?type=xxx&room_id=yyy[&day=n][&mode=xxx]
// POST   /api/records?type=xxx
// DELETE /api/records?type=xxx&room_id=yyy

const TABLES = {
  votes: 'votes',
  check_results: 'check_results',
  daily_actions: 'daily_actions',
  night_actions: 'night_actions'
}

// 每个表的插入字段（顺序与 INSERT 占位符对应）
const INSERT_FIELDS = {
  votes: ['room_id', 'day', 'mode', 'voter', 'target'],
  check_results: ['room_id', 'day', 'voter', 'target', 'result'],
  daily_actions: ['room_id', 'day', 'type', 'player', 'role', 'reason'],
  night_actions: ['room_id', 'day', 'role', 'actor_player_num', 'target_player_num', 'action_type', 'result']
}

function getConfig(type) {
  const table = TABLES[type]
  if (!table) return null
  return { table, fields: INSERT_FIELDS[type] }
}

// GET /api/records?type=xxx&room_id=yyy
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const cfg = getConfig(url.searchParams.get('type'))
  if (!cfg) return json({ error: '未知记录类型' }, 400)

  const room_id = url.searchParams.get('room_id')
  if (!room_id) return json({ error: '缺少 room_id' }, 400)

  const where = ['room_id = ?']
  const vals = [room_id]

  const day = url.searchParams.get('day')
  if (day) { where.push('day = ?'); vals.push(parseInt(day, 10)) }

  const mode = url.searchParams.get('mode')
  if (mode) { where.push('mode = ?'); vals.push(mode) }

  const rows = await env.DB.prepare(
    `SELECT * FROM ${cfg.table} WHERE ${where.join(' AND ')}`
  ).bind(...vals).all()
  return json({ data: rows.results || [] })
}

// POST /api/records?type=xxx
export async function onRequestPost({ request, env }) {
  const url = new URL(request.url)
  const cfg = getConfig(url.searchParams.get('type'))
  if (!cfg) return json({ error: '未知记录类型' }, 400)

  const body = await parseBody(request)
  if (!body.room_id) return json({ error: '缺少 room_id' }, 400)

  const values = cfg.fields.map((f) => body[f] ?? null)
  const placeholders = cfg.fields.map(() => '?').join(', ')

  const { success, error } = await env.DB.prepare(
    `INSERT INTO ${cfg.table} (${cfg.fields.join(', ')}) VALUES (${placeholders})`
  ).bind(...values).run()

  if (!success) return json({ error: error || '插入失败' }, 500)
  return json({ success: true })
}

// DELETE /api/records?type=xxx&room_id=yyy
export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url)
  const cfg = getConfig(url.searchParams.get('type'))
  if (!cfg) return json({ error: '未知记录类型' }, 400)

  const room_id = url.searchParams.get('room_id')
  if (!room_id) return json({ error: '缺少 room_id' }, 400)

  await env.DB.prepare(`DELETE FROM ${cfg.table} WHERE room_id = ?`).bind(room_id).run()
  return json({ success: true })
}
