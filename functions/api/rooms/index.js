import { roomToDb, transformRoom, json, parseBody } from '../_helpers.js'

// GET /api/rooms?limit=1&order=created_at.desc
// 用于 Home.vue 获取最新房间（管理员视角）
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') || '1', 10)
  const rows = await env.DB.prepare(
    'SELECT * FROM rooms ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all()
  return json({ data: (rows.results || []).map(transformRoom) })
}

// POST /api/rooms
// 创建房间
export async function onRequestPost({ request, env }) {
  const body = await parseBody(request)
  if (!body.id) return json({ error: '缺少房间 id' }, 400)

  const db = roomToDb(body)
  const { success, error } = await env.DB.prepare(
    `INSERT INTO rooms (id, current_day, phase, pk_mode, pk_targets, vote_timer, vote_countdown,
                        night_timer, night_countdown, speech_timer, speech_countdown,
                        speech_active, witch_self_save)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    db.id, db.current_day, db.phase, db.pk_mode, db.pk_targets,
    db.vote_timer, db.vote_countdown, db.night_timer, db.night_countdown,
    db.speech_timer, db.speech_countdown, db.speech_active, db.witch_self_save
  ).run()

  if (!success) return json({ error: error || '创建房间失败' }, 500)
  const row = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(db.id).first()
  return json({ data: transformRoom(row) })
}
