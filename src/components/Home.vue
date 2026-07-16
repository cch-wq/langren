<template>
  <div class="home">
    <div class="container">
      <div class="header">
        <h1 class="title">🐺 狼人杀</h1>
        <p class="subtitle">多人在线推理游戏</p>
      </div>
      
      <div class="card">
        <h2 class="card-title">进入游戏</h2>
        <div class="form-group">
          <label class="form-label">房间号</label>
          <input 
            v-model="form.roomId" 
            type="text" 
            placeholder="请输入3位房间号"
            class="form-input"
            maxlength="3"
          />
        </div>
        <div class="form-group">
          <label class="form-label">秘钥</label>
          <input 
            v-model="form.key" 
            type="text" 
            placeholder="请输入6位玩家秘钥或管理员密码"
            class="form-input"
          />
        </div>
        <button 
          @click="enterGame" 
          :disabled="loading || !form.roomId || !form.key"
          class="action-btn primary-btn"
        >
          {{ loading ? '进入中...' : '进入' }}
        </button>
      </div>
      
      <div class="card">
        <button @click="goCreate" class="action-btn success-btn">创建房间</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase'

const router = useRouter()
const loading = ref(false)
const ADMIN_PASSWORD = '13544'

const form = reactive({
  roomId: '',
  key: ''
})

const enterGame = async () => {
  if (!form.roomId || !form.key) return
  
  loading.value = true
  try {
    if (form.key === ADMIN_PASSWORD) {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', form.roomId)
        .single()
      
      if (error || !room) {
        alert('房间不存在')
        return
      }
      
      router.push(`/host/${form.roomId}`)
      return
    }
    
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('key', form.key)
      .eq('room_id', form.roomId)
      .single()
    
    if (error || !player) {
      alert('秘钥错误或房间号不正确')
      return
    }
    
    router.push(`/game?room=${form.roomId}&key=${form.key}`)
  } catch (error) {
    console.error('进入游戏失败:', error)
    alert('网络错误，请检查网络连接或稍后重试')
  } finally {
    loading.value = false
  }
}

const goCreate = () => {
  router.push('/create')
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding-top: 40px;
}

.title {
  font-size: 28px;
  color: #fff;
  margin-bottom: 8px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 15px;
}

.card-title {
  color: #fff;
  margin-bottom: 18px;
  font-size: 16px;
  font-weight: bold;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.form-input:focus {
  background: rgba(255, 255, 255, 0.25);
}

.action-btn {
  width: 100%;
  height: 50px;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:active {
  transform: scale(0.98);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.primary-btn {
  background: linear-gradient(135deg, #409eff, #667eea);
  color: #fff;
}

.success-btn {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: #fff;
}

@media (min-width: 768px) {
  .home {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .header {
    padding-top: 0;
  }
  
  .title {
    font-size: 40px;
  }
  
  .subtitle {
    font-size: 16px;
  }
  
  .card {
    padding: 28px;
  }
  
  .card-title {
    font-size: 18px;
  }
  
  .form-input {
    height: 48px;
    font-size: 17px;
  }
  
  .action-btn {
    height: 52px;
    font-size: 18px;
  }
}
</style>