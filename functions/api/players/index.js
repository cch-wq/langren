import { playerToDb, transformPlayer, playerUpdateToDb, json, parseBody } from '../_helpers.js'

// GET /api/players?room_id=xxx           按 room_id 查询所有玩家
// GET /api/players?key=xxx                按 key 查询单个玩家
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const room_id = url.searchParams.get('room_id')
  const key = url.searchParams.get('key')

  if (key) {
    const row = await env.DB.prepare('SELECT * FROM players WHERE key = ?').bind(key).first()
    if (!row) return json({ error: '玩家不存在' }, 404)
    return json({ data: transformPlayer(row) })
  }

  if (room_id) {
    const rows = await env.DB.prepare(
      'SELECT * FROM players WHERE room_id = ? ORDER BY player_num'
    ).bind(room_id).all()
    return json({ data: (rows.results || []).map(transformPlayer) })
  }

  return json({ error: '需要 room_id 或 key 参数' }, 400)
}

// POST /api/players
// 支持单个对象或数组（批量插入）
export async function onRequestPost({ request, env }) {
  const body = await parseBody(request)
  const list = Array.isArray(body) ? body : [body]
  if (list.length === 0) return json({ error: '空数据' }, 400)

  const stmts = list.map((p) => {
    const db = playerToDb(p)
    return env.DB.prepare(
      `INSERT INTO players (room_id, player_num, key, role, role_name, role_icon, team,
                            alive, has_voted, vote_target, witch_save_used, witch_poison_used,
                            guard_last_night, guard_last_target, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      db.room_id, db.player_num, db.key, db.role, db.role_name, db.role_icon, db.team,
      db.alive, db.has_voted, db.vote_target, db.witch_save_used, db.witch_poison_used,
      db.guard_last_night, db.guard_last_target, db.notes
    )
  })

  const results = await env.DB.batch(stmts)
  const failed = results.find((r) => !r.success)
  if (failed) return json({ error: failed.error || '插入失败' }, 500)
  return json({ success: true, count: list.length })
}

// PATCH /api/players?room_id=xxx[&key=xxx|&player_num=xxx|&role=xxx]
// 用于更新符合条件的一个或多个玩家
export async function onRequestPatch({ request, env }) {
  const body = await parseBody(request)
  const url = new URL(request.url)
  const room_id = url.searchParams.get('room_id')
  const key = url.searchParams.get('key')
  const player_num = url.searchParams.get('player_num')
  const role = url.searchParams.get('role')

  if (!room_id) return json({ error: '缺少 room_id' }, 400)

  const { sets, values } = playerUpdateToDb(body)
  if (sets.length === 0) return json({ error: '没有可更新字段' }, 400)

  const where = ['room_id = ?']
  const whereVals = [room_id]
  if (key) { where.push('key = ?'); whereVals.push(key) }
  if (player_num) { where.push('player_num = ?'); whereVals.push(parseInt(player_num, 10)) }
  if (role) { where.push('role = ?'); whereVals.push(role) }

  const { success, error } = await env.DB.prepare(
    `UPDATE players SET ${sets.join(', ')} WHERE ${where.join(' AND ')}`
  ).bind(...values, ...whereVals).run()

  if (!success) return json({ error: error || '更新失败' }, 500)
  return json({ success: true })
}

// DELETE /api/players?room_id=xxx[&role=xxx]
export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url)
  const room_id = url.searchParams.get('room_id')
  const role = url.searchParams.get('role')
  if (!room_id) return json({ error: '缺少 room_id' }, 400)

  if (role) {
    await env.DB.prepare('DELETE FROM players WHERE room_id = ? AND role = ?').bind(room_id, role).run()
  } else {
    await env.DB.prepare('DELETE FROM players WHERE room_id = ?').bind(room_id).run()
  }
  return json({ success: true })
}
