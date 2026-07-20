<template>
  <div class="host">
    <div class="container">
      <div class="header">
        <h1>🐺 管理员控制台</h1>
        <div class="day-info">第 {{ gameData.current_day }} 天</div>
        <div class="phase-badge" :class="gameData.phase">
          {{ phaseText }}
        </div>
      </div>
      
      <div class="timer-card card" v-if="currentTimer > 0 || timerMode !== 'none'">
        <div class="timer-header">
          <div class="timer-icon">{{ timerMode === 'night' ? '🌙' : timerMode === 'vote' ? '🗳️' : '🎤' }}</div>
          <div class="timer-title">{{ timerMode === 'night' ? '夜间行动' : timerMode === 'vote' ? '投票时间' : '发言时间' }}</div>
        </div>
        <div class="timer-display">{{ formatTime(currentTimer) }}</div>
        <div class="timer-settings">
          <div class="timer-setting-item">
            <span class="setting-label">设置时间：</span>
            <input type="number" class="setting-input" v-model.number="currentCountdown" min="1" max="600" @change="updateCountdownSetting" />
            <span class="setting-unit">秒</span>
          </div>
        </div>
        <div class="timer-controls">
          <button class="timer-btn" @click="startTimer">开始</button>
          <button class="timer-btn" @click="resetTimer">重置</button>
        </div>
      </div>
      
      <div class="key-card card">
        <div class="card-title toggle-title" @click="showKeys = !showKeys">
          🔑 玩家秘钥分配
          <span class="toggle-icon">{{ showKeys ? '▼' : '▶' }}</span>
        </div>
        <div v-if="showKeys" class="key-content">
          <div class="key-list">
            <div v-for="p in gameData.players" :key="p.player_num" class="key-item">
              <span class="key-player">{{ p.player_num }}号</span>
              <span class="key-role">{{ p.role_name }}</span>
              <span class="key-code">{{ p.key }}</span>
              <button class="copy-btn" @click="copyKey(p.key)">复制</button>
            </div>
          </div>
          <div class="key-tips">将秘钥发送给对应玩家，玩家输入秘钥即可进入游戏</div>
        </div>
      </div>
      
      <div class="main-layout">
        <div class="players-panel left-panel">
          <div class="panel-title">玩家列表</div>
          <div class="player-grid">
            <div 
              v-for="p in leftPlayers" 
              :key="p.player_num"
              class="player-circle"
              :class="{ dead: !p.alive }"
              @click="openPlayerMenu(p)"
            >
              <span class="circle-number">{{ p.player_num }}</span>
              <span class="role-badge" :class="getRoleClass(p.role)">{{ getRoleShortName(p.role) }}</span>
            </div>
          </div>
        </div>
        
        <div class="timeline-panel">
          <div class="panel-title">时间线</div>
          <div class="timeline-scroll">
            <div v-for="dayGroup in timelineData" :key="dayGroup.day" class="day-section">
              <div class="day-header">
                <span class="day-number">第{{ dayGroup.day }}天</span>
              </div>
              
              <div class="section-card" v-if="dayGroup.votes.length > 0">
                <div class="section-title">投票情况</div>
                <div class="vote-list">
                  <div v-for="(vote, index) in dayGroup.votes" :key="index" class="vote-item">
                    <span class="vote-voter">{{ vote.voter }}</span>
                    <span class="vote-arrow">→</span>
                    <span class="vote-target">{{ vote.target }}</span>
                  </div>
                </div>
              </div>
              
              <div class="section-card" v-if="dayGroup.actions.length > 0">
                <div class="section-title">玩家行动</div>
                <div class="action-list">
                  <div v-for="(action, index) in dayGroup.actions" :key="index" class="action-item" :class="action.type">
                    <span class="action-icon">{{ getActionIcon(action.type) }}</span>
                    <span class="action-content">{{ getActionText(action) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="section-card" v-if="dayGroup.checks.length > 0">
                <div class="section-title">查验结果</div>
                <div class="check-list">
                  <div v-for="(check, index) in dayGroup.checks" :key="index" class="check-item">
                    <span class="check-icon">🔮</span>
                    <span class="check-content">预言家{{ check.voter }}查验{{ check.target }}，身份为：{{ check.result }}</span>
                  </div>
                </div>
              </div>
              
              <div class="section-card" v-if="dayGroup.nightActions.length > 0">
                <div class="section-title">夜间行动</div>
                <div class="night-action-list">
                  <div v-for="(action, index) in dayGroup.nightActions" :key="index" class="night-action-item">
                    <span class="night-action-icon">{{ getNightActionIcon(action.action_type) }}</span>
                    <span class="night-action-content">{{ getNightActionText(action) }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="timelineData.length === 0" class="empty-timeline">
              暂无行动记录
            </div>
          </div>
        </div>
        
        <div class="players-panel right-panel">
          <div class="panel-title">玩家列表</div>
          <div class="player-grid">
            <div 
              v-for="p in rightPlayers" 
              :key="p.player_num"
              class="player-circle"
              :class="{ dead: !p.alive }"
              @click="openPlayerMenu(p)"
            >
              <span class="circle-number">{{ p.player_num }}</span>
              <span class="role-badge" :class="getRoleClass(p.role)">{{ getRoleShortName(p.role) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-title">操作控制</div>
        <div class="control-buttons">
          <el-button v-if="gameData.phase === 'waiting'" type="primary" @click="startVote" class="control-btn">开始投票</el-button>
          <el-button v-if="gameData.phase === 'voting'" type="warning" @click="endVote" class="control-btn">结束投票</el-button>
          <el-button v-if="gameData.phase === 'waiting'" type="danger" @click="enterNight" class="control-btn">进入夜间</el-button>
          <el-button v-if="gameData.phase === 'night'" type="success" @click="endNight" class="control-btn">结束夜间</el-button>
          <el-button v-if="gameData.phase === 'waiting'" @click="startSpeech" class="control-btn">开始发言</el-button>
          <el-button v-if="gameData.speech_active" type="warning" @click="stopSpeech" class="control-btn">停止发言</el-button>
          <el-button v-if="gameData.phase === 'waiting'" type="danger" @click="resetGame" class="control-btn">结束本局</el-button>
        </div>
      </div>
      
      <div class="card danger-card">
        <div class="card-title">⚠️ 危险操作</div>
        <div class="control-buttons">
          <el-button type="danger" @click="confirmDestroyRoom" class="control-btn destroy-btn">销毁房间</el-button>
        </div>
        <div class="danger-tip">销毁房间将删除所有相关数据，此操作不可撤销！</div>
      </div>
    </div>
    
    <div class="modal-overlay" v-if="showPlayerMenu" @click="closePlayerMenu">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span class="modal-player-icon">{{ selectedPlayer?.role_icon }}</span>
          <span class="modal-player-name">{{ selectedPlayer?.player_num }}号</span>
          <span class="modal-player-role">{{ selectedPlayer?.role_name }}</span>
        </div>
        <div class="modal-body">
          <button class="modal-btn eliminate-btn" @click="eliminatePlayer">
            ⚔️ 淘汰
          </button>
          <button 
            class="modal-btn self-destruct-btn" 
            @click="selfDestructPlayer"
            :disabled="selectedPlayer?.team !== 'werewolf'"
          >
            💥 自爆
          </button>
          <button 
            class="modal-btn revive-btn" 
            @click="revivePlayer"
            :disabled="selectedPlayer?.alive"
          >
            💚 复活
          </button>
        </div>
        <button class="modal-close" @click="closePlayerMenu">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../supabase'

const route = useRoute()
const router = useRouter()

const roomId = ref('')
const showKeys = ref(false)
const showPlayerMenu = ref(false)
const selectedPlayer = ref(null)
const gameData = ref({
  players: [],
  current_day: 1,
  phase: 'waiting',
  pk_mode: 'normal',
  pk_targets: [],
  vote_timer: 0,
  vote_countdown: 10,
  night_timer: 0,
  night_countdown: 120,
  speech_timer: 0,
  speech_countdown: 180,
  speech_active: false,
  witch_self_save: false
})
const votesData = ref([])
const checkResultsData = ref([])
const dailyActionsData = ref([])
const nightActionsData = ref([])
const currentTimer = ref(0)
const timerMode = ref('none')
const currentCountdown = ref(15)

let pollInterval = null
let countdownInterval = null

const phaseText = computed(() => {
  const phase = gameData.value.phase
  if (phase === 'waiting') return '等待中'
  if (phase === 'voting') return '投票中'
  if (phase === 'pk') return 'PK投票'
  if (phase === 'night') return '夜间行动'
  return phase
})

const leftPlayers = computed(() => {
  const players = gameData.value.players
  const mid = Math.ceil(players.length / 2)
  return players.slice(0, mid)
})

const rightPlayers = computed(() => {
  const players = gameData.value.players
  const mid = Math.ceil(players.length / 2)
  return players.slice(mid)
})

const timelineData = computed(() => {
  const days = {}
  
  for (let day = 1; day <= gameData.value.current_day; day++) {
    days[day] = {
      day,
      votes: [],
      actions: [],
      checks: [],
      nightActions: []
    }
  }
  
  for (const vote of votesData.value) {
    if (days[vote.day]) {
      days[vote.day].votes.push({
        voter: vote.voter,
        target: vote.target === 'abstain' ? '弃票' : vote.target
      })
    }
  }
  
  for (const action of dailyActionsData.value) {
    if (days[action.day]) {
      days[action.day].actions.push(action)
    }
  }
  
  for (const check of checkResultsData.value) {
    if (days[check.day]) {
      days[check.day].checks.push(check)
    }
  }
  
  for (const action of nightActionsData.value) {
    if (days[action.day]) {
      days[action.day].nightActions.push(action)
    }
  }
  
  return Object.values(days).reverse()
})

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getActionIcon = (type) => {
  if (type === 'eliminate') return '⚔️'
  if (type === 'self_destruct') return '💥'
  return '📝'
}

const getActionText = (action) => {
  if (action.type === 'eliminate') {
    return `${action.player}被${action.reason}`
  }
  if (action.type === 'self_destruct') {
    return `${action.player}（${action.role}）自爆出局`
  }
  return `${action.player}：${action.reason}`
}

const getNightActionIcon = (type) => {
  if (type === 'kill') return '🗡️'
  if (type === 'save') return '💚'
  if (type === 'poison') return '💀'
  if (type === 'guard') return '🛡️'
  if (type === 'check') return '🔮'
  return '🌙'
}

const getNightActionText = (action) => {
  const roleNames = {
    werewolf: '狼人',
    wolf_king: '狼王',
    white_wolf: '白狼王',
    mechanical_wolf: '机械狼',
    wolf_beauty: '狼美人',
    witch: '女巫',
    guard: '守卫',
    seer: '预言家'
  }
  
  const actorName = roleNames[action.role] || action.role
  if (action.action_type === 'kill') {
    return `${actorName}击杀${action.target_player_num}号`
  }
  if (action.action_type === 'save') {
    return `女巫使用解药救${action.target_player_num}号`
  }
  if (action.action_type === 'poison') {
    return `女巫使用毒药毒${action.target_player_num}号`
  }
  if (action.action_type === 'guard') {
    return `守卫守护${action.target_player_num}号`
  }
  if (action.action_type === 'check') {
    return `预言家查验${action.target_player_num}号，身份为：${action.result}`
  }
  return `${actorName}夜间行动`
}

const getRoleShortName = (role) => {
  const roleMap = {
    werewolf: '狼',
    wolf_king: '狼王',
    white_wolf: '白狼',
    mechanical_wolf: '机狼',
    wolf_beauty: '狼美',
    seer: '预',
    witch: '巫',
    hunter: '猎',
    guard: '守',
    knight: '骑',
    medium: '灵',
    idiot: '愚',
    villager: '平'
  }
  return roleMap[role] || role
}

const getRoleClass = (role) => {
  if (role.includes('wolf')) return 'role-wolf'
  if (['seer', 'witch', 'hunter', 'guard', 'knight', 'medium', 'idiot'].includes(role)) return 'role-god'
  return 'role-villager'
}

const loadGameData = async () => {
  try {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId.value)
      .single()
    
    if (roomError || !room) {
      console.error('房间不存在')
      return
    }
    
    gameData.value = {
      players: [],
      current_day: 1,
      phase: 'waiting',
      pk_mode: 'normal',
      pk_targets: [],
      vote_timer: 0,
      vote_countdown: 10,
      night_timer: 0,
      night_countdown: 120,
      speech_timer: 0,
      speech_countdown: 180,
      speech_active: false,
      witch_self_save: false,
      ...room
    }
    
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId.value)
      .order('player_num')
    
    if (!playersError && players) {
      gameData.value.players = players
    }
    
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId.value)
    if (votesError && votesError.code !== '404') console.warn('votes query error:', votesError)
    if (!votesError && votes) votesData.value = votes
    
    const { data: checks, error: checksError } = await supabase
      .from('check_results')
      .select('*')
      .eq('room_id', roomId.value)
    if (checksError && checksError.code !== '404') console.warn('check_results query error:', checksError)
    if (!checksError && checks) checkResultsData.value = checks
    
    const { data: actions, error: actionsError } = await supabase
      .from('daily_actions')
      .select('*')
      .eq('room_id', roomId.value)
    if (actionsError && actionsError.code !== '404') console.warn('daily_actions query error:', actionsError)
    if (!actionsError && actions) dailyActionsData.value = actions
    
    const { data: nightActions, error: nightActionsError } = await supabase
      .from('night_actions')
      .select('*')
      .eq('room_id', roomId.value)
    if (nightActionsError && nightActionsError.code !== '404') console.warn('night_actions query error:', nightActionsError)
    if (!nightActionsError && nightActions) nightActionsData.value = nightActions
    
    updateCountdown()
  } catch (error) {
    console.error('加载游戏数据失败:', error)
  }
}

const updateCountdown = () => {
  if (gameData.value.phase === 'voting') {
    timerMode.value = 'vote'
    const elapsed = Date.now() / 1000 - gameData.value.vote_timer
    const newTimer = Math.max(0, Math.ceil(gameData.value.vote_countdown - elapsed))
    if (currentTimer.value > 0 && newTimer === 0) {
      endVote()
    }
    currentTimer.value = newTimer
  } else if (gameData.value.phase === 'night') {
    timerMode.value = 'night'
    const elapsed = Date.now() / 1000 - gameData.value.night_timer
    const newTimer = Math.max(0, Math.ceil(gameData.value.night_countdown - elapsed))
    if (currentTimer.value > 0 && newTimer === 0) {
      endNight()
    }
    currentTimer.value = newTimer
  } else if (gameData.value.speech_active) {
    timerMode.value = 'speech'
    const elapsed = Date.now() / 1000 - gameData.value.speech_timer
    currentTimer.value = Math.max(0, Math.ceil(gameData.value.speech_countdown - elapsed))
  } else {
    timerMode.value = 'none'
    currentTimer.value = 0
  }
  
  if (timerMode.value === 'vote') {
    currentCountdown.value = gameData.value.vote_countdown
  } else if (timerMode.value === 'night') {
    currentCountdown.value = gameData.value.night_countdown
  } else if (timerMode.value === 'speech') {
    currentCountdown.value = gameData.value.speech_countdown
  }
}

const updateCountdownSetting = async () => {
  try {
    if (timerMode.value === 'vote') {
      await supabase.from('rooms').update({
        vote_countdown: currentCountdown.value
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'night') {
      await supabase.from('rooms').update({
        night_countdown: currentCountdown.value
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'speech') {
      await supabase.from('rooms').update({
        speech_countdown: currentCountdown.value
      }).eq('id', roomId.value)
    }
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const adjustNightTime = async (delta) => {
  const newTime = Math.max(30, gameData.value.night_countdown + delta)
  try {
    await supabase.from('rooms').update({
      night_countdown: newTime
    }).eq('id', roomId.value)
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const adjustSpeechTime = async (delta) => {
  const newTime = Math.max(30, gameData.value.speech_countdown + delta)
  try {
    await supabase.from('rooms').update({
      speech_countdown: newTime
    }).eq('id', roomId.value)
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const startTimer = async () => {
  try {
    if (timerMode.value === 'vote') {
      await supabase.from('rooms').update({
        vote_timer: Math.floor(Date.now() / 1000)
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'night') {
      await supabase.from('rooms').update({
        night_timer: Math.floor(Date.now() / 1000)
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'speech') {
      await supabase.from('rooms').update({
        speech_timer: Math.floor(Date.now() / 1000)
      }).eq('id', roomId.value)
    }
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resetTimer = async () => {
  try {
    if (timerMode.value === 'vote') {
      await supabase.from('rooms').update({
        vote_timer: 0
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'night') {
      await supabase.from('rooms').update({
        night_timer: 0
      }).eq('id', roomId.value)
    } else if (timerMode.value === 'speech') {
      await supabase.from('rooms').update({
        speech_timer: 0
      }).eq('id', roomId.value)
    }
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const startVote = async () => {
  try {
    const { error } = await supabase.from('rooms').update({
      phase: 'voting',
      vote_timer: Math.floor(Date.now() / 1000),
      vote_countdown: 10
    }).eq('id', roomId.value)
    
    if (error) throw error
    
    await supabase.from('players').update({
      has_voted: false,
      vote_target: null
    }).eq('room_id', roomId.value)
    
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const endVote = async () => {
  try {
    const { error } = await supabase.from('rooms').update({
      phase: 'waiting'
    }).eq('id', roomId.value)
    
    if (error) throw error
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const enterNight = async () => {
  try {
    const { error } = await supabase.from('rooms').update({
      phase: 'night',
      night_timer: Math.floor(Date.now() / 1000),
      night_countdown: gameData.value.night_countdown
    }).eq('id', roomId.value)
    
    if (error) throw error
    
    await supabase.from('players').update({
      guard_last_night: false
    }).eq('room_id', roomId.value).eq('role', 'guard')
    
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const endNight = async () => {
  try {
    await resolveNightActions()
    
    const { error } = await supabase.from('rooms').update({
      phase: 'waiting',
      current_day: gameData.value.current_day + 1
    }).eq('id', roomId.value)
    
    if (error) throw error
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resolveNightActions = async () => {
  const { data: nightActions, error } = await supabase
    .from('night_actions')
    .select('*')
    .eq('room_id', roomId.value)
    .eq('day', gameData.value.current_day)
  
  if (error || !nightActions) return
  
  const killTargets = {}
  const saveTargets = new Set()
  const poisonTargets = new Set()
  const guardTargets = new Set()
  
  for (const action of nightActions) {
    if (action.action_type === 'kill' && action.target_player_num) {
      killTargets[action.target_player_num] = (killTargets[action.target_player_num] || 0) + 1
    } else if (action.action_type === 'save' && action.target_player_num) {
      saveTargets.add(action.target_player_num)
    } else if (action.action_type === 'poison' && action.target_player_num) {
      poisonTargets.add(action.target_player_num)
    } else if (action.action_type === 'guard' && action.target_player_num) {
      guardTargets.add(action.target_player_num)
    }
  }
  
  const deadPlayers = []
  
  for (const [targetNum, count] of Object.entries(killTargets)) {
    const num = parseInt(targetNum)
    const isSaved = saveTargets.has(num)
    const isGuarded = guardTargets.has(num)
    
    if (!isSaved && !isGuarded) {
      deadPlayers.push(num)
    }
    
    if (isSaved && isGuarded) {
      deadPlayers.push(num)
    }
  }
  
  for (const num of poisonTargets) {
    deadPlayers.push(num)
  }
  
  const uniqueDead = [...new Set(deadPlayers)]
  
  for (const num of uniqueDead) {
    const player = gameData.value.players.find(p => p.player_num === num)
    if (player && player.alive) {
      await supabase.from('players').update({
        alive: false
      }).eq('room_id', roomId.value).eq('player_num', num)
      
      await supabase.from('daily_actions').insert({
        room_id: roomId.value,
        day: gameData.value.current_day,
        type: 'eliminate',
        player: `${num}号`,
        role: player.role_name,
        reason: '夜间死亡'
      })
    }
  }
}

const startSpeech = async () => {
  try {
    const { error } = await supabase.from('rooms').update({
      speech_active: true,
      speech_timer: Math.floor(Date.now() / 1000),
      speech_countdown: gameData.value.speech_countdown
    }).eq('id', roomId.value)
    
    if (error) throw error
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const stopSpeech = async () => {
  try {
    const { error } = await supabase.from('rooms').update({
      speech_active: false
    }).eq('id', roomId.value)
    
    if (error) throw error
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const nextDay = async () => {
  try {
    const newDay = gameData.value.current_day + 1
    const { error } = await supabase.from('rooms').update({
      current_day: newDay,
      phase: 'waiting'
    }).eq('id', roomId.value)
    
    if (error) throw error
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resetGame = async () => {
  if (!confirm('确定要结束本局并重新开始吗？身份将重新分配。')) return
  
  try {
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('player_num, key')
      .eq('room_id', roomId.value)
      .order('player_num')
    
    if (playersError) throw playersError
    
    const roleConfig = {
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
      villager: players.length - 6
    }
    
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
    
    const rolesList = []
    werewolfRoles.concat(godRoles, villagerRoles).forEach(role => {
      for (let i = 0; i < roleConfig[role.id]; i++) {
        rolesList.push({
          role_id: role.id,
          role_name: role.name,
          role_icon: role.icon,
          team: role.team
        })
      }
    })
    
    for (let i = rolesList.length; i < players.length; i++) {
      rolesList.push({
        role_id: 'villager',
        role_name: '平民',
        role_icon: '👨‍🌾',
        team: 'villager'
      })
    }
    
    for (let i = rolesList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rolesList[i], rolesList[j]] = [rolesList[j], rolesList[i]]
    }
    
    for (let i = 0; i < players.length; i++) {
      const { error } = await supabase.from('players').update({
        role: rolesList[i].role_id,
        role_name: rolesList[i].role_name,
        role_icon: rolesList[i].role_icon,
        team: rolesList[i].team,
        alive: true,
        has_voted: false,
        vote_target: null,
        witch_potion: 2,
        guard_last_night: false
      }).eq('room_id', roomId.value).eq('player_num', players[i].player_num)
      
      if (error) throw error
    }
    
    const { error: roomError } = await supabase.from('rooms').update({
      current_day: 1,
      phase: 'waiting',
      pk_mode: 'normal',
      pk_targets: [],
      speech_active: false
    }).eq('id', roomId.value)
    
    if (roomError) throw roomError
    
    await supabase.from('votes').delete().eq('room_id', roomId.value)
    await supabase.from('check_results').delete().eq('room_id', roomId.value)
    await supabase.from('daily_actions').delete().eq('room_id', roomId.value)
    await supabase.from('night_actions').delete().eq('room_id', roomId.value)
    
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const confirmDestroyRoom = async () => {
  if (!confirm('⚠️ 警告：此操作将永久销毁房间及所有相关数据！')) return
  if (!confirm('❌ 再次确认：销毁后无法恢复，确定要继续吗？')) return
  
  try {
    await supabase.from('votes').delete().eq('room_id', roomId.value)
    await supabase.from('check_results').delete().eq('room_id', roomId.value)
    await supabase.from('daily_actions').delete().eq('room_id', roomId.value)
    await supabase.from('night_actions').delete().eq('room_id', roomId.value)
    await supabase.from('players').delete().eq('room_id', roomId.value)
    await supabase.from('rooms').delete().eq('id', roomId.value)
    
    alert('房间已成功销毁')
    router.push('/')
  } catch (error) {
    alert('销毁失败：' + error.message)
  }
}

const copyKey = async (key) => {
  try {
    await navigator.clipboard.writeText(key)
    alert('秘钥已复制到剪贴板')
  } catch (error) {
    const input = document.createElement('input')
    input.value = key
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('秘钥已复制到剪贴板')
  }
}

const openPlayerMenu = (player) => {
  selectedPlayer.value = player
  showPlayerMenu.value = true
}

const closePlayerMenu = () => {
  showPlayerMenu.value = false
  selectedPlayer.value = null
}

const eliminatePlayer = async () => {
  if (!selectedPlayer.value) return
  
  const reason = prompt('请输入淘汰原因（默认：投票淘汰）：', '投票淘汰') || '投票淘汰'
  
  try {
    const { error } = await supabase.from('players').update({
      alive: false
    }).eq('room_id', roomId.value).eq('player_num', selectedPlayer.value.player_num)
    
    if (error) throw error
    
    await supabase.from('daily_actions').insert({
      room_id: roomId.value,
      day: gameData.value.current_day,
      type: 'eliminate',
      player: `${selectedPlayer.value.player_num}号`,
      role: selectedPlayer.value.role_name,
      reason: reason
    })
    
    await loadGameData()
    closePlayerMenu()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const selfDestructPlayer = async () => {
  if (!selectedPlayer.value) return
  
  try {
    const { error } = await supabase.from('players').update({
      alive: false
    }).eq('room_id', roomId.value).eq('player_num', selectedPlayer.value.player_num)
    
    if (error) throw error
    
    await supabase.from('daily_actions').insert({
      room_id: roomId.value,
      day: gameData.value.current_day,
      type: 'self_destruct',
      player: `${selectedPlayer.value.player_num}号`,
      role: selectedPlayer.value.role_name,
      reason: '自爆出局'
    })
    
    await loadGameData()
    closePlayerMenu()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const revivePlayer = async () => {
  if (!selectedPlayer.value) return
  
  try {
    const { error } = await supabase.from('players').update({
      alive: true
    }).eq('room_id', roomId.value).eq('player_num', selectedPlayer.value.player_num)
    
    if (error) throw error
    await loadGameData()
    closePlayerMenu()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

onMounted(() => {
  roomId.value = route.params.roomId || route.query.room
  
  if (!roomId.value) {
    router.push('/')
    return
  }
  
  loadGameData()
  
  pollInterval = setInterval(loadGameData, 2000)
  
  countdownInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style scoped>
.host {
  min-height: 100vh;
  padding: 16px;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  color: #fff;
  font-size: 24px;
  margin-bottom: 8px;
}

.day-info {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin-bottom: 8px;
}

.phase-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.phase-badge.waiting { background: #909399; color: #fff; }
.phase-badge.voting { background: #409eff; color: #fff; }
.phase-badge.pk { background: #e6a23c; color: #fff; }
.phase-badge.night { background: #9b59b6; color: #fff; }

.timer-card {
  text-align: center;
  padding: 20px;
}

.timer-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.timer-icon {
  font-size: 24px;
}

.timer-title {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.timer-display {
  font-size: 48px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 16px;
  font-family: 'Courier New', monospace;
}

.timer-card .timer-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.timer-card .timer-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.timer-card .timer-btn:first-child {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.timer-card .timer-btn:last-child {
  background: linear-gradient(135deg, #f56c6c 0%, #e6a23c 100%);
  color: #fff;
}

.timer-settings {
  margin: 12px 0;
  display: flex;
  justify-content: center;
}

.timer-setting-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.setting-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  text-align: center;
}

.setting-input:focus {
  outline: none;
  border-color: #667eea;
}

.setting-unit {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-title {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 12px;
}

.toggle-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.toggle-icon {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.key-content {
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.key-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.key-player {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  min-width: 50px;
}

.key-role {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  min-width: 50px;
}

.key-code {
  flex: 1;
  color: #409eff;
  font-family: monospace;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
}

.copy-btn {
  padding: 6px 14px;
  background: #409eff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.key-tips {
  margin-top: 12px;
  padding: 10px;
  background: rgba(64, 158, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  text-align: center;
}

.timer-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.timer-group {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.timer-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.timer-display {
  color: #fff;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 12px;
}

.timer-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.timer-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.3s;
}

.timer-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}

.main-layout {
  display: grid;
  grid-template-columns: 90px 1fr 90px;
  grid-template-rows: minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  height: 500px;
  overflow: hidden;
}

.players-panel {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 12px 8px;
  overflow: hidden;
  min-height: 0;
}

.panel-title {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 12px;
  text-align: center;
}

.player-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.player-circle {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.player-circle:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
}

.player-circle.dead {
  opacity: 0.4;
  background: rgba(255, 255, 255, 0.05);
}

.player-circle.dead .circle-number {
  text-decoration: line-through;
}

.circle-number {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
}

.role-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.role-wolf {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.role-god {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.role-villager {
  background: linear-gradient(135deg, #27ae60, #219653);
}

.timeline-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  overflow: hidden;
}

.timeline-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.timeline-scroll::-webkit-scrollbar {
  width: 6px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.day-section {
  margin-bottom: 20px;
}

.day-header {
  background: rgba(64, 158, 255, 0.2);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
}

.day-number {
  color: #fff;
  font-size: 16px;
  font-weight: bold;
}

.section-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}

.section-title {
  color: #409eff;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.vote-list,
.action-list,
.check-list,
.night-action-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vote-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.vote-voter {
  color: #fff;
  font-weight: bold;
}

.vote-arrow {
  color: rgba(255, 255, 255, 0.5);
}

.vote-target {
  color: #e6a23c;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  border-left: 4px solid #67c23a;
}

.action-item.eliminate {
  border-left-color: #f56c6c;
}

.action-item.self_destruct {
  border-left-color: #e6a23c;
}

.action-icon {
  font-size: 14px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  border-left: 4px solid #9b59b6;
}

.check-icon {
  font-size: 14px;
}

.night-action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  border-left: 4px solid #9b59b6;
}

.night-action-icon {
  font-size: 14px;
}

.empty-timeline {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 40px;
}

.control-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.control-btn {
  height: 44px;
  font-size: 14px;
}

.danger-card {
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
}

.danger-card .card-title {
  color: #ff4d4f;
}

.destroy-btn {
  background: linear-gradient(135deg, #ff4d4f, #ff7875);
  border: none;
}

.destroy-btn:hover {
  background: linear-gradient(135deg, #d9363e, #ff4d4f) !important;
}

.danger-tip {
  text-align: center;
  color: rgba(255, 77, 79, 0.7);
  font-size: 12px;
  margin-top: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: rgba(30, 30, 50, 0.95);
  border-radius: 20px;
  padding: 24px;
  width: 90%;
  max-width: 320px;
  text-align: center;
}

.modal-header {
  margin-bottom: 20px;
}

.modal-player-icon {
  font-size: 40px;
  margin-right: 10px;
}

.modal-player-name {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  margin-right: 10px;
}

.modal-player-role {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.modal-btn {
  padding: 14px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.modal-btn:active {
  transform: scale(0.98);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.eliminate-btn {
  background: #f56c6c;
  color: #fff;
}

.self-destruct-btn {
  background: #e6a23c;
  color: #fff;
}

.revive-btn {
  background: #67c23a;
  color: #fff;
}

.modal-close {
  padding: 12px 30px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    grid-template-rows: minmax(0, 1fr);
    gap: 8px;
    margin-bottom: 16px;
    height: 400px;
    overflow: hidden;
  }
  
  .players-panel {
    width: auto;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 12px;
    padding: 8px 4px;
    overflow: hidden;
  }
  
  .players-panel.left-panel,
  .players-panel.right-panel {
    order: initial;
    width: auto;
  }
  
  .players-panel.right-panel {
    display: block;
  }
  
  .player-grid {
    gap: 8px;
  }
  
  .player-circle {
    width: 45px;
    height: 45px;
  }
  
  .circle-number {
    font-size: 18px;
  }
  
  .role-badge {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
  
  .panel-title {
    font-size: 12px;
    margin-bottom: 8px;
  }
  
  .timeline-panel {
    flex: initial;
    order: initial;
  }
  
  .timeline-scroll {
    overflow-y: auto;
  }
  
  .header h1 {
    font-size: 18px;
  }
  
  .day-info {
    font-size: 13px;
  }
  
  .card {
    padding: 10px;
  }
  
  .card-title {
    font-size: 14px;
  }
  
  .control-btn {
    height: 36px;
    font-size: 12px;
  }
  
  .countdown-number {
    font-size: 24px;
  }
  
  .timer-controls {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  
  .timer-group {
    padding: 8px;
  }
  
  .timer-display {
    font-size: 20px;
  }
}
</style>