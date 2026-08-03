CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  current_day INTEGER DEFAULT 1,
  phase TEXT DEFAULT 'waiting',
  pk_mode TEXT DEFAULT 'normal',
  pk_targets TEXT DEFAULT '[]',
  vote_timer INTEGER DEFAULT 0,
  vote_countdown INTEGER DEFAULT 15,
  night_timer INTEGER DEFAULT 0,
  night_countdown INTEGER DEFAULT 90,
  speech_timer INTEGER DEFAULT 0,
  speech_countdown INTEGER DEFAULT 120,
  speech_active INTEGER DEFAULT 0,
  witch_self_save INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  player_num INTEGER,
  key TEXT,
  role TEXT,
  role_name TEXT,
  role_icon TEXT,
  team TEXT,
  alive INTEGER DEFAULT 1,
  has_voted INTEGER DEFAULT 0,
  vote_target TEXT,
  witch_save_used INTEGER DEFAULT 0,
  witch_poison_used INTEGER DEFAULT 0,
  guard_last_night INTEGER DEFAULT 0,
  guard_last_target INTEGER,
  notes TEXT DEFAULT '',
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  day INTEGER,
  mode TEXT,
  voter TEXT,
  target TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS check_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  day INTEGER,
  voter TEXT,
  target TEXT,
  result TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS daily_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  day INTEGER,
  type TEXT,
  player TEXT,
  role TEXT,
  reason TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS night_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT,
  day INTEGER,
  role TEXT,
  actor_player_num INTEGER,
  target_player_num INTEGER,
  action_type TEXT,
  result TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_players_room_key ON players(room_id, key);
CREATE INDEX IF NOT EXISTS idx_players_room_num ON players(room_id, player_num);
CREATE INDEX IF NOT EXISTS idx_votes_room_day ON votes(room_id, day);
CREATE INDEX IF NOT EXISTS idx_check_results_room_day ON check_results(room_id, day);
CREATE INDEX IF NOT EXISTS idx_daily_actions_room_day ON daily_actions(room_id, day);
CREATE INDEX IF NOT EXISTS idx_night_actions_room_day ON night_actions(room_id, day);
