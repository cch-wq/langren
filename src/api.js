// 前端 API 封装：对接 Cloudflare Pages Functions + D1
// 替代原 supabase-js 客户端

// 同源调用（Pages Functions 与前端同域部署）
// 本地开发时可通过 Vite 代理或设置 VITE_API_BASE
const API_BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  let data
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg = (data && data.error) || `请求失败 (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function qs(params) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.append(k, v)
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  // ========== 密码校验 ==========
  // type: 'admin'（进入进行中游戏）| 'create'（创建房间）
  // 密码存在后端环境变量，前端不持有
  verifyAuth(type, password) {
    return request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ type, password })
    })
  },

  // ========== 房间 ==========
  // 获取最新房间（管理员进入用）
  getLatestRoom(limit = 1) {
    return request(`/api/rooms${qs({ limit })}`)
  },

  createRoom(room) {
    return request('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(room)
    })
  },

  getRoom(roomId) {
    return request(`/api/rooms/${roomId}`)
  },

  updateRoom(roomId, updates) {
    return request(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  },

  deleteRoom(roomId) {
    return request(`/api/rooms/${roomId}`, { method: 'DELETE' })
  },

  // ========== 玩家 ==========
  getPlayerByKey(key) {
    return request(`/api/players${qs({ key })}`)
  },

  getPlayersByRoom(roomId) {
    return request(`/api/players${qs({ room_id: roomId })}`)
  },

  insertPlayers(players) {
    return request('/api/players', {
      method: 'POST',
      body: JSON.stringify(players)
    })
  },

  // 按 room_id + 可选条件更新玩家
  // filter: { key?, player_num?, role? }
  updatePlayers(roomId, updates, filter = {}) {
    return request(`/api/players${qs({ room_id: roomId, ...filter })}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  },

  deletePlayers(roomId, filter = {}) {
    return request(`/api/players${qs({ room_id: roomId, ...filter })}`, {
      method: 'DELETE'
    })
  },

  // ========== 记录类（votes / check_results / daily_actions / night_actions）==========
  // 四张表共用一个端点 /api/records?type=xxx，减少后端文件数量
  getVotes(roomId, filter = {}) {
    return request(`/api/records${qs({ type: 'votes', room_id: roomId, ...filter })}`)
  },

  insertVote(vote) {
    return request(`/api/records${qs({ type: 'votes' })}`, {
      method: 'POST',
      body: JSON.stringify(vote)
    })
  },

  deleteVotes(roomId) {
    return request(`/api/records${qs({ type: 'votes', room_id: roomId })}`, { method: 'DELETE' })
  },

  getCheckResults(roomId) {
    return request(`/api/records${qs({ type: 'check_results', room_id: roomId })}`)
  },

  insertCheckResult(cr) {
    return request(`/api/records${qs({ type: 'check_results' })}`, {
      method: 'POST',
      body: JSON.stringify(cr)
    })
  },

  deleteCheckResults(roomId) {
    return request(`/api/records${qs({ type: 'check_results', room_id: roomId })}`, { method: 'DELETE' })
  },

  getDailyActions(roomId) {
    return request(`/api/records${qs({ type: 'daily_actions', room_id: roomId })}`)
  },

  insertDailyAction(action) {
    return request(`/api/records${qs({ type: 'daily_actions' })}`, {
      method: 'POST',
      body: JSON.stringify(action)
    })
  },

  deleteDailyActions(roomId) {
    return request(`/api/records${qs({ type: 'daily_actions', room_id: roomId })}`, { method: 'DELETE' })
  },

  getNightActions(roomId, filter = {}) {
    return request(`/api/records${qs({ type: 'night_actions', room_id: roomId, ...filter })}`)
  },

  insertNightAction(action) {
    return request(`/api/records${qs({ type: 'night_actions' })}`, {
      method: 'POST',
      body: JSON.stringify(action)
    })
  },

  deleteNightActions(roomId) {
    return request(`/api/records${qs({ type: 'night_actions', room_id: roomId })}`, { method: 'DELETE' })
  },

  // ========== 复合接口 ==========
  // 一次拉取整个房间的所有数据，用于轮询
  getGame(roomId) {
    return request(`/api/game/${roomId}`)
  }
}
