<template>
  <div class="host">
    <div class="header">
      <div class="day-info">第 {{ gameData.current_day }} 天</div>
      <div class="phase-badge" :class="gameData.phase">{{ phaseText }}</div>
    </div>

    <div class="timer-panel" v-if="currentTimer > 0 || timerMode !== 'none'">
      <div class="timer-row">
        <span class="timer-icon">{{ timerMode === 'night' ? '🌙' : timerMode === 'vote' ? '🗳️' : '🎤' }}</span>
        <span class="timer-text">{{ timerMode === 'night' ? '夜间行动' : timerMode === 'vote' ? '投票时间' : '发言时间' }}</span>
        <span class="timer-num">{{ formatTime(currentTimer) }}</span>
      </div>
      <div class="timer-controls">
        <input type="number" class="timer-input" v-model.number="currentCountdown" min="1" max="600" />
        <button class="btn small" @click="updateCountdownSetting">应用</button>
        <button class="btn small" @click="startTimer">开始</button>
        <button class="btn small" @click="resetTimer">重置</button>
      </div>
    </div>

    <div class="keys-panel">
      <div class="panel-title" @click="showKeys = !showKeys">
        玩家秘钥 {{ showKeys ? '▼' : '▶' }}
      </div>
      <div v-if="showKeys" class="keys-list">
        <div v-for="p in gameData.players" :key="p.player_num" class="key-item">
          <span class="key-num">{{ p.player_num }}号</span>
          <span class="key-role" :class="getRoleClass(p.role)">{{ getRoleShortName(p.role) }}</span>
          <span class="key-code">{{ p.key }}</span>
          <button class="btn tiny" @click="copyKey(p.key)">复制</button>
        </div>
      </div>
    </div>

    <div class="main-area">
      <div class="players-col">
        <div class="col-title">玩家</div>
        <div 
          v-for="p in leftPlayers" 
          :key="p.player_num"
          class="player-circle"
          :class="{ dead: !p.alive }"
          @click="openPlayerMenu(p)"
        >
          {{ p.player_num }}
          <span class="role-tag" :class="getRoleClass(p.role)">{{ getRoleShortName(p.role) }}</span>
        </div>
      </div>

      <div class="center-area">
        <div class="col-title">时间线</div>
        <div class="timeline">
          <div v-for="dayGroup in timelineData" :key="dayGroup.day" class="day-item">
            <div class="day-label">第{{ dayGroup.day }}天</div>
            <div v-if="dayGroup.votes.length > 0" class="vote-list">
              <div v-for="(vote, index) in dayGroup.votes" :key="index" class="vote-item">
                <span class="voter">{{ vote.voter }}</span>
                <span>→</span>
                <span class="target">{{ vote.target }}</span>
              </div>
            </div>
            <div v-if="dayGroup.actions.length > 0" class="action-list">
              <div v-for="(action, index) in dayGroup.actions" :key="index" class="action-item">
                <span>{{ getActionText(action) }}</span>
              </div>
            </div>
            <div v-if="dayGroup.checks.length > 0" class="check-list">
              <div v-for="(check, index) in dayGroup.checks" :key="index" class="check-item">
                预言家{{ check.voter }}查验{{ check.target }}，{{ check.result }}
              </div>
            </div>
            <div v-if="dayGroup.nightActions.length > 0" class="night-action-list">
              <div v-for="(action, index) in dayGroup.nightActions" :key="index" class="night-action-item">
                {{ getNightActionText(action) }}
              </div>
            </div>
            <div v-if="dayGroup.votes.length === 0 && dayGroup.actions.length === 0 && dayGroup.checks.length === 0 && dayGroup.nightActions.length === 0" class="empty-text">暂无记录</div>
          </div>
          <div v-if="timelineData.length === 0" class="empty-text">暂无行动记录</div>
        </div>
      </div>

      <div class="players-col">
        <div class="col-title">玩家</div>
        <div 
          v-for="p in rightPlayers" 
          :key="p.player_num"
          class="player-circle"
          :class="{ dead: !p.alive }"
          @click="openPlayerMenu(p)"
        >
          {{ p.player_num }}
          <span class="role-tag" :class="getRoleClass(p.role)">{{ getRoleShortName(p.role) }}</span>
        </div>
      </div>
    </div>

    <div class="control-panel">
      <div class="panel-title">操作控制</div>
      <div class="btn-group">
        <button v-if="gameData.phase === 'waiting'" class="btn primary" @click="startVote">开始投票</button>
        <button v-if="gameData.phase === 'voting' || gameData.phase === 'pk'" class="btn warning" @click="endVote" :disabled="voteEnding">{{ voteEnding ? '处理中...' : '结束投票' }}</button>
        <button v-if="gameData.phase === 'waiting'" class="btn warning" @click="enterNight">进入夜间</button>
        <button v-if="gameData.phase === 'night'" class="btn success" @click="endNight">结束夜间</button>
        <button v-if="gameData.phase === 'waiting'" class="btn" @click="startSpeech">开始发言</button>
        <button v-if="gameData.speech_active && gameData.phase === 'waiting'" class="btn warning" @click="stopSpeech">停止发言</button>
        <button v-if="gameData.phase === 'waiting'" class="btn danger" @click="resetGame">结束本局</button>
      </div>
    </div>

    <div class="danger-panel">
      <button class="btn danger destroy" @click="confirmDestroyRoom">销毁房间</button>
      <div class="danger-tip">销毁房间将删除所有数据，不可撤销！</div>
    </div>

    <div class="modal-overlay" v-if="showPlayerMenu" @click="closePlayerMenu">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span>{{ selectedPlayer?.role_icon }}</span>
          <span>{{ selectedPlayer?.player_num }}号</span>
          <span>{{ selectedPlayer?.role_name }}</span>
        </div>
        <div class="modal-body">
          <button class="btn danger" @click="openEliminateModal" :disabled="!selectedPlayer?.alive">淘汰</button>
          <button class="btn warning" @click="selfDestructPlayer" :disabled="selectedPlayer?.team !== 'werewolf'">自爆</button>
          <button class="btn success" @click="revivePlayer" :disabled="selectedPlayer?.alive">复活</button>
        </div>
        <button class="btn" @click="closePlayerMenu">关闭</button>
      </div>
    </div>

    <div class="modal-overlay" v-if="showEliminateModal" @click="closeEliminateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <span>淘汰 {{ eliminatePlayerNum }}号</span>
        </div>
        <div class="modal-body">
          <div class="reason-label">选择淘汰理由：</div>
          <div class="reason-list">
            <button 
              v-for="reason in eliminateReasons" 
              :key="reason.value"
              class="reason-btn"
              :class="{ active: eliminateReason === reason.value }"
              @click="eliminateReason = reason.value"
            >
              {{ reason.label }}
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeEliminateModal">取消</button>
          <button class="btn danger" @click="confirmEliminate" :disabled="!eliminateReason">确认淘汰</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const router = useRouter()

const roomId = ref('')
const showKeys = ref(false)
const showPlayerMenu = ref(false)
const selectedPlayer = ref(null)
const showEliminateModal = ref(false)
const eliminatePlayerNum = ref(null)
const eliminateReason = ref('')
const eliminateReasons = [
  { value: 'vote', label: '投票出局' },
  { value: 'night', label: '夜间死亡' },
  { value: 'suicide', label: '狼人自爆' },
  { value: 'other', label: '其他原因' }
]
const gameData = ref({
  players: [],
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
  witch_self_save: false
})
const votesData = ref([])
const checkResultsData = ref([])
const dailyActionsData = ref([])
const nightActionsData = ref([])
const currentTimer = ref(0)
const timerMode = ref('none')
const currentCountdown = ref(15)
const voteEnding = ref(false)

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
    days[day] = { day, votes: [], actions: [], checks: [], nightActions: [] }
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
    if (days[action.day]) days[action.day].actions.push(action)
  }
  for (const check of checkResultsData.value) {
    if (days[check.day]) days[check.day].checks.push(check)
  }
  for (const action of nightActionsData.value) {
    if (days[action.day] && action.action_type !== 'check') days[action.day].nightActions.push(action)
  }
  return Object.values(days)
})

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getActionText = (action) => {
  if (action.type === 'eliminate') return `${action.player}被${action.reason}`
  if (action.type === 'self_destruct') return `${action.player}（${action.role}）自爆出局`
  return `${action.player}：${action.reason}`
}

const getNightActionText = (action) => {
  const roleNames = {
    werewolf: '狼人', wolf_king: '狼王', white_wolf: '白狼王',
    mechanical_wolf: '机械狼', wolf_beauty: '狼美人',
    witch: '女巫', guard: '守卫', seer: '预言家', knight: '骑士', medium: '通灵师'
  }
  const actorName = roleNames[action.role] || action.role
  if (action.action_type === 'kill') return `${actorName}击杀${action.target_player_num}号`
  if (action.action_type === 'save') return `女巫使用解药救${action.target_player_num}号`
  if (action.action_type === 'poison') return `女巫使用毒药毒${action.target_player_num}号`
  if (action.action_type === 'guard') return `守卫守护${action.target_player_num}号`
  if (action.action_type === 'check') return `预言家查验${action.target_player_num}号，${action.result}`
  if (action.action_type === 'duel') return `骑士决斗${action.target_player_num}号，${action.result}`
  if (action.action_type === 'medium_check') return `通灵师查验${action.target_player_num}号，${action.result}`
  return `${actorName}夜间行动`
}

const getRoleShortName = (role) => {
  const roleMap = {
    werewolf: '狼', wolf_king: '狼王', white_wolf: '白狼',
    mechanical_wolf: '机狼', wolf_beauty: '狼美',
    seer: '预', witch: '巫', hunter: '猎', guard: '守',
    knight: '骑', medium: '灵', idiot: '愚', villager: '平'
  }
  return roleMap[role] || role
}

const getRoleClass = (role) => {
  if (role.includes('wolf')) return 'role-wolf'
  if (['seer', 'witch', 'hunter', 'guard', 'knight', 'medium', 'idiot'].includes(role)) return 'role-god'
  return 'role-villager'
}

const copyKey = async (key) => {
  await navigator.clipboard.writeText(key)
  alert('已复制')
}

const loadGameData = async () => {
  try {
    const game = await api.getGame(roomId.value)
    if (!game || !game.room) return

    Object.assign(gameData.value, {
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
      witch_self_save: false,
      ...game.room
    })

    gameData.value.players = game.players || []
    votesData.value = game.votes || []
    checkResultsData.value = game.check_results || []
    dailyActionsData.value = game.daily_actions || []
    nightActionsData.value = game.night_actions || []

    updateCountdown()
  } catch (error) {
    console.error('加载失败:', error)
  }
}

const updateCountdown = () => {
  if (gameData.value.phase === 'voting') {
    timerMode.value = 'vote'
    const elapsed = Date.now() / 1000 - gameData.value.vote_timer
    const newTimer = Math.max(0, Math.ceil(gameData.value.vote_countdown - elapsed))
    if (currentTimer.value > 0 && newTimer === 0) endVote()
    currentTimer.value = newTimer
  } else if (gameData.value.phase === 'night') {
    timerMode.value = 'night'
    const elapsed = Date.now() / 1000 - gameData.value.night_timer
    const newTimer = Math.max(0, Math.ceil(gameData.value.night_countdown - elapsed))
    if (currentTimer.value > 0 && newTimer === 0) endNight()
    currentTimer.value = newTimer
  } else if (gameData.value.speech_active) {
    timerMode.value = 'speech'
    const elapsed = Date.now() / 1000 - gameData.value.speech_timer
    currentTimer.value = Math.max(0, Math.ceil(gameData.value.speech_countdown - elapsed))
  } else {
    timerMode.value = 'none'
    currentTimer.value = 0
  }
}

const updateCountdownSetting = async () => {
  try {
    const updates = {}
    if (timerMode.value === 'vote') updates.vote_countdown = currentCountdown.value
    else if (timerMode.value === 'night') updates.night_countdown = currentCountdown.value
    else if (timerMode.value === 'speech') updates.speech_countdown = currentCountdown.value
    await api.updateRoom(roomId.value, updates)
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const startTimer = async () => {
  try {
    const now = Math.floor(Date.now() / 1000)
    const updates = {}
    if (timerMode.value === 'vote') updates.vote_timer = now
    else if (timerMode.value === 'night') updates.night_timer = now
    else if (timerMode.value === 'speech') updates.speech_timer = now
    await api.updateRoom(roomId.value, updates)
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resetTimer = async () => {
  try {
    const updates = {}
    if (timerMode.value === 'vote') updates.vote_timer = 0
    else if (timerMode.value === 'night') updates.night_timer = 0
    else if (timerMode.value === 'speech') updates.speech_timer = 0
    await api.updateRoom(roomId.value, updates)
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const startVote = async () => {
  try {
    await api.updateRoom(roomId.value, {
      phase: 'voting',
      speech_active: false,
      vote_timer: Math.floor(Date.now() / 1000),
      vote_countdown: currentCountdown.value
    })
    await api.updatePlayers(roomId.value, { has_voted: false, vote_target: null })
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const endVote = async () => {
  if (!roomId.value) {
    alert('房间ID无效')
    return
  }
  if (voteEnding.value) return

  voteEnding.value = true

  try {
    const mode = gameData.value.phase === 'pk' ? 'pk' : 'normal'
    const votesRes = await api.getVotes(roomId.value, { day: gameData.value.current_day, mode })
    const votes = votesRes?.data || []

    if (votes.length === 0) {
      try {
        await api.updateRoom(roomId.value, { phase: 'waiting' })
      } catch (e) {
        alert('更新房间状态失败: ' + e.message)
        return
      }
      alert('暂无投票，已结束投票')
      await loadGameData()
      return
    }

    const voteCounts = {}
    for (const vote of votes) {
      if (vote.target !== 'abstain') {
        voteCounts[vote.target] = (voteCounts[vote.target] || 0) + 1
      }
    }

    if (Object.keys(voteCounts).length === 0) {
      try {
        await api.updateRoom(roomId.value, { phase: 'waiting' })
      } catch (e) {
        alert('更新房间状态失败: ' + e.message)
        return
      }
      alert('所有人都弃票，已结束投票')
      await loadGameData()
      return
    }

    const maxVotes = Math.max(...Object.values(voteCounts))
    const topTargets = Object.keys(voteCounts).filter(target => voteCounts[target] === maxVotes)

    if (topTargets.length === 1) {
      const target = topTargets[0]
      const targetNum = parseInt(target.replace('号', ''))
      const player = gameData.value.players.find(p => p.player_num === targetNum)

      if (player && player.alive) {
        try {
          await api.updatePlayers(roomId.value, { alive: false }, { player_num: targetNum })
        } catch (e) {
          alert('更新玩家状态失败: ' + e.message)
          return
        }

        try {
          await api.insertDailyAction({
            room_id: roomId.value,
            day: gameData.value.current_day,
            type: 'eliminate',
            player: target,
            role: player.role_name,
            reason: '投票出局'
          })
        } catch (e) {
          alert('记录淘汰信息失败: ' + e.message)
          return
        }
      }

      try {
        await api.updateRoom(roomId.value, { phase: 'waiting', pk_mode: 'normal', pk_targets: [] })
      } catch (e) {
        alert('更新房间状态失败: ' + e.message)
        return
      }

      alert(`${target}被投票出局`)
    } else {
      try {
        await api.updateRoom(roomId.value, {
          phase: 'pk',
          pk_mode: 'pk',
          pk_targets: topTargets
        })
      } catch (e) {
        alert('更新房间状态失败: ' + e.message)
        return
      }

      try {
        await api.updatePlayers(roomId.value, { has_voted: false, vote_target: null })
      } catch (e) {
        alert('重置玩家投票状态失败: ' + e.message)
        return
      }

      alert(`平票，进入PK投票: ${topTargets.join('、')}`)
    }

    await loadGameData()
  } catch (error) {
    alert('操作失败: ' + (error.message || '未知错误'))
  } finally {
    voteEnding.value = false
  }
}

const enterNight = async () => {
  try {
    await api.updateRoom(roomId.value, {
      phase: 'night',
      night_timer: Math.floor(Date.now() / 1000),
      night_countdown: currentCountdown.value
    })
    await api.updatePlayers(roomId.value, { guard_last_night: false, guard_last_target: null }, { role: 'guard' })
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const endNight = async () => {
  try {
    await resolveNightActions()
    await api.updateRoom(roomId.value, {
      phase: 'waiting',
      current_day: gameData.value.current_day + 1
    })
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resolveNightActions = async () => {
  const res = await api.getNightActions(roomId.value, { day: gameData.value.current_day })
  const nightActions = res?.data || []
  if (nightActions.length === 0) return

  const killTargets = {}
  const saveTargets = new Set()
  const poisonTargets = new Set()
  const guardTargets = new Set()
  const duelActions = []

  for (const action of nightActions) {
    if (action.action_type === 'kill' && action.target_player_num) killTargets[action.target_player_num] = (killTargets[action.target_player_num] || 0) + 1
    else if (action.action_type === 'save' && action.target_player_num) saveTargets.add(action.target_player_num)
    else if (action.action_type === 'poison' && action.target_player_num) poisonTargets.add(action.target_player_num)
    else if (action.action_type === 'guard' && action.target_player_num) guardTargets.add(action.target_player_num)
    else if (action.action_type === 'duel' && action.target_player_num) duelActions.push(action)
  }

  const deadPlayers = []
  for (const [targetNum, count] of Object.entries(killTargets)) {
    const num = parseInt(targetNum)
    const isSaved = saveTargets.has(num)
    const isGuarded = guardTargets.has(num)
    if (!isSaved && !isGuarded) deadPlayers.push(num)
    if (isSaved && isGuarded) deadPlayers.push(num)
  }
  for (const num of poisonTargets) deadPlayers.push(num)

  // 骑士决斗：目标是狼人则目标死，否则骑士自己死
  for (const duel of duelActions) {
    const targetPlayer = gameData.value.players.find(p => p.player_num === duel.target_player_num)
    if (!targetPlayer) continue
    if (targetPlayer.team === 'werewolf') {
      deadPlayers.push(duel.target_player_num)
    } else {
      deadPlayers.push(duel.actor_player_num)
    }
  }

  const uniqueDead = [...new Set(deadPlayers)]
  for (const num of uniqueDead) {
    const player = gameData.value.players.find(p => p.player_num === num)
    if (player && player.alive) {
      await api.updatePlayers(roomId.value, { alive: false }, { player_num: num })
      await api.insertDailyAction({
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
    await api.updateRoom(roomId.value, {
      speech_active: true,
      speech_timer: Math.floor(Date.now() / 1000),
      speech_countdown: currentCountdown.value
    })
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const stopSpeech = async () => {
  try {
    await api.updateRoom(roomId.value, { speech_active: false })
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const resetGame = async () => {
  if (!confirm('确定要结束本局并重新开始吗？')) return
  try {
    const playersRes = await api.getPlayersByRoom(roomId.value)
    const players = playersRes?.data || []
    if (players.length === 0) return

    const roleConfig = {
      werewolf: 3, wolf_king: 0, white_wolf: 0, mechanical_wolf: 0, wolf_beauty: 0,
      seer: 1, witch: 1, hunter: 1, guard: 0, knight: 0, medium: 0, idiot: 0,
      villager: Math.max(0, players.length - 6)
    }

    const werewolfRoles = [{ id: 'werewolf', name: '狼人', icon: '🐺', team: 'werewolf' }]
    const godRoles = [
      { id: 'seer', name: '预言家', icon: '🔮', team: 'god' },
      { id: 'witch', name: '女巫', icon: '🧙', team: 'god' },
      { id: 'hunter', name: '猎人', icon: '🏹', team: 'god' }
    ]
    const villagerRoles = [{ id: 'villager', name: '平民', icon: '👨‍🌾', team: 'villager' }]

    const rolesList = []
    werewolfRoles.concat(godRoles, villagerRoles).forEach(role => {
      for (let i = 0; i < roleConfig[role.id]; i++) {
        rolesList.push({ role_id: role.id, role_name: role.name, role_icon: role.icon, team: role.team })
      }
    })
    for (let i = rolesList.length; i < players.length; i++) {
      rolesList.push({ role_id: 'villager', role_name: '平民', role_icon: '👨‍🌾', team: 'villager' })
    }

    for (let i = rolesList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rolesList[i], rolesList[j]] = [rolesList[j], rolesList[i]]
    }

    for (let i = 0; i < players.length; i++) {
      await api.updatePlayers(roomId.value, {
        role: rolesList[i].role_id,
        role_name: rolesList[i].role_name,
        role_icon: rolesList[i].role_icon,
        team: rolesList[i].team,
        alive: true,
        has_voted: false,
        vote_target: null,
        witch_save_used: false,
        witch_poison_used: false,
        guard_last_night: false,
        guard_last_target: null
      }, { player_num: players[i].player_num })
    }

    await api.updateRoom(roomId.value, {
      current_day: 0,
      phase: 'waiting',
      speech_active: false
    })

    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
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

const openEliminateModal = () => {
  if (!selectedPlayer.value) return
  eliminatePlayerNum.value = selectedPlayer.value.player_num
  eliminateReason.value = ''
  showEliminateModal.value = true
}

const closeEliminateModal = () => {
  showEliminateModal.value = false
  eliminatePlayerNum.value = null
  eliminateReason.value = ''
}

const confirmEliminate = async () => {
  if (!eliminatePlayerNum.value || !eliminateReason.value) return
  try {
    const reasonLabel = eliminateReasons.find(r => r.value === eliminateReason.value)?.label || '管理员淘汰'
    await api.updatePlayers(roomId.value, { alive: false }, { player_num: eliminatePlayerNum.value })
    await api.insertDailyAction({
      room_id: roomId.value,
      day: gameData.value.current_day,
      type: 'eliminate',
      player: `${eliminatePlayerNum.value}号`,
      role: gameData.value.players.find(p => p.player_num === eliminatePlayerNum.value)?.role_name || '',
      reason: reasonLabel
    })
    closeEliminateModal()
    closePlayerMenu()
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const selfDestructPlayer = async () => {
  if (!selectedPlayer.value) return
  try {
    await api.updatePlayers(roomId.value, { alive: false }, { player_num: selectedPlayer.value.player_num })
    await api.insertDailyAction({
      room_id: roomId.value,
      day: gameData.value.current_day,
      type: 'self_destruct',
      player: `${selectedPlayer.value.player_num}号`,
      role: selectedPlayer.value.role_name,
      reason: '自爆'
    })
    closePlayerMenu()
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const revivePlayer = async () => {
  if (!selectedPlayer.value) return
  try {
    await api.updatePlayers(roomId.value, { alive: true }, { player_num: selectedPlayer.value.player_num })
    closePlayerMenu()
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const confirmDestroyRoom = async () => {
  if (!confirm('警告：此操作将永久销毁房间及所有数据！')) return
  if (!confirm('再次确认：销毁后无法恢复！')) return

  try {
    // rooms/[roomId].js 的 DELETE 会级联删除所有关联数据
    await api.deleteRoom(roomId.value)
    alert('房间已销毁')
    router.push('/')
  } catch (error) {
    alert('销毁失败：' + error.message)
  }
}

const startPolling = () => {
  if (pollInterval) return
  // 每 2 秒轮询一次，替代 Supabase realtime
  pollInterval = setInterval(loadGameData, 2000)
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(async () => {
  roomId.value = route.params.roomId || route.query.room
  if (!roomId.value) {
    router.push('/')
    return
  }
  await loadGameData()
  startPolling()
  countdownInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  stopPolling()
  if (countdownInterval) clearInterval(countdownInterval)
})
</script>

<style scoped>
.host {
  min-height: 100vh;
  padding: 12px;
}

.header {
  text-align: center;
  margin-bottom: 12px;
}

.day-info {
  font-size: 16px;
  margin-bottom: 6px;
}

.phase-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.phase-badge.waiting { background: #666; }
.phase-badge.voting { background: #409eff; }
.phase-badge.pk { background: #e6a23c; }
.phase-badge.night { background: #9b59b6; }

.timer-panel {
  padding: 12px;
  border-radius: 8px;
  background: #242424;
  margin-bottom: 12px;
}

.timer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.timer-icon {
  font-size: 18px;
}

.timer-text {
  font-size: 14px;
}

.timer-num {
  font-size: 24px;
  font-weight: bold;
}

.timer-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.timer-input {
  width: 70px;
  height: 32px;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 0 6px;
  font-size: 14px;
  background: #1a1a1a;
  color: #fff;
}

.keys-panel {
  padding: 12px;
  border-radius: 8px;
  background: #242424;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 10px;
  cursor: pointer;
}

.keys-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #1a1a1a;
}

.key-num {
  font-weight: 500;
}

.key-role {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
}

.key-role.role-wolf { background: #f56c6c; }
.key-role.role-god { background: #409eff; }
.key-role.role-villager { background: #666; }

.key-code {
  font-family: monospace;
  font-size: 11px;
  color: #999;
}

.main-area {
  display: grid;
  grid-template-columns: 70px 1fr 70px;
  gap: 8px;
  height: 400px;
  margin-bottom: 12px;
}

.players-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.col-title {
  font-size: 12px;
  color: #999;
}

.player-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  position: relative;
  cursor: pointer;
}

.player-circle.dead {
  opacity: 0.4;
}

.player-circle.dead::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 2px;
  background: #fff;
  transform: rotate(45deg);
}

.role-tag {
  position: absolute;
  bottom: -6px;
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 4px;
}

.center-area {
  display: flex;
  flex-direction: column;
  background: #242424;
  border-radius: 8px;
  padding: 8px;
  overflow: hidden;
}

.timeline {
  flex: 1;
  overflow-y: auto;
}

.day-item {
  margin-bottom: 10px;
}

.day-label {
  font-size: 12px;
  font-weight: 500;
  color: #409eff;
  margin-bottom: 6px;
}

.vote-list, .action-list, .check-list, .night-action-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vote-item, .action-item, .check-item, .night-action-item {
  padding: 4px 6px;
  border-radius: 4px;
  background: #1a1a1a;
  font-size: 12px;
}

.voter { font-weight: 500; }
.target { color: #e6a23c; }

.empty-text {
  text-align: center;
  color: #555;
  padding: 16px;
  font-size: 12px;
}

.timeline::-webkit-scrollbar {
  width: 6px;
}

.timeline::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.timeline::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.timeline::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-panel {
  padding: 12px;
  border-radius: 8px;
  background: #242424;
  margin-bottom: 12px;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary { background: #409eff; }
.btn.success { background: #67c23a; }
.btn.warning { background: #e6a23c; }
.btn.danger { background: #f56c6c; }
.btn.small { padding: 6px 12px; font-size: 12px; }
.btn.tiny { padding: 3px 8px; font-size: 10px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.danger-panel {
  padding: 12px;
  border-radius: 8px;
  background: rgba(245, 108, 108, 0.1);
  text-align: center;
}

.btn.destroy {
  width: 100%;
  padding: 12px;
  font-size: 14px;
}

.danger-tip {
  font-size: 11px;
  color: #f56c6c;
  margin-top: 6px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #242424;
  border-radius: 8px;
  padding: 20px;
  width: 280px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.reason-label {
  font-size: 13px;
  margin-bottom: 8px;
}

.reason-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reason-btn {
  padding: 6px 12px;
  border: 1px solid #444;
  border-radius: 4px;
  background: #1a1a1a;
  font-size: 12px;
  cursor: pointer;
}

.reason-btn.active {
  background: #409eff;
  border-color: #409eff;
}

@media (min-width: 768px) {
  .host {
    padding: 20px;
  }

  .main-area {
    grid-template-columns: 1fr 2fr 1fr;
    height: 500px;
  }

  .player-circle {
    width: 56px;
    height: 56px;
    font-size: 18px;
  }
}
</style>
