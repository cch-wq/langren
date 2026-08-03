<template>
  <div class="home">
    <div class="container">
      <div class="header">
        <h1>狼人杀</h1>
        <p>多人在线推理游戏</p>
      </div>

      <div class="card">
        <input 
          v-model="form.key" 
          type="text" 
          placeholder="输入玩家秘钥或管理员秘钥"
          class="form-input"
          @keyup.enter="enterGame"
        />
        <div class="hint-text">输入管理员秘钥可进入正在进行中的游戏（以管理员视角）</div>
        <button 
          @click="enterGame" 
          :disabled="loading || !form.key"
          class="btn primary"
        >
          {{ loading ? '进入中...' : '进入游戏' }}
        </button>
      </div>

      <div class="card">
        <button @click="showCreateModal = true" class="btn outline">开始游戏</button>
      </div>
    </div>

    <div class="modal-overlay" v-if="showCreateModal" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-title">创建房间</div>
        <input 
          v-model="createPassword" 
          type="password" 
          placeholder="请输入密码"
          class="form-input"
          @keyup.enter="createRoom"
        />
        <div class="modal-actions">
          <button class="btn" @click="showCreateModal = false">取消</button>
          <button class="btn primary" @click="createRoom" :disabled="!createPassword">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

const router = useRouter()
const loading = ref(false)
const showCreateModal = ref(false)
const createPassword = ref('')

const form = reactive({
  key: ''
})

const enterGame = async () => {
  if (!form.key) return

  loading.value = true
  try {
    // 先尝试作为管理员密码校验
    const authRes = await api.verifyAuth('admin', form.key)
    if (authRes.valid) {
      const res = await api.getLatestRoom(1)
      const rooms = res?.data || []
      if (rooms.length === 0) {
        alert('暂无房间，请先创建房间')
        return
      }
      router.push(`/host/${rooms[0].id}`)
      return
    }

    // 不是管理员密码，尝试作为玩家秘钥
    try {
      await api.getPlayerByKey(form.key)
      router.push(`/game?key=${form.key}`)
    } catch (err) {
      if (err.status === 404) {
        alert('秘钥错误')
      } else {
        alert('查询失败: ' + err.message)
      }
    }
  } catch (error) {
    alert('网络错误: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const createRoom = async () => {
  try {
    const res = await api.verifyAuth('create', createPassword.value)
    if (!res.valid) {
      alert('密码错误')
      return
    }
    showCreateModal.value = false
    router.push('/create')
  } catch (err) {
    alert('验证失败: ' + err.message)
  }
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  width: 100%;
  max-width: 360px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
}

.header p {
  font-size: 14px;
  color: #999;
}

.card {
  background: #242424;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 12px;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a1a;
  color: #fff;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 12px;
}

.form-input:focus {
  border-color: #409eff;
}

.form-input::placeholder {
  color: #555;
}

.hint-text {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
  text-align: center;
}

.btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.primary {
  background: #409eff;
  color: #fff;
}

.btn.outline {
  background: transparent;
  border: 1px solid #444;
  color: #fff;
}

.btn.outline:hover {
  background: #333;
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
  width: 300px;
}

.modal-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.modal-actions .btn {
  flex: 1;
}
</style>
