import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../components/Home.vue')
  },
  {
    path: '/create',
    name: 'Create',
    component: () => import('../components/CreateRoom.vue')
  },
  {
    path: '/game',
    name: 'Game',
    component: () => import('../components/Game.vue')
  },
  {
    path: '/host',
    name: 'Host',
    component: () => import('../components/Host.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router