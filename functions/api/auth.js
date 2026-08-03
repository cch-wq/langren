// POST /api/auth
// body: { type: 'admin' | 'create', password }
// 密码从环境变量读取（不进 git），前端不再硬编码
// 返回 { valid: boolean }
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json()
    const type = body.type
    const password = body.password

    if (!type || !password) {
      return new Response(JSON.stringify({ error: '缺少 type 或 password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    const expected = type === 'admin' ? env.ADMIN_PASSWORD : env.CREATE_PASSWORD
    if (!expected) {
      return new Response(JSON.stringify({ error: '服务端未配置该密码' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      })
    }

    return new Response(JSON.stringify({ valid: password === expected }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}
