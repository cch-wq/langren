<template>
  <div class="create-room">
    <div class="header">
      <h1>创建房间</h1>
      <p>配置游戏角色</p>
    </div>

    <div class="panel">
      <div class="form-group">
        <label>创建密码</label>
        <input type="password" v-model="form.password" placeholder="请输入密码" />
      </div>

      <div class="section">
        <div class="section-title">狼人阵营</div>
        <div class="roles-list">
          <div class="role-item" v-for="role in werewolfRoles" :key="role.id">
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name">{{ role.name }}</span>
            <input type="number" v-model.number="form.roles[role.id]" min="0" max="10" />
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">神职阵营</div>
        <div class="roles-list">
          <div class="role-item" v-for="role in godRoles" :key="role.id">
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name">{{ role.name }}</span>
            <input type="number" v-model.number="form.roles[role.id]" min="0" max="10" />
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">平民阵营</div>
        <div class="roles-list">
          <div class="role-item" v-for="role in villagerRoles" :key="role.id">
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-name">{{ role.name }}</span>
            <input type="number" v-model.number="form.roles[role.id]" min="0" max="20" />
          </div>
        </div>
      </div>

      <div class="total-row">
        <span>总人数</span>
        <span class="total-num">{{ totalPlayers }}</span>
        <span v-if="totalPlayers < 3" class="warning">至少3人</span>
      </div>

      <div class="section">
        <div class="section-title">规则设置</div>
        <div class="rule-item">
          <input type="checkbox" v-model="form.witchSelfSave" />
          <label>女巫可以自救</label>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn primary" @click="createRoom" :disabled="totalPlayers < 3">创建房间</button>
        <button class="btn" @click="goBack">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()

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

const totalPlayers = computed(() => Object.values(form.roles).reduce((sum, val) => sum + val, 0))

const generateRoomId = () => Math.floor(100 + Math.random() * 900).toString()
const generatePlayerKey = () => Math.floor(100000 + Math.random() * 900000).toString()

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

  try {
    const authRes = await api.verifyAuth('create', form.password)
    if (!authRes.valid) {
      alert('密码错误')
      return
    }
  } catch (err) {
    alert('密码验证失败: ' + err.message)
    return
  }

  try {
    const roomId = generateRoomId()

    const roomData = {
      id: roomId,
      current_day: 0,
      phase: 'waiting',
      pk_mode: 'normal',
      pk_targets: [],
      vote_timer: 0,
      vote_countdown: 15,
      night_timer: 0,
      night_countdown: 90,
      speech_timer: 0,
      speech_countdown: 120,
      speech_active: false,
      witch_self_save: form.witchSelfSave
    }

    try {
      await api.createRoom(roomData)
    } catch (err) {
      alert('创建房间失败：' + err.message)
      return
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
      vote_target: null,
      guard_last_night: false,
      guard_last_target: null
    }))

    try {
      await api.insertPlayers(players)
    } catch (err) {
      await api.deleteRoom(roomId)
      alert('创建玩家失败：' + err.message)
      return
    }

    router.push(`/host/${roomId}`)
  } catch (error) {
    alert('创建失败：' + (error?.message || '未知错误'))
  }
}

const goBack = () => router.push('/')
</script>

<style scoped>
.create-room {
  min-height: 100vh;
  padding: 12px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 22px;
  margin: 0 0 6px 0;
}

.header p {
  font-size: 13px;
  color: #999;
}

.panel {
  padding: 16px;
  border-radius: 8px;
  background: #242424;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  height: 38px;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 14px;
  background: #1a1a1a;
  color: #fff;
}

.section {
  margin-bottom: 14px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.roles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #1a1a1a;
}

.role-icon {
  font-size: 16px;
}

.role-name {
  font-size: 13px;
  min-width: 36px;
}

.role-item input {
  width: 45px;
  height: 28px;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 0 4px;
  text-align: center;
  font-size: 13px;
  background: #242424;
  color: #fff;
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  background: rgba(64, 158, 255, 0.1);
  margin-bottom: 14px;
}

.total-num {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.warning {
  color: #f56c6c;
  font-size: 11px;
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: #1a1a1a;
}

.btn-group {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary {
  background: #409eff;
  color: #fff;
}

.btn:not(.primary) {
  background: #444;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
