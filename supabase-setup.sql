-- 狼人杀游戏数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 房间表
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_day INTEGER DEFAULT 1,
    phase TEXT DEFAULT 'waiting',
    vote_timer BIGINT DEFAULT 0,
    vote_countdown INTEGER DEFAULT 10,
    pk_mode TEXT DEFAULT 'normal',
    pk_targets TEXT[] DEFAULT '{}',
    night_timer BIGINT DEFAULT 0,
    night_countdown INTEGER DEFAULT 120,
    speech_timer BIGINT DEFAULT 0,
    speech_countdown INTEGER DEFAULT 180,
    speech_active BOOLEAN DEFAULT FALSE,
    witch_self_save BOOLEAN DEFAULT FALSE
);

-- 2. 玩家表
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    player_num INTEGER NOT NULL,
    key TEXT NOT NULL,
    role TEXT NOT NULL,
    role_name TEXT NOT NULL,
    role_icon TEXT NOT NULL,
    team TEXT NOT NULL,
    alive BOOLEAN DEFAULT TRUE,
    has_voted BOOLEAN DEFAULT FALSE,
    vote_target TEXT DEFAULT NULL,
    witch_potion INTEGER DEFAULT 2,
    guard_last_night BOOLEAN DEFAULT FALSE,
    UNIQUE(room_id, player_num),
    UNIQUE(key)
);

-- 3. 投票记录表
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    mode TEXT DEFAULT 'normal',
    voter TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 查验结果表
CREATE TABLE check_results (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    voter TEXT NOT NULL,
    target TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 每日行动表
CREATE TABLE daily_actions (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    type TEXT NOT NULL,
    player TEXT NOT NULL,
    role TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 夜间行动表
CREATE TABLE night_actions (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    role TEXT NOT NULL,
    actor_player_num INTEGER NOT NULL,
    target_player_num INTEGER DEFAULT NULL,
    action_type TEXT NOT NULL,
    result TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 游戏配置表（存储角色配置）
CREATE TABLE room_config (
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (room_id, role_id)
);

-- 创建索引
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_players_key ON players(key);
CREATE INDEX idx_votes_room ON votes(room_id, day, mode);
CREATE INDEX idx_room_config_room ON room_config(room_id);
CREATE INDEX idx_night_actions_room ON night_actions(room_id, day);

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE night_actions;