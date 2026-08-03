import { transformRoom, transformPlayer, json } from '../../_helpers.js'

// GET /api/game/:roomId
// 一次性返回房间、玩家、投票、查验、每日行动、夜间行动
// 前端轮询此接口替代 Supabase realtime
export async function onRequestGet({ params, env }) {
  const { roomId } = params
  if (!roomId) return json({ error: '缺少 roomId' }, 400)

  const [roomRow, playerRows, voteRows, checkRows, actionRows, nightRows] = await Promise.all([
    env.DB.prepare('SELECT * FROM rooms WHERE id = ?').bind(roomId).first(),
    env.DB.prepare('SELECT * FROM players WHERE room_id = ? ORDER BY player_num').bind(roomId).all(),
    env.DB.prepare('SELECT * FROM votes WHERE room_id = ?').bind(roomId).all(),
    env.DB.prepare('SELECT * FROM check_results WHERE room_id = ?').bind(roomId).all(),
    env.DB.prepare('SELECT * FROM daily_actions WHERE room_id = ?').bind(roomId).all(),
    env.DB.prepare('SELECT * FROM night_actions WHERE room_id = ?').bind(roomId).all()
  ])

  if (!roomRow) return json({ error: '房间不存在' }, 404)

  return json({
    room: transformRoom(roomRow),
    players: (playerRows.results || []).map(transformPlayer),
    votes: voteRows.results || [],
    check_results: checkRows.results || [],
    daily_actions: actionRows.results || [],
    night_actions: nightRows.results || []
  })
}
