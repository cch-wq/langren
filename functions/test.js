// 最简单的测试端点
// GET /test
export async function onRequestGet({ env }) {
  const adminPwd = env.ADMIN_PASSWORD || '(未配置)'
  const createPwd = env.CREATE_PASSWORD || '(未配置)'
  return new Response(JSON.stringify({
    ok: true,
    admin_password_configured: !!env.ADMIN_PASSWORD,
    create_password_configured: !!env.CREATE_PASSWORD,
    db_bound: !!env.DB,
    admin_password_value: adminPwd === '(未配置)' ? null : adminPwd,
    create_password_value: createPwd === '(未配置)' ? null : createPwd
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}
