<template>
  <div class="create-room">
    <div class="container">
      <div class="header">
        <h1 class="title">🐺 创建房间</h1>
        <p class="subtitle">配置游戏角色</p>
      </div>
      
      <div class="card">
        <el-form :model="form" label-width="100px">
          <el-form-item label="创建密码">
            <el-input v-model="form.password" type="password" placeholder="请输入创建密码" />
          </el-form-item>
          
          <div class="roles-section">
            <h3 class="section-title">狼人阵营</h3>
            <div class="roles-grid">
              <div class="role-item" v-for="role in werewolfRoles" :key="role.id">
                <span class="role-icon">{{ role.icon }}</span>
                <span class="role-name">{{ role.name }}</span>
                <el-input-number v-model="form.roles[role.id]" :min="0" :max="10" size="small" />
              </div>
            </div>
          </div>
          
          <div class="roles-section">
            <h3 class="section-title">神职阵营</h3>
            <div class="roles-grid">
              <div class="role-item" v-for="role in godRoles" :key="role.id">
                <span class="role-icon">{{ role.icon }}</span>
                <span class="role-name">{{ role.name }}</span>
                <el-input-number v-model="form.roles[role.id]" :min="0" :max="10" size="small" />
              </div>
            </div>
          </div>
          
          <div class="roles-section">
            <h3 class="section-title">平民阵营</h3>
            <div class="roles-grid">
              <div class="role-item" v-for="role in villagerRoles" :key="role.id">
                <span class="role-icon">{{ role.icon }}</span>
                <span class="role-name">{{ role.name }}</span>
                <el-input-number v-model="form.roles[role.id]" :min="0" :max="20" size="small" />
              </div>
            </div>
          </div>
          
          <div class="total-players">
            总人数: <span class="count">{{ totalPlayers }}</span>
            <span v-if="totalPlayers < 3" class="warning">（至少需要3名玩家）</span>
          </div>
          
          <div class="roles-section" v-if="false">
            <h3 class="section-title">游戏规则</h3>
            <div class="rule-item">
              <el-checkbox v-model="form.witchSelfSave">女巫可以自救</el-checkbox>
              <span class="rule-hint">（默认不允许自救）</span>
            </div>
          </div>
          
          <div class="button-group">
            <el-button type="primary" @click="createRoom" :loading="loading" :disabled="totalPlayers < 3" class="action-btn">创建房间</el-button>
            <el-button @click="goBack" class="action-btn">返回</el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const loading = ref(false)
const CREATE_PASSWORD = '13542'

const werewolfRoles = [
  { id: 'werewolf', name: '狼人', icon: '🐺', team: 'werewolf' },
  { id: 'wolf_king', name: '狼王', icon: '👑', team: 'werewolf' },
  { id: 'white_wolf', name: '白狼王', icon: '🤍', team: 'werewolf' },
  { id: 'mechanical_wolf', name: '机械狼', icon: '🤖', team: 'werewolf' },
  { id: 'wolf_beauty', name: '狼美人', icon: '💄', team: 'werewolf' }
]

const godRoles = [
  { id: 'seer', name: '预言家', icon: '🔮', team: 'god' },
  { id: 'witch', name: '女巫', icon: '🧙', team: 'god' },
  { id: 'hunter', name: '猎人', icon: '🏹', team: 'god' },
  { id: 'guard', name: '守卫', icon: '🛡️', team: 'god' },
  { id: 'knight', name: '骑士', icon: '⚔️', team: 'god' },
  { id: 'medium', name: '通灵师', icon: '👻', team: 'god' },
  { id: 'idiot', name: '白痴', icon: '🤪', team: 'god' }
]

const villagerRoles = [
  { id: 'villager', name: '平民', icon: '👨‍🌾', team: 'villager' }
]

const form = reactive({
  password: '',
  witchSelfSave: false,
  roles: {
    werewolf: 3,
    wolf_king: 0,
    white_wolf: 0,
    mechanical_wolf: 0,
    wolf_beauty: 0,
    seer: 1,
    witch: 1,
    hunter: 1,
    guard: 0,
    knight: 0,
    medium: 0,
    idiot: 0,
    villager: 3
  }
})

const totalPlayers = computed(() => {
  return Object.values(form.roles).reduce((sum, val) => sum + val, 0)
})

const generateRoomId = () => {
  return Math.floor(100 + Math.random() * 900).toString()
}

const generatePlayerKey = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const shuffleArray = (array) => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const createRoom = async () => {
  if (!form.password) {
    alert('请输入创建密码')
    return
  }
  
  if (form.password !== CREATE_PASSWORD) {
    alert('密码错误')
    return
  }
  
  loading.value = true
  try {
    const roomId = generateRoomId()
    
    const roomData = {
      id: roomId,
      current_day: 1,
      phase: 'waiting',
      pk_mode: 'normal',
      pk_targets: [],
      vote_timer: 0,
      vote_countdown: 15,
      night_timer: 0,
      night_countdown: 90,
      speech_timer: 0,
      speech_countdown: 120,
      speech_active: false
    }
    
    const { error: roomError } = await supabase.from('rooms').insert(roomData)
    
    if (roomError) {
      if (roomError.code === '42703') {
        console.warn('表结构不完整，尝试简化创建房间:', roomError.message)
        const simpleRoomData = {
          id: roomId,
          current_day: 1,
          phase: 'waiting',
          pk_mode: 'normal',
          pk_targets: [],
          vote_timer: 0,
          vote_countdown: 10,
          night_timer: 0
        }
        const { error: simpleError } = await supabase.from('rooms').insert(simpleRoomData)
        if (simpleError) throw simpleError
      } else {
        throw roomError
      }
    }
    
    const rolesList = []
    werewolfRoles.concat(godRoles, villagerRoles).forEach(role => {
      for (let i = 0; i < form.roles[role.id]; i++) {
        rolesList.push({
          role_id: role.id,
          role_name: role.name,
          role_icon: role.icon,
          team: role.team
        })
      }
    })
    
    const shuffledRoles = shuffleArray(rolesList)
    
    const players = shuffledRoles.map((role, index) => ({
      room_id: roomId,
      player_num: index + 1,
      key: generatePlayerKey(),
      role: role.role_id,
      role_name: role.role_name,
      role_icon: role.role_icon,
      team: role.team,
      alive: true,
      has_voted: false,
      vote_target: null
    }))
    
    const { error: playersError } = await supabase.from('players').insert(players)
    
    if (playersError) throw playersError
    
    alert(`房间创建成功！\n房间号：${roomId}\n管理员密码：13544`)
    router.push(`/host/${roomId}`)
  } catch (error) {
    console.error('创建房间失败:', error)
    alert('创建房间失败：' + error.message)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<style scoped>
.create-room {
  min-height: 100vh;
  padding: 16px;
}

.container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
}

.roles-section {
  margin-bottom: 20px;
}

.section-title {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: bold;
}

.roles-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  padding: 10px 12px;
  border-radius: 8px;
  min-width: 140px;
}

.role-icon {
  font-size: 20px;
}

.role-name {
  color: #fff;
  min-width: 45px;
  font-size: 14px;
}

.total-players {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 20px;
  font-size: 18px;
}

.total-players .count {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
}

.total-players .warning {
    color: #f56c6c;
    font-size: 14px;
    display: block;
    margin-top: 4px;
  }

  .rule-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }

  .rule-hint {
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
  }

  .button-group {
  display: flex;
  gap: 12px;
}

.action-btn {
  flex: 1;
  height: 48px;
  font-size: 16px;
}

@media (min-width: 768px) {
  .title {
    font-size: 36px;
  }
  
  .card {
    padding: 32px;
  }
  
  .role-item {
    padding: 12px 16px;
  }
  
  .role-name {
    min-width: 50px;
  }
}
</style>