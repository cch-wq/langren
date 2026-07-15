// Supabase 配置
const SUPABASE_URL = 'https://opfzulpitspblasmybba.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_M3SmjoDJZ3PUyLH_nF3Awg_v8O-EG6i';

// 创建 Supabase 客户端
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 角色配置
const ROLES = {
    werewolf: { name: '狼人', icon: '🐺', team: 'werewolf' },
    wolf_king: { name: '狼王', icon: '👑', team: 'werewolf' },
    white_wolf: { name: '白狼王', icon: '🤍', team: 'werewolf' },
    mechanical_wolf: { name: '机械狼', icon: '🤖', team: 'werewolf' },
    wolf_beauty: { name: '狼美人', icon: '💄', team: 'werewolf' },
    seer: { name: '预言家', icon: '🔮', team: 'god' },
    witch: { name: '女巫', icon: '🧙', team: 'god' },
    hunter: { name: '猎人', icon: '🏹', team: 'god' },
    guard: { name: '守卫', icon: '🛡️', team: 'god' },
    knight: { name: '骑士', icon: '⚔️', team: 'god' },
    medium: { name: '通灵师', icon: '👻', team: 'god' },
    idiot: { name: '白痴', icon: '🤪', team: 'god' },
    villager: { name: '平民', icon: '👨‍🌾', team: 'villager' }
};

// 密码配置
const CREATE_PASSWORD = '13542';
const ADMIN_PASSWORD = '13544';

// 生成随机房间号
function generateRoomId() {
    return Math.floor(100 + Math.random() * 900).toString();
}

// 生成随机秘钥
function generateKey() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 导出
window.gameConfig = {
    supabase,
    ROLES,
    CREATE_PASSWORD,
    ADMIN_PASSWORD,
    generateRoomId,
    generateKey
};