import { transformRoom, roomUpdateToDb, json, parseBody } from '../_helpers.js'

// GET /api/rooms/:roomId
export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(params.roomId).first()
  if (!row) return json({ error: '房间不存在' }, 404)
  return json({ data: transformRoom(row) })
}

// PATCH /api/rooms/:roomId
export async function onRequestPatch({ params, request, env }) {
  const body = await parseBody(request)
  const { sets, values } = roomUpdateToDb(body)
  if (sets.length === 0) return json({ error: '没有可更新字段' }, 400)

  values.push(params.roomId)
  const { success, error } = await env.DB.prepare(
    `UPDATE rooms SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...values).run()

  if (!success) return json({ error: error || '更新失败' }, 500)
  const row = await env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(params.roomId).first()
  return json({ data: transformRoom(row) })
}

// DELETE /api/rooms/:roomId
export async function onRequestDelete({ params, env }) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM votes WHERE room_id = ?').bind(params.roomId),
    env.DB.prepare('DELETE FROM check_results WHERE room_id = ?').bind(params.roomId),
    env.DB.prepare('DELETE FROM daily_actions WHERE room_id = ?').bind(params.roomId),
    env.DB.prepare('DELETE FROM night_actions WHERE room_id = ?').bind(params.roomId),
    env.DB.prepare('DELETE FROM players WHERE room_id = ?').bind(params.roomId),
    env.DB.prepare('DELETE FROM rooms WHERE id = ?').bind(params.roomId)
  ])
  return json({ success: true })
}
