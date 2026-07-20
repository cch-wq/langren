-- 创建缺失的表
-- 在 Supabase SQL Editor 中执行此脚本

-- 投票记录表
CREATE TABLE IF NOT EXISTS votes (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    mode TEXT DEFAULT 'normal',
    voter TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 查验结果表
CREATE TABLE IF NOT EXISTS check_results (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    voter TEXT NOT NULL,
    target TEXT NOT NULL,
    result TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 每日行动表
CREATE TABLE IF NOT EXISTS daily_actions (
    id SERIAL PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    day INTEGER NOT NULL,
    type TEXT NOT NULL,
    player TEXT NOT NULL,
    role TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 夜间行动表
CREATE TABLE IF NOT EXISTS night_actions (
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_votes_room ON votes(room_id, day, mode);
CREATE INDEX IF NOT EXISTS idx_check_results_room ON check_results(room_id, day);
CREATE INDEX IF NOT EXISTS idx_daily_actions_room ON daily_actions(room_id, day);
CREATE INDEX IF NOT EXISTS idx_night_actions_room ON night_actions(room_id, day);

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE check_results;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_actions;
ALTER PUBLICATION supabase_realtime ADD TABLE night_actions;

-- 添加 rooms 表缺失的字段（如果不存在）
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS night_timer INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS vote_countdown INTEGER DEFAULT 15;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS night_countdown INTEGER DEFAULT 90;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS speech_countdown INTEGER DEFAULT 120;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS speech_active BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS witch_self_save BOOLEAN DEFAULT FALSE;

-- 添加 players 表缺失的字段（如果不存在）
ALTER TABLE players ADD COLUMN IF NOT EXISTS witch_potion INTEGER DEFAULT 2;
ALTER TABLE players ADD COLUMN IF NOT EXISTS guard_last_night BOOLEAN DEFAULT FALSE;
