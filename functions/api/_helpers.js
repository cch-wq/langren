// 共享工具：D1 数据格式转换与查询封装
// Pages Functions 中下划线开头的文件不会被当作路由

function safeJsonParse(str, fallback) {
  if (str == null) return fallback
  if (Array.isArray(str) || typeof str === 'object') return str
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// D1 rooms 行 → 前端 room 对象
export function transformRoom(row) {
  if (!row) return null
  return {
    id: row.id,
    current_day: row.current_day,
    phase: row.phase,
    pk_mode: row.pk_mode,
    pk_targets: safeJsonParse(row.pk_targets, []),
    vote_timer: row.vote_timer,
    vote_countdown: row.vote_countdown,
    night_timer: row.night_timer,
    night_countdown: row.night_countdown,
    speech_timer: row.speech_timer,
    speech_countdown: row.speech_countdown,
    speech_active: !!row.speech_active,
    witch_self_save: !!row.witch_self_save,
    created_at: row.created_at
  }
}

// D1 players 行 → 前端 player 对象
export function transformPlayer(row) {
  if (!row) return null
  return {
    id: row.id,
    room_id: row.room_id,
    player_num: row.player_num,
    key: row.key,
    role: row.role,
    role_name: row.role_name,
    role_icon: row.role_icon,
    team: row.team,
    alive: !!row.alive,
    has_voted: !!row.has_voted,
    vote_target: row.vote_target,
    witch_save_used: !!row.witch_save_used,
    witch_poison_used: !!row.witch_poison_used,
    guard_last_night: !!row.guard_last_night,
    guard_last_target: row.guard_last_target,
    notes: row.notes || ''
  }
}

// 前端 room 对象 → D1 写入参数
export function roomToDb(room) {
  return {
    id: room.id,
    current_day: room.current_day ?? 0,
    phase: room.phase ?? 'waiting',
    pk_mode: room.pk_mode ?? 'normal',
    pk_targets: JSON.stringify(room.pk_targets ?? []),
    vote_timer: room.vote_timer ?? 0,
    vote_countdown: room.vote_countdown ?? 15,
    night_timer: room.night_timer ?? 0,
    night_countdown: room.night_countdown ?? 90,
    speech_timer: room.speech_timer ?? 0,
    speech_countdown: room.speech_countdown ?? 120,
    speech_active: room.speech_active ? 1 : 0,
    witch_self_save: room.witch_self_save ? 1 : 0
  }
}

// 前端 player 对象 → D1 写入参数（用于 insert）
export function playerToDb(p) {
  return {
    room_id: p.room_id,
    player_num: p.player_num,
    key: p.key,
    role: p.role,
    role_name: p.role_name,
    role_icon: p.role_icon,
    team: p.team,
    alive: p.alive === false ? 0 : 1,
    has_voted: p.has_voted ? 1 : 0,
    vote_target: p.vote_target ?? null,
    witch_save_used: p.witch_save_used ? 1 : 0,
    witch_poison_used: p.witch_poison_used ? 1 : 0,
    guard_last_night: p.guard_last_night ? 1 : 0,
    guard_last_target: p.guard_last_target ?? null,
    notes: p.notes ?? ''
  }
}

// 前端 player 更新字段 → D1 SET 片段
// 返回 { sets: ['col = ?', ...], values: [...] }
export function playerUpdateToDb(updates) {
  const map = {
    alive: (v) => v ? 1 : 0,
    has_voted: (v) => v ? 1 : 0,
    guard_last_night: (v) => v ? 1 : 0,
    witch_save_used: (v) => v ? 1 : 0,
    witch_poison_used: (v) => v ? 1 : 0
  }
  const sets = []
  const values = []
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id' || k === 'room_id' || k === 'player_num' || k === 'key') continue
    const transform = map[k] || ((x) => x)
    sets.push(`${k} = ?`)
    values.push(transform(v))
  }
  return { sets, values }
}

export function roomUpdateToDb(updates) {
  const map = {
    speech_active: (v) => v ? 1 : 0,
    witch_self_save: (v) => v ? 1 : 0
  }
  const sets = []
  const values = []
  for (const [k, v] of Object.entries(updates)) {
    if (k === 'id') continue
    if (k === 'pk_targets') {
      sets.push('pk_targets = ?')
      values.push(JSON.stringify(v ?? []))
      continue
    }
    const transform = map[k] || ((x) => x)
    sets.push(`${k} = ?`)
    values.push(transform(v))
  }
  return { sets, values }
}

// 统一 JSON 响应
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

// 解析请求体
export async function parseBody(request) {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
