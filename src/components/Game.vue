<template>
  <div class="game">
    <div class="container">
      <div class="header">
        <h1>game</h1>
        <div class="day-info">第 {{ gameData.current_day }} 天</div>
        <div class="phase-badge" :class="gameData.phase">{{ phaseText }}</div>
      </div>

      <div class="countdown-bar" v-if="gameData.phase === 'night' && nightCountdown > 0">
        <span class="countdown-icon">🌙</span>
        <span class="countdown-number">{{ formatTime(nightCountdown) }}</span>
        <span class="countdown-text">夜间行动</span>
      </div>

      <div class="countdown-bar speech" v-if="gameData.speech_active && speechCountdown > 0">
        <span class="countdown-icon">🎤</span>
        <span class="countdown-number">{{ formatTime(speechCountdown) }}</span>
        <span class="countdown-text">发言时间</span>
      </div>

      <div class="role-card">
        <span class="role-icon">{{ currentPlayer?.role_icon }}</span>
        <div class="role-info">
          <div class="role-name">{{ currentPlayer?.role_name }}</div>
          <div class="role-team">{{ teamText }}</div>
        </div>
      </div>

      <div class="pk-hint" v-if="gameData.phase === 'pk' && gameData.pk_targets.length > 0">
      PK投票：仅可投票给 {{ gameData.pk_targets.join('、') }}
    </div>

    <div class="main-area">
        <div class="players-col">
          <div class="col-title">玩家</div>
          <div 
            v-for="p in leftPlayers" 
            :key="p.player_num"
            class="player-circle"
            :class="{
              'dead': !p.alive,
              'self': isSelf(p),
              'wolf-teammate': isWerewolf && p.team === 'werewolf',
              'can-vote': canVote(p),
              'can-action': canNightAction(p),
              'selected': selectedTarget === p.player_num || selectedNightTarget === p.player_num
            }"
            @click="handlePlayerClick(p)"
          >
            {{ isSelf(p) ? '我' : p.player_num }}
            <span v-if="annotations[p.player_num]" class="tag" :class="annotationClass(p.player_num)">
              {{ annotations[p.player_num] }}
            </span>
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
                  {{ getActionText(action) }}
                </div>
              </div>
              <div v-if="dayGroup.checks.length > 0 && isSeer" class="check-list">
                <div v-for="(check, index) in dayGroup.checks" :key="index" class="check-item">
                  预言家{{ check.voter }}查验{{ check.target }}，{{ check.result }}
                </div>
              </div>
              <div v-if="dayGroup.nightActions && dayGroup.nightActions.length > 0" class="night-action-list">
                <div v-for="(action, index) in dayGroup.nightActions" :key="index" class="night-action-item" v-show="action.actor_player_num === currentPlayer?.player_num">
                  {{ getNightActionText(action) }}
                </div>
              </div>
              <div v-if="dayGroup.votes.length === 0 && dayGroup.actions.length === 0 && (!dayGroup.checks || dayGroup.checks.length === 0) && (!dayGroup.nightActions || dayGroup.nightActions.length === 0)" class="empty-text">暂无记录</div>
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
            :class="{
              'dead': !p.alive,
              'self': isSelf(p),
              'wolf-teammate': isWerewolf && p.team === 'werewolf',
              'can-vote': canVote(p),
              'can-action': canNightAction(p),
              'selected': selectedTarget === p.player_num || selectedNightTarget === p.player_num
            }"
            @click="handlePlayerClick(p)"
          >
            {{ isSelf(p) ? '我' : p.player_num }}
            <span v-if="annotations[p.player_num]" class="tag" :class="annotationClass(p.player_num)">
              {{ annotations[p.player_num] }}
            </span>
          </div>
        </div>
      </div>

      <div class="vote-panel" v-if="showVoteButton || currentPlayer?.has_voted">
        <div class="btn-group">
          <button v-if="showVoteButton" class="btn primary" @click="confirmVote">确认投票</button>
          <button v-if="showVoteButton" class="btn secondary" @click="abstainVote">弃票</button>
          <div v-if="currentPlayer?.has_voted" class="done-text">✓ 已投票</div>
        </div>
      </div>

      <div class="night-action-panel" v-if="gameData.phase === 'night' && nightActionPanel.hasAction && !nightActionPanel.completed">
        <div class="action-hint">{{ nightActionPanel.hint }}</div>
        <div class="btn-group">
          <template v-if="isWitch">
            <button v-if="selectedNightTarget && nightActionPanel.canSave" class="btn primary" @click="confirmNightAction('save')">使用解药</button>
            <button v-if="selectedNightTarget && nightActionPanel.canPoison" class="btn warning" @click="confirmNightAction('poison')">使用毒药</button>
          </template>
          <button v-else-if="selectedNightTarget" class="btn primary" @click="confirmNightAction()">确认{{ nightActionPanel.actionName }}</button>
          <button v-if="!selectedNightTarget" class="btn secondary" @click="skipNightAction">跳过</button>
        </div>
      </div>
      <div class="info-panel night" v-if="nightActionResult">
        <div class="panel-title">夜间结果</div>
        <div class="info-item">{{ nightActionResult }}</div>
      </div>

      <div class="notes-panel">
        <div class="notes-label">发言记录</div>
        <textarea
          class="notes-textarea"
          v-model="playerNotes"
          placeholder="记录其他玩家的发言..."
          @input="adjustTextareaHeight($event); saveNotes()"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'

const roomId = ref('')
const secretKey = ref('')
const gameData = ref({
  players: [],
  current_day: 0,
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
const currentPlayer = ref(null)
const selectedTarget = ref(null)
const selectedNightTarget = ref(null)
const annotations = ref({})
const nightCountdown = ref(0)
const speechCountdown = ref(0)
const votesData = ref([])
const checkResultsData = ref([])
const dailyActionsData = ref([])
const nightActionsData = ref([])
const nightActionResult = ref('')
const playerNotes = ref('')

let pollInterval = null
let countdownInterval = null
let notesSaveTimer = null

const adjustTextareaHeight = (e) => {
  const textarea = e.target
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
}

const saveNotes = async () => {
  if (!roomId.value || !secretKey.value) return
  // 防抖：避免每次按键都发请求
  if (notesSaveTimer) clearTimeout(notesSaveTimer)
  notesSaveTimer = setTimeout(async () => {
    try {
      await api.updatePlayers(roomId.value, { notes: playerNotes.value }, { key: secretKey.value })
    } catch (error) {
      console.error('保存笔记失败:', error)
    }
  }, 800)
}

const phaseText = computed(() => {
  const phase = gameData.value.phase
  if (phase === 'waiting') return '等待中'
  if (phase === 'voting') return '投票中'
  if (phase === 'pk') return 'PK投票'
  if (phase === 'night') return '夜间行动'
  return phase
})

const isWerewolf = computed(() => currentPlayer.value?.team === 'werewolf')
const isSeer = computed(() => currentPlayer.value?.role === 'seer')
const isWitch = computed(() => currentPlayer.value?.role === 'witch')
const isGuard = computed(() => currentPlayer.value?.role === 'guard')
const isKnight = computed(() => currentPlayer.value?.role === 'knight')
const isMedium = computed(() => currentPlayer.value?.role === 'medium')

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

const teamText = computed(() => {
  const team = currentPlayer.value?.team
  if (team === 'werewolf') return '狼人阵营'
  if (team === 'god') return '神职阵营'
  return '平民阵营'
})

const showVoteButton = computed(() => {
  return (gameData.value.phase === 'voting' || gameData.value.phase === 'pk') && 
         currentPlayer.value?.alive && 
         !currentPlayer.value?.has_voted
})

const nightActionPanel = computed(() => {
  if (gameData.value.phase !== 'night' || !currentPlayer.value?.alive) {
    return { show: false }
  }

  const role = currentPlayer.value.role

  if (isWerewolf.value) {
    return {
      show: true,
      title: '狼人行动',
      hint: '选择击杀目标（绿色为队友）',
      targets: gameData.value.players.filter(p => p.alive),
      hasAction: true,
      actionName: '击杀',
      completed: hasNightActionCompleted('kill')
    }
  }

  if (isSeer.value) {
    return {
      show: true,
      title: '预言家行动',
      hint: '选择查验目标',
      targets: gameData.value.players.filter(p => p.alive && !isSelf(p)),
      hasAction: true,
      actionName: '查验',
      completed: hasNightActionCompleted('check')
    }
  }

  if (isWitch.value) {
    const canSave = !currentPlayer.value?.witch_save_used
    const canPoison = !currentPlayer.value?.witch_poison_used
    let targets = gameData.value.players.filter(p => p.alive)
    if (!gameData.value.witch_self_save) {
      targets = targets.filter(p => !isSelf(p))
    }
    return {
      show: true,
      title: '女巫行动',
      hint: `解药${canSave ? '可用' : '已用'}，毒药${canPoison ? '可用' : '已用'}`,
      targets: targets,
      hasAction: canSave || canPoison,
      actionName: '使用药水',
      canSave,
      canPoison,
      completed: hasNightActionCompleted('save') || hasNightActionCompleted('poison')
    }
  }

  if (isGuard.value) {
    const lastTarget = currentPlayer.value?.guard_last_target
    return {
      show: true,
      title: '守卫行动',
      hint: lastTarget ? `选择守护目标（不能连守 ${lastTarget} 号）` : '选择守护目标',
      targets: gameData.value.players.filter(p => p.alive && p.player_num !== lastTarget),
      hasAction: true,
      actionName: '守护',
      completed: hasNightActionCompleted('guard')
    }
  }

  if (isKnight.value) {
    return {
      show: true,
      title: '骑士行动',
      hint: '选择决斗目标',
      targets: gameData.value.players.filter(p => p.alive && !isSelf(p)),
      hasAction: true,
      actionName: '决斗',
      completed: hasNightActionCompleted('duel')
    }
  }

  if (isMedium.value) {
    const deadPlayers = gameData.value.players.filter(p => !p.alive)
    return {
      show: deadPlayers.length > 0,
      title: '通灵师行动',
      hint: '查验死亡玩家身份',
      targets: deadPlayers,
      hasAction: deadPlayers.length > 0,
      actionName: '通灵',
      completed: hasNightActionCompleted('medium_check')
    }
  }

  return {
    show: true,
    title: '夜间',
    hint: '等待天亮...',
    targets: [],
    hasAction: false,
    completed: true
  }
})

const timelineData = computed(() => {
  const days = {}
  for (let day = 1; day <= gameData.value.current_day; day++) {
    days[day] = { day, votes: [], actions: [], checks: [], nightActions: [] }
  }
  for (const vote of votesData.value) {
    if (days[vote.day] && !(vote.day === gameData.value.current_day && gameData.value.phase === 'voting')) {
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
    if (days[check.day]) {
      days[check.day].checks.push(check)
    }
  }
  for (const action of nightActionsData.value) {
    if (days[action.day] && action.action_type !== 'check') {
      days[action.day].nightActions = days[action.day].nightActions || []
      days[action.day].nightActions.push(action)
    }
  }
  return Object.values(days)
})

const checkResults = computed(() => checkResultsData.value)

const playerActions = computed(() => {
  const actions = dailyActionsData.value || []
  return actions.filter(action => action.player === `${currentPlayer.value?.player_num}号`)
})

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const isSelf = (p) => p.key === secretKey.value

const canVote = (p) => {
  if (p.alive && !isSelf(p)) {
    if (gameData.value.pk_mode === 'pk') {
      return gameData.value.pk_targets.includes(`${p.player_num}号`)
    }
    return true
  }
  return false
}

const canNightAction = (p) => {
  if (isSelf(p)) return false
  if (!p.alive) return false
  if (nightActionPanel.value.completed) return false
  if (isGuard.value && p.player_num === currentPlayer.value?.guard_last_target) return false
  return true
}

const annotationClass = (num) => {
  const val = annotations.value[num]
  if (val === '金') return 'tag-gold'
  if (val === '狼') return 'tag-wolf'
  return ''
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

const getNightActionText = (action) => {
  const targetNum = action.target_player_num || action.target
  if (action.action_type === 'kill') return `你选择击杀${targetNum}号`
  if (action.action_type === 'save') return `你选择使用解药拯救${targetNum}号`
  if (action.action_type === 'poison') return `你选择使用毒药毒杀${targetNum}号`
  if (action.action_type === 'guard') return `你选择守护${targetNum}号`
  if (action.action_type === 'check') return `你查验${targetNum}号，结果：${action.result}`
  if (action.action_type === 'duel') return `你选择向${targetNum}号发起决斗`
  if (action.action_type === 'medium_check') return `你通灵${targetNum}号，身份：${action.result}`
  return `${action.action_type} ${targetNum}`
}

const hasNightActionCompleted = (actionType) => {
  return nightActionsData.value.some(action => 
    action.room_id === roomId.value &&
    action.day === gameData.value.current_day &&
    action.actor_player_num === currentPlayer.value?.player_num &&
    action.action_type === actionType
  )
}

const handlePlayerClick = (p) => {
  const isVotingPhase = gameData.value.phase === 'voting' || gameData.value.phase === 'pk'
  
  if (isVotingPhase) {
    if (canVote(p) && currentPlayer.value?.alive && !currentPlayer.value?.has_voted) {
      selectedTarget.value = p.player_num
    }
  } else {
    if (canNightAction(p)) {
      selectedNightTarget.value = p.player_num
    }
  }
}

const handleNightActionClick = (p) => {
  if (canNightAction(p)) {
    selectedNightTarget.value = p.player_num
  }
}

const confirmVote = async () => {
  if (!selectedTarget.value) {
    alert('请选择投票目标')
    return
  }

  try {
    await api.updatePlayers(roomId.value, {
      has_voted: true,
      vote_target: `${selectedTarget.value}号`
    }, { key: secretKey.value })

    const voterNum = currentPlayer.value?.player_num
    await api.insertVote({
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
    await api.updatePlayers(roomId.value, {
      has_voted: true,
      vote_target: 'abstain'
    }, { key: secretKey.value })

    const voterNum = currentPlayer.value?.player_num
    await api.insertVote({
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

const confirmNightAction = async (witchAction) => {
  if (!selectedNightTarget.value) return

  const role = currentPlayer.value?.role
  let actionType = ''
  let actionResult = ''
  let result = ''

  try {
    if (isWerewolf.value) {
      actionType = 'kill'
      result = '狼人'
    } else if (isSeer.value) {
      actionType = 'check'
      const targetPlayer = gameData.value.players.find(p => p.player_num === selectedNightTarget.value)
      const isWolf = targetPlayer?.team === 'werewolf'
      result = isWolf ? '狼' : '金'
      annotations.value[selectedNightTarget.value] = result
      actionResult = `查验${selectedNightTarget.value}号，${result}`

      try {
        await api.insertCheckResult({
          room_id: roomId.value,
          day: gameData.value.current_day,
          voter: `${currentPlayer.value?.player_num}号`,
          target: `${selectedNightTarget.value}号`,
          result: result
        })
      } catch (checkErr) {
        console.error('插入查验结果失败:', checkErr)
        alert('记录查验结果失败')
        return
      }
    } else if (isWitch.value) {
      if (witchAction === 'save') {
        if (currentPlayer.value?.witch_save_used) {
          alert('解药已使用')
          return
        }
        actionType = 'save'
        result = '解药'
        actionResult = `使用解药救${selectedNightTarget.value}号`
        await api.updatePlayers(roomId.value, { witch_save_used: true }, { key: secretKey.value })
      } else if (witchAction === 'poison') {
        if (currentPlayer.value?.witch_poison_used) {
          alert('毒药已使用')
          return
        }
        actionType = 'poison'
        result = '毒药'
        actionResult = `使用毒药毒${selectedNightTarget.value}号`
        await api.updatePlayers(roomId.value, { witch_poison_used: true }, { key: secretKey.value })
      } else {
        return
      }
    } else if (isGuard.value) {
      actionType = 'guard'
      result = '守护'
      actionResult = `守护${selectedNightTarget.value}号`
      await api.updatePlayers(roomId.value, {
        guard_last_night: true,
        guard_last_target: selectedNightTarget.value
      }, { key: secretKey.value })
    } else if (isKnight.value) {
      actionType = 'duel'
      const targetPlayer = gameData.value.players.find(p => p.player_num === selectedNightTarget.value)
      const isWolf = targetPlayer?.team === 'werewolf'
      result = isWolf ? '狼' : '好人'
      actionResult = `决斗${selectedNightTarget.value}号，${result}`
    } else if (isMedium.value) {
      actionType = 'medium_check'
      const targetPlayer = gameData.value.players.find(p => p.player_num === selectedNightTarget.value)
      result = targetPlayer?.role_name || '未知'
      actionResult = `通灵${selectedNightTarget.value}号，身份：${result}`
    }

    await api.insertNightAction({
      room_id: roomId.value,
      day: gameData.value.current_day,
      role: role,
      actor_player_num: currentPlayer.value?.player_num,
      target_player_num: selectedNightTarget.value,
      action_type: actionType,
      result: result
    })

    if (actionResult) nightActionResult.value = actionResult
    selectedNightTarget.value = null
    await loadGameData()
  } catch (error) {
    alert(error.message || '行动失败')
  }
}

const skipNightAction = async () => {
  try {
    await api.insertNightAction({
      room_id: roomId.value,
      day: gameData.value.current_day,
      role: currentPlayer.value?.role,
      actor_player_num: currentPlayer.value?.player_num,
      action_type: 'skip',
      result: '跳过'
    })
    selectedNightTarget.value = null
    await loadGameData()
  } catch (error) {
    alert(error.message || '操作失败')
  }
}

const loadGameData = async () => {
  try {
    if (!roomId.value) {
      const playerRes = await api.getPlayerByKey(secretKey.value)
      const player = playerRes?.data
      if (!player) {
        console.error('玩家不存在')
        return
      }
      roomId.value = player.room_id
    }

    const game = await api.getGame(roomId.value)
    if (!game || !game.room) {
      console.error('房间不存在')
      return
    }

    Object.assign(gameData.value, game.room)
    gameData.value.players = game.players || []
    votesData.value = game.votes || []
    checkResultsData.value = game.check_results || []
    dailyActionsData.value = game.daily_actions || []
    nightActionsData.value = game.night_actions || []

    const currentPlayerData = game.players.find(p => p.key === secretKey.value)
    if (currentPlayerData) {
      currentPlayer.value = currentPlayerData
      // 仅在首次加载或笔记未被本地修改时同步
      if (!playerNotes.value && currentPlayerData.notes) {
        playerNotes.value = currentPlayerData.notes
      } else if (!currentPlayerData.notes) {
        // 服务端无笔记，保留本地
      }
    }

    annotations.value = {}
    if (currentPlayer.value?.role === 'seer' && checkResultsData.value) {
      checkResultsData.value.forEach(check => {
        const targetNum = parseInt(check.target.replace('号', ''))
        annotations.value[targetNum] = check.result
      })
    }

    updateCountdown()
  } catch (error) {
    console.error('加载失败:', error)
  }
}

const updateCountdown = () => {
  if (gameData.value.phase === 'night') {
    const elapsed = Date.now() / 1000 - gameData.value.night_timer
    nightCountdown.value = Math.max(0, Math.ceil(gameData.value.night_countdown - elapsed))
  } else {
    nightCountdown.value = 0
  }

  if (gameData.value.speech_active) {
    const elapsed = Date.now() / 1000 - gameData.value.speech_timer
    speechCountdown.value = Math.max(0, Math.ceil(gameData.value.speech_countdown - elapsed))
  } else {
    speechCountdown.value = 0
  }
}

const route = useRoute()

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
  secretKey.value = route.query.key
  if (!secretKey.value) {
    window.location.href = '/'
    return
  }
  await loadGameData()
  startPolling()
  countdownInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  stopPolling()
  if (countdownInterval) clearInterval(countdownInterval)
  if (notesSaveTimer) clearTimeout(notesSaveTimer)
})
</script>

<style scoped>
.game {
  min-height: 100vh;
  padding: 16px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.day-info {
  font-size: 16px;
  margin-bottom: 8px;
}

.phase-badge {
  display: inline-block;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
}

.phase-badge.waiting { background: #909399; color: #fff; }
.phase-badge.voting { background: #409eff; color: #fff; }
.phase-badge.pk { background: #e6a23c; color: #fff; }
.phase-badge.night { background: #9b59b6; color: #fff; }

.countdown-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: #667eea;
  margin-bottom: 16px;
}

.countdown-bar.speech {
  background: #f56c6c;
}

.countdown-icon {
  font-size: 24px;
}

.countdown-number {
  font-size: 32px;
  font-weight: bold;
  color: #fff;
}

.countdown-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.role-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.role-icon {
  font-size: 36px;
}

.role-name {
  font-size: 20px;
  font-weight: bold;
}

.role-team {
  font-size: 14px;
  opacity: 0.7;
}



.player-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: bold;
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.player-circle:active {
  transform: scale(0.95);
}

.player-circle.dead {
  opacity: 0.4;
}

.player-circle.dead::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 3px;
  background: #fff;
  transform: rotate(45deg);
}

.player-circle.self {
  background: #409eff;
}

.player-circle.wolf-teammate {
  background: #f56c6c;
}

.player-circle.can-vote,
.player-circle.can-action {
  background: #67c23a;
}

.player-circle.selected {
  box-shadow: 0 0 0 4px #409eff;
}

.tag {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: bold;
}

.tag-gold {
  background: #e6a23c;
}

.tag-wolf {
  background: #f56c6c;
}

.btn-group {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}

.btn.primary {
  background: #409eff;
  color: #fff;
}

.btn.secondary {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn.warning {
  background: #e6a23c;
  color: #fff;
}

.done-text {
  color: #67c23a;
  font-weight: bold;
  padding: 12px;
}

.pk-hint {
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  background: rgba(230, 162, 60, 0.2);
  color: #e6a23c;
  font-size: 14px;
  margin-bottom: 16px;
}

.main-area {
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  gap: 12px;
  height: 400px;
  margin-bottom: 16px;
}

.players-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.col-title {
  font-size: 14px;
  font-weight: bold;
  opacity: 0.7;
}

.center-area {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 12px;
  overflow: hidden;
}

.timeline {
  flex: 1;
  overflow-y: auto;
}

.day-item {
  margin-bottom: 16px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.day-label {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
}

.vote-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.vote-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(64, 158, 255, 0.08);
  font-size: 12px;
}

.voter {
  font-weight: 500;
  color: #409eff;
}

.vote-arrow {
  color: #555;
  font-size: 10px;
}

.target {
  color: #e6a23c;
  font-weight: 500;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.action-item {
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(245, 108, 108, 0.08);
  border-left: 2px solid #f56c6c;
  font-size: 12px;
  color: #f56c6c;
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.check-item {
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(155, 89, 182, 0.08);
  border-left: 2px solid #9b59b6;
  font-size: 12px;
  color: #c084fc;
}

.night-action-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 8px;
}

.night-action-item {
  padding: 5px 8px;
  border-radius: 5px;
  background: rgba(155, 89, 182, 0.12);
  border-left: 2px solid #7c3aed;
  font-size: 12px;
  color: #a855f7;
}

.empty-text {
  text-align: center;
  opacity: 0.4;
  padding: 12px;
  font-size: 12px;
}

.vote-panel {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.night-action-panel {
  padding: 16px;
  border-radius: 12px;
  background: rgba(155, 89, 182, 0.15);
  margin-bottom: 16px;
  text-align: center;
}

.action-hint {
  font-size: 14px;
  color: #a855f7;
  margin-bottom: 12px;
}

.info-panel {
  padding: 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
}

.info-panel.night {
  background: rgba(155, 89, 182, 0.2);
}

.info-item {
  padding: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 6px;
  font-size: 14px;
}

.notes-panel {
  padding: 12px;
  border-radius: 8px;
  background: #242424;
}

.notes-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
}

.notes-textarea {
  width: 100%;
  min-height: 40px;
  max-height: 150px;
  padding: 10px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a1a;
  color: #fff;
  font-size: 13px;
  resize: none;
  box-sizing: border-box;
}

.notes-textarea::placeholder {
  color: #555;
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

@media (min-width: 768px) {
  .main-area {
    grid-template-columns: 1fr 2fr 1fr;
    height: 500px;
  }

  .player-circle {
    width: 56px;
    height: 56px;
    font-size: 19px;
  }
}
</style>
