<template>
  <div class="game">
    <div class="container">
      <div class="header">
        <h1>🐺 狼人杀</h1>
        <div class="day-info">第 {{ gameData.current_day }} 天</div>
        <div class="phase-badge" :class="gameData.phase">
          {{ phaseText }}
        </div>
      </div>
      
      <div class="night-bar" v-if="gameData.phase === 'night' && countdown > 0">
        <div class="countdown-number">{{ countdown }}</div>
        <div class="countdown-text">夜间行动中...</div>
      </div>
      
      <div class="role-card">
        <div class="role-icon">{{ currentPlayer?.role_icon }}</div>
        <div class="role-info">
          <div class="role-name">{{ currentPlayer?.role_name }}</div>
          <div class="role-team">{{ teamText }}</div>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="card-title">所有玩家</div>
          <div class="night-hint" v-if="isSeer && gameData.phase === 'night' && !hasCheckedThisNight">
            请选择你要查验的玩家：
          </div>
          <div class="pk-hint" v-if="gameData.phase === 'pk' && gameData.pk_targets.length > 0">
            当前为 PK 投票，仅可投票给：{{ gameData.pk_targets.join('、') }}
          </div>
        </div>
        <div class="players-grid">
          <div 
            v-for="p in gameData.players" 
            :key="p.player_num"
            class="player-avatar"
            :class="{
              'dead': !p.alive,
              'self': isSelf(p),
              'wolf-teammate': isWerewolf && p.team === 'werewolf',
              'can-vote': canVote(p),
              'can-check': canCheck(p),
              'selected': selectedTarget === p.player_num,
              'checked': checkTarget === p.player_num
            }"
            @click="handlePlayerClick(p)"
          >
            <span class="player-number">{{ isSelf(p) ? '我' : p.player_num }}</span>
            <span v-if="annotations[p.player_num]" class="annotation" :class="annotationClass(p.player_num)">
              {{ annotations[p.player_num] }}
            </span>
          </div>
        </div>
        
        <div class="actions" v-if="showVoteButton || showCheckButton || currentPlayer?.has_voted">
          <el-button v-if="showVoteButton" type="primary" @click="confirmVote" class="action-btn">确认投票</el-button>
          <el-button v-if="showVoteButton" @click="abstainVote" class="action-btn">弃票</el-button>
          <el-button v-if="showCheckButton" type="primary" @click="confirmCheck" class="action-btn">确认查验</el-button>
          <div v-if="currentPlayer?.has_voted" class="voted-message">✓ 已完成投票</div>
        </div>
      </div>
      
      <div class="card" v-if="timelineData.length > 0">
        <div class="card-title">投票结果</div>
        <div class="timeline-scroll">
          <div v-for="dayGroup in timelineData" :key="dayGroup.day" class="day-section">
            <div class="day-header">
              <span class="day-number">第{{ dayGroup.day }}天</span>
            </div>
            <div v-if="dayGroup.votes.length > 0" class="vote-list">
              <div v-for="(vote, index) in dayGroup.votes" :key="index" class="vote-item">
                <span class="vote-voter">{{ vote.voter }}</span>
                <span class="vote-arrow">→</span>
                <span class="vote-target">{{ vote.target }}</span>
              </div>
            </div>
            <div v-if="dayGroup.votes.length === 0" class="empty-vote">
              暂无投票记录
            </div>
          </div>
        </div>
      </div>
      
      <div class="card" v-if="checkResults.length > 0">
        <div class="card-title">查验结果</div>
        <div class="skill-results">
          <div v-for="(result, index) in checkResults" :key="index" class="skill-item">
            预言家{{ result.voter }}查验{{ result.target }}，身份为：{{ result.result }}
          </div>
        </div>
      </div>
      
      <div class="card" v-if="playerActions.length > 0">
        <div class="card-title">我的行动记录</div>
        <div class="action-results">
          <div v-for="(action, index) in playerActions" :key="index" class="action-item" :class="action.type">
            <span class="action-icon">{{ getActionIcon(action.type) }}</span>
            <span class="action-content">{{ getActionText(action) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../supabase'

const roomId = ref('')
const secretKey = ref('')
const isInitialized = ref(false)
const gameData = ref({
  players: [],
  current_day: 1,
  phase: 'waiting',
  pk_mode: 'normal',
  pk_targets: [],
  vote_timer: 0,
  vote_countdown: 10,
  night_timer: 0,
  night_countdown: 60
})
const currentPlayer = ref(null)
const selectedTarget = ref(null)
const checkTarget = ref(null)
const hasCheckedThisNight = ref(false)
const annotations = ref({})
const countdown = ref(0)
const votesData = ref([])
const checkResultsData = ref([])
const dailyActionsData = ref([])

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

const isSeer = computed(() => currentPlayer.value?.role === 'seer')
const isWerewolf = computed(() => currentPlayer.value?.team === 'werewolf')

const teamText = computed(() => {
  const team = currentPlayer.value?.team
  if (team === 'werewolf') return '狼人阵营'
  if (team === 'god') return '神职阵营'
  return '平民阵营'
})

const showVoteButton = computed(() => {
  return gameData.value.phase === 'voting' && 
         currentPlayer.value?.alive && 
         !currentPlayer.value?.has_voted
})

const showCheckButton = computed(() => {
  return gameData.value.phase === 'night' && 
         isSeer.value && 
         currentPlayer.value?.alive && 
         hasCheckedThisNight.value === false &&
         checkTarget.value
})

const timelineData = computed(() => {
  const days = {}
  
  for (let day = 1; day <= gameData.value.current_day; day++) {
    days[day] = {
      day,
      votes: []
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
  
  return Object.values(days).reverse()
})

const checkResults = computed(() => {
  return checkResultsData.value
})

const playerActions = computed(() => {
  const actions = dailyActionsData.value || []
  return actions.filter(action => action.player === `${currentPlayer.value?.player_num}号`)
})

const isSelf = (p) => p.key === secretKey.value

const canVote = (p) => {
  if (!isSelf(p) && 
      gameData.value.phase === 'voting' && 
      currentPlayer.value?.alive && 
      !currentPlayer.value?.has_voted && 
      p.alive) {
    if (gameData.value.pk_mode === 'pk') {
      return gameData.value.pk_targets.includes(`${p.player_num}号`)
    }
    return true
  }
  return false
}

const canCheck = (p) => {
  return !isSelf(p) && 
         gameData.value.phase === 'night' && 
         isSeer.value && 
         currentPlayer.value?.alive && 
         p.alive && 
         hasCheckedThisNight.value === false
}

const annotationClass = (num) => {
  const val = annotations.value[num]
  if (val === '金') return 'annotation-gold'
  if (val === '狼') return 'annotation-wolf'
  return ''
}

const getActionIcon = (type) => {
  if (type === 'eliminate') return '⚔️'
  if (type === 'self_destruct') return '💥'
  return '📝'
}

const getActionText = (action) => {
  if (action.type === 'eliminate') {
    return `第${action.day}天：你（${action.role}）被${action.reason}`
  }
  if (action.type === 'self_destruct') {
    return `第${action.day}天：你（${action.role}）自爆出局`
  }
  return `第${action.day}天：${action.reason}`
}

const handlePlayerClick = (p) => {
  if (canVote(p)) {
    selectedTarget.value = p.player_num
  } else if (canCheck(p)) {
    checkTarget.value = p.player_num
  }
}

const confirmVote = async () => {
  if (!selectedTarget.value) {
    alert('请选择投票目标')
    return
  }
  
  try {
    const { error } = await supabase.from('players').update({
      has_voted: true,
      vote_target: `${selectedTarget.value}号`
    }).eq('room_id', roomId.value).eq('key', secretKey.value)
    
    if (error) throw error
    
    const voterNum = currentPlayer.value?.player_num
    await supabase.from('votes').insert({
      room_id: roomId.value,
      day: gameData.value.current_day,
      mode: gameData.value.pk_mode,
      voter: `${voterNum}号`,
      target: `${selectedTarget.value}号`
    })
    
    selectedTarget.value = null
    await loadGameData()
  } catch (error) {
    alert(error.message || '投票失败')
  }
}

const abstainVote = async () => {
  try {
    const { error } = await supabase.from('players').update({
      has_voted: true,
      vote_target: 'abstain'
    }).eq('room_id', roomId.value).eq('key', secretKey.value)
    
    if (error) throw error
    
    const voterNum = currentPlayer.value?.player_num
    await supabase.from('votes').insert({
      room_id: roomId.value,
      day: gameData.value.current_day,
      mode: gameData.value.pk_mode,
      voter: `${voterNum}号`,
      target: 'abstain'
    })
    
    selectedTarget.value = null
    await loadGameData()
  } catch (error) {
    alert(error.message || '投票失败')
  }
}

const confirmCheck = async () => {
  if (!checkTarget.value || hasCheckedThisNight.value !== false) {
    return
  }
  
  const targetPlayer = gameData.value.players.find(p => p.player_num === checkTarget.value)
  if (!targetPlayer) return
  
  const isWolf = targetPlayer.team === 'werewolf'
  const result = isWolf ? '狼' : '金'
  
  annotations.value[checkTarget.value] = result
  
  try {
    await supabase.from('check_results').insert({
      room_id: roomId.value,
      day: gameData.value.current_day,
      voter: `${currentPlayer.value?.player_num}号`,
      target: `${checkTarget.value}号`,
      result: result
    })
    
    hasCheckedThisNight.value = true
    checkTarget.value = null
    await loadGameData()
  } catch (error) {
    alert(error.message || '查验失败')
  }
}

const loadGameData = async () => {
  try {
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*, rooms(*)')
      .eq('key', secretKey.value)
      .single()
    
    if (playerError || !player) {
      console.error('玩家不存在')
      return
    }
    
    roomId.value = player.room_id
    gameData.value = {
      ...player.rooms,
      players: []
    }
    
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId.value)
      .order('player_num')
    
    if (!playersError && players) {
      gameData.value.players = players
    }
    
    currentPlayer.value = player
    
    if (!isInitialized.value) {
      isInitialized.value = true
    }
    
    if (gameData.value.phase === 'night') {
      checkSeerStatus()
    } else {
      hasCheckedThisNight.value = false
    }
    
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId.value)
    
    if (!votesError && votes) {
      votesData.value = votes
    }
    
    const { data: checks, error: checksError } = await supabase
      .from('check_results')
      .select('*')
      .eq('room_id', roomId.value)
    
    if (!checksError && checks) {
      checkResultsData.value = checks
    }
    
    const { data: actions, error: actionsError } = await supabase
      .from('daily_actions')
      .select('*')
      .eq('room_id', roomId.value)
    
    if (!actionsError && actions) {
      dailyActionsData.value = actions
    }
    
    updateCountdown()
  } catch (error) {
    console.error('加载游戏数据失败:', error)
  }
}

const checkSeerStatus = async () => {
  if (!isSeer.value) {
    hasCheckedThisNight.value = false
    return
  }
  
  try {
    const { data: checks, error } = await supabase
      .from('check_results')
      .select('*')
      .eq('room_id', roomId.value)
      .eq('day', gameData.value.current_day)
      .eq('voter', `${currentPlayer.value?.player_num}号`)
    
    if (!error && checks && checks.length > 0) {
      hasCheckedThisNight.value = true
    } else {
      hasCheckedThisNight.value = false
    }
  } catch (error) {
    hasCheckedThisNight.value = false
  }
}

const updateCountdown = () => {
  if (gameData.value.phase === 'night') {
    const elapsed = Date.now() / 1000 - gameData.value.night_timer
    countdown.value = Math.max(0, Math.ceil(gameData.value.night_countdown - elapsed))
  } else if (gameData.value.phase === 'voting' || gameData.value.phase === 'pk') {
    const elapsed = Date.now() / 1000 - gameData.value.vote_timer
    countdown.value = Math.max(0, Math.ceil(gameData.value.vote_countdown - elapsed))
  } else {
    countdown.value = 0
  }
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  secretKey.value = params.get('key')
  
  if (!secretKey.value) {
    window.location.href = '/'
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
.game {
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

.night-bar {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  margin-bottom: 16px;
}

.countdown-number {
  font-size: 48px;
  font-weight: bold;
  color: #fff;
}

.countdown-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.role-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.role-icon {
  font-size: 40px;
}

.role-info {
  flex: 1;
}

.role-name {
  color: #fff;
  font-size: 22px;
  font-weight: bold;
}

.role-team {
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.card-header {
  margin-bottom: 12px;
}

.card-title {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
}

.night-hint {
  color: #409eff;
  font-size: 14px;
  text-align: center;
  background: rgba(64, 158, 255, 0.2);
  padding: 8px;
  border-radius: 8px;
}

.pk-hint {
  color: #e6a23c;
  font-size: 14px;
  text-align: center;
  background: rgba(230, 162, 60, 0.2);
  padding: 8px;
  border-radius: 8px;
  margin-top: 8px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.player-avatar {
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 56px;
}

.player-avatar:active {
  transform: scale(0.95);
}

.player-avatar.dead {
  background: rgba(255, 255, 255, 0.1);
  opacity: 0.5;
}

.player-avatar.dead .player-number {
  text-decoration: line-through;
}

.player-avatar.self {
  background: #409eff;
}

.player-avatar.wolf-teammate {
  background: #f56c6c;
}

.player-avatar.can-vote,
.player-avatar.can-check {
  background: #67c23a;
  animation: pulse 1s infinite;
}

.player-avatar.selected,
.player-avatar.checked {
  box-shadow: 0 0 0 4px #409eff;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.player-number {
  font-size: 18px;
}

.annotation {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.annotation-gold {
  background: #e6a23c;
  color: #fff;
}

.annotation-wolf {
  background: #f56c6c;
  color: #fff;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.action-btn {
  flex: 1;
  height: 48px;
  font-size: 16px;
}

.voted-message {
  color: #67c23a;
  font-weight: bold;
  text-align: center;
  padding: 12px;
}

.timeline-scroll {
  max-height: 400px;
  overflow-y: auto;
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
  margin-bottom: 16px;
}

.day-header {
  background: rgba(64, 158, 255, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
}

.day-number {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.vote-list {
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

.empty-vote {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 20px;
}

.skill-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  border-left: 4px solid #9b59b6;
}

.action-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
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

@media (min-width: 768px) {
  .header h1 {
    font-size: 28px;
  }
  
  .day-info {
    font-size: 18px;
  }
  
  .players-grid {
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 16px;
  }
  
  .player-avatar {
    min-height: 64px;
  }
  
  .player-number {
    font-size: 20px;
  }
  
  .card {
    padding: 24px;
  }
  
  .card-title {
    font-size: 20px;
  }
  
  .vote-item,
  .skill-item {
    font-size: 16px;
  }
}
</style>