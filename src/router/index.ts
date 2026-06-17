import { createRouter, createWebHistory } from 'vue-router'
import MonitorDashboard from '@/pages/MonitorDashboard.vue'

const routes = [
  {
    path: '/',
    name: 'monitor',
    component: MonitorDashboard,
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
