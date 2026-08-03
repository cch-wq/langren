import { json, parseBody } from './_helpers.js'

// POST /api/auth
// body: { type: 'admin' | 'create', password }
// 密码从环境变量读取（不进 git），前端不再硬编码
//   - ADMIN_PASSWORD：进入进行中游戏的 host 视图
//   - CREATE_PASSWORD：创建新房间
// 返回 { valid: boolean }
export async function onRequestPost({ request, env }) {
  const body = await parseBody(request)
  const type = body.type
  const password = body.password

  if (!type || !password) return json({ error: '缺少 type 或 password' }, 400)

  const expected = type === 'admin' ? env.ADMIN_PASSWORD : env.CREATE_PASSWORD
  if (!expected) {
    return json({ error: '服务端未配置该密码' }, 500)
  }

  return json({ valid: password === expected })
}
