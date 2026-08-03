# 部署说明（Cloudflare Pages + D1）

> 本文档假设你已经把 GitHub 仓库连接到 Cloudflare Pages（推送到 main 自动部署）。
> 下面重点说明 **数据库部分需要做什么**。

---

## 一、数据库部分（最重要）

你的前端代码已经能自动部署，但 **数据库不会自动创建**，需要手动做 3 件事：
1. 创建一个 D1 数据库
2. 把它绑定到你的 Pages 项目
3. 把表结构（d1-schema.sql）导入进去

下面分两种方式，**任选一种**。推荐方式 A（网页操作，不用装命令行）。

### 方式 A：纯网页操作（推荐新手）

> Cloudflare 后台有中文界面，菜单名下方用 `中文 / English` 标注。找不到时优先看中文。

#### A1. 创建 D1 数据库
1. 登录 https://dash.cloudflare.com/
2. 左侧菜单找 **存储和数据库** / **Storage & Databases** → 点 **D1 SQL 数据库** / **D1 SQL Database**
   - 如果左侧没有这一项，改找 **计算和AI / Workers & Pages** → 顶部 **D1** 标签（旧版界面）
3. 点 **创建数据库** / **Create database**
4. 数据库名称填 `werewolf-game`，点创建
5. 创建后进入数据库详情页，**记下数据库 ID** / **Database ID**（一串字母数字，后面要用）

#### A2. 绑定到 Pages 项目
1. 左侧菜单 **计算和AI** / **Workers & Pages** → 找到你的 Pages 项目（`werewolf-game`）→ 点进去
2. 顶部 **设置** / **Settings** 标签 → 左侧 **绑定** / **Bindings**
3. 点 **添加** / **Add** 按钮 → 选 **D1 数据库** / **D1 database**
4. 填：
   - **变量名称** / **Variable name**：`DB` ← 必须是这个，代码里用的是这个名字
   - **D1 数据库** / **D1 database**：选刚才创建的 `werewolf-game`
5. **保存** / **Save**

> 注意：Production 和 Preview 两个环境都要绑（页面顶部可切换）。否则预览部署会报错。

#### A3. 导入表结构
1. 回到 D1 数据库详情页（左侧 **存储和数据库 → D1 SQL 数据库 → werewolf-game**）
2. 顶部 **控制台** / **Console** 标签
3. 把 [d1-schema.sql](./d1-schema.sql) 的 **全部内容** 复制粘贴到 SQL 输入框
4. 点 **执行** / **Execute**
5. 执行完应该看到 6 张表创建成功，可以在 **表** / **Tables** 标签查看

完成后数据库就准备好了。**以后改表结构，也是在这里粘贴 SQL 执行。**

---

### 方式 B：用 wrangler 命令行（推荐熟悉终端的）

先装好 wrangler 并登录：
```bash
npm install
npx wrangler login      # 浏览器弹出授权页
```

#### B1. 创建数据库
```bash
npx wrangler d1 create werewolf-game
```
输出会有一行 `database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`，
**把这个 id 填到 [wrangler.toml](./wrangler.toml)** 替换 `REPLACE_WITH_YOUR_D1_DATABASE_ID`，然后提交到 GitHub。

#### B2. 绑定到 Pages 项目
按方式 A 的 A2 步骤操作（网页上绑，Variable name 填 `DB`）。
> 也可以命令行部署时自动绑，但 GitHub 集成部署需要在网页绑一次。

#### B3. 导入表结构
```bash
# 远程（线上数据库）
npm run db:init:remote

# 本地开发数据库（可选）
npm run db:init
```
这两个命令实际是：
```bash
wrangler d1 execute werewolf-game --remote --file=d1-schema.sql
wrangler d1 execute werewolf-game --local  --file=d1-schema.sql
```

---

## 二、密码配置（必须）

密码不再写在前端代码里，改成后端环境变量。两个密码：

| 变量名 | 用途 |
|---|---|
| `ADMIN_PASSWORD` | 进入进行中游戏（host 视图），原 `13544` |
| `CREATE_PASSWORD` | 创建新房间，原 `13542` |

### 线上配置（Pages 项目）
1. Pages 项目 → **Settings** → **Environment variables**
2. 添加上面两个变量，值自己定（不一定要用原来的数字）
3. **Production 和 Preview 环境都要加**（页面顶部切换）
4. Save 后 **重新部署一次**（Deployments → 任一部署 → Retry deployment）才生效

### 本地开发配置
```bash
# 复制示例文件
cp .dev.vars.example .dev.vars
```
编辑 `.dev.vars` 填入密码（这个文件不会进 git）。`wrangler pages dev` 会自动读取。

---

## 三、本地联调

需要两个终端（前端热更新 + 后端 Functions）：

```bash
# 终端 1：启动后端（提供 /api，读取 .dev.vars 密码）
npm run build
npx wrangler pages dev dist --port 8788 --d1=DB

# 终端 2：启动前端（热更新，/api 自动代理到 8788）
npm run dev
```
打开 http://localhost:3000

> `--d1=DB` 会用本地 SQLite 模拟 D1（数据存在 `.wrangler/state/`）。
> 第一次跑要先 `npm run db:init` 建本地表。

---

## 四、部署流程总结

已经连好 GitHub 后，**日常部署**全自动：
- 推送到 `main` → Cloudflare 自动 build + deploy
- 前端和 functions 一起部署（functions 目录会被自动识别）

**只有以下情况需要手动操作：**
| 场景 | 操作 |
|---|---|
| 第一次部署 | 做完上面「一、数据库」和「二、密码」 |
| 改了表结构（d1-schema.sql） | 去 D1 Console 粘贴新 SQL 执行，或 `npm run db:init:remote` |
| 改了密码 | Pages → Settings → Environment variables 改完重新部署 |
| 改了 wrangler.toml 的 database_id | 提交后重新部署 |

---

## 五、架构与文件结构

```
├── functions/api/          # 后端（Pages Functions，自动路由）
│   ├── _helpers.js         # D1 ↔ 前端数据转换工具
│   ├── auth.js             # 密码校验
│   ├── records.js          # votes/checks/actions/night 四表合并 CRUD
│   ├── game/[roomId].js    # 一次拉取整个房间数据（轮询用）
│   ├── rooms/index.js      # 房间列表/创建
│   ├── rooms/[roomId].js   # 单个房间 CRUD
│   └── players/index.js    # 玩家查询/批量插入/更新/删除
├── src/                    # 前端（Vue 3）
│   ├── api.js              # API 封装（替代 supabase-js）
│   └── components/         # 4 个页面组件
├── d1-schema.sql           # 唯一的数据库 schema（6 张表）
├── wrangler.toml           # Cloudflare 配置（D1 绑定）
└── .dev.vars.example       # 本地密码示例
```

**实时更新**：用 2 秒轮询 `/api/game/:roomId` 替代原 Supabase realtime。
（Game.vue / Host.vue 的 `startPolling`）

---

## 六、常见问题

**Q: 部署后访问报 500 / "DB is not defined"？**
A: D1 没绑或变量名不是 `DB`。看「A2」重新绑，Production 和 Preview 都要绑。

**Q: 登录提示"服务端未配置该密码"？**
A: 环境变量没加或没重新部署。看「二、密码配置」。

**Q: 表不存在 / 查询报 no such table？**
A: 没导入 schema。看「A3」去 D1 Console 执行 d1-schema.sql。

**Q: 本地 wrangler pages dev 报错？**
A: 先 `npm run build` 生成 dist，再启动；并确保跑过 `npm run db:init` 建本地表。
