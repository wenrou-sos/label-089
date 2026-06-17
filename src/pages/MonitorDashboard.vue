<template>
  <div class="dashboard h-screen w-screen bg-slate-950 text-gray-100 flex flex-col overflow-hidden">
    <header class="flex items-center justify-between px-5 py-2.5 bg-slate-900/80 border-b border-cyan-500/20 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-sm font-bold">景</div>
        <h1 class="text-lg font-bold tracking-wide">
          <span class="text-cyan-400">景区客流密度</span>监控中心
        </h1>
      </div>
      <div class="flex items-center gap-5 text-sm">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          <span class="text-gray-400">实时监控中</span>
        </div>
        <div class="text-cyan-400 font-mono font-bold">{{ formattedTime }}</div>
      </div>
    </header>

    <div v-for="(alert, idx) in activeWeatherAlerts" :key="idx"
      class="shrink-0 flex items-center gap-3 px-5 py-2 text-sm"
      :style="{ background: alert.color + '15', borderBottom: '1px solid ' + alert.color + '33' }">
      <span class="text-lg">⚠️</span>
      <span class="font-bold" :style="{ color: alert.color }">【{{ alert.level }}{{ alert.type }}】</span>
      <span class="text-gray-300 flex-1">{{ alert.message }}</span>
      <button @click="dismissWeatherAlert(idx)"
        class="px-2 py-0.5 rounded text-xs border transition-colors hover:bg-white/10"
        :style="{ borderColor: alert.color + '55', color: alert.color }">
        已知悉
      </button>
    </div>

    <div class="flex-1 flex gap-3 p-3 min-h-0">
      <aside class="w-64 shrink-0 flex flex-col gap-3 overflow-hidden">
        <div class="bg-slate-900/70 rounded-xl border border-slate-700/50 p-3 flex-1 flex flex-col min-h-0">
          <h2 class="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2 shrink-0">
            <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
            区域客流状态
          </h2>
          <div class="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            <div
              v-for="area in areas" :key="area.id"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors cursor-pointer hover:bg-slate-800/60"
              :class="{ 'bg-slate-800/40': getSaturation(area) === '超载' }"
            >
              <span class="text-base">{{ area.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium truncate">{{ area.name }}</span>
                  <span
                    class="text-xs font-bold px-1.5 py-0.5 rounded"
                    :style="{
                      background: getSaturationColor(getSaturation(area)) + '20',
                      color: getSaturationColor(getSaturation(area)),
                    }"
                  >{{ getSaturation(area) }}</span>
                </div>
                <div class="mt-1 flex items-center gap-2">
                  <div class="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-1000"
                      :style="{
                        width: Math.min(100, area.currentCount / area.capacity * 100) + '%',
                        background: getSaturationColor(getSaturation(area)),
                      }"
                    />
                  </div>
                  <span class="text-xs text-gray-400 w-14 text-right">{{ Math.round(area.currentCount) }}/{{ area.capacity }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-900/70 rounded-xl border border-slate-700/50 p-3">
          <h2 class="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
            今日概览
          </h2>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-slate-800/50 rounded-lg p-2 text-center">
              <div class="text-xs text-gray-400">园内总人数</div>
              <div class="text-lg font-bold text-cyan-400">{{ totalInPark }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-2 text-center">
              <div class="text-xs text-gray-400">超载区域</div>
              <div class="text-lg font-bold text-red-400">{{ overloadedAreas.length }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-2 text-center">
              <div class="text-xs text-gray-400">入园高峰</div>
              <div class="text-sm font-bold text-orange-400">{{ enterPeakHour }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-2 text-center">
              <div class="text-xs text-gray-400">峰值时段</div>
              <div class="text-sm font-bold text-yellow-400">{{ peakHour }}</div>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1 flex flex-col gap-3 min-w-0">
        <div class="flex-1 min-h-0">
          <ScenicMap :areas="areas" />
        </div>
        <div class="h-44 shrink-0 bg-slate-900/70 rounded-xl border border-slate-700/50 p-3">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-sm font-bold text-cyan-400 flex items-center gap-2">
              <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
              当日分时段客流走势
            </h2>
            <div class="flex gap-3 text-xs text-gray-500">
              <span>入园高峰：<span class="text-orange-400">{{ enterPeakHour }}</span></span>
              <span>峰值时段：<span class="text-yellow-400">{{ peakHour }}</span></span>
            </div>
          </div>
          <FlowTrendChart :data="flowData" :peak-hour="peakHour" :enter-peak-hour="enterPeakHour" />
        </div>
      </main>

      <aside class="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
        <div class="bg-slate-900/70 rounded-xl border border-slate-700/50 p-3">
          <h2 class="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
            <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
            观景台排队时长
          </h2>
          <div class="space-y-2">
            <div
              v-for="q in queues" :key="q.id"
              class="flex items-center gap-2 bg-slate-800/40 rounded-lg px-3 py-2"
            >
              <div class="flex-1">
                <div class="text-xs font-medium">{{ q.name }}</div>
                <div class="text-xs text-gray-500 mt-0.5">预计排队</div>
              </div>
              <div
                class="text-lg font-bold tabular-nums"
                :class="{
                  'text-green-400': q.waitMinutes < 15,
                  'text-yellow-400': q.waitMinutes >= 15 && q.waitMinutes < 30,
                  'text-orange-400': q.waitMinutes >= 30 && q.waitMinutes < 45,
                  'text-red-400': q.waitMinutes >= 45,
                }"
              >
                {{ q.waitMinutes }}<span class="text-xs font-normal ml-0.5">分钟</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-900/70 rounded-xl border border-slate-700/50 p-3 flex-1 min-h-0 flex flex-col">
          <h2 class="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2 shrink-0">
            <span class="w-1 h-4 bg-cyan-400 rounded-full"></span>
            停车场余位
          </h2>
          <div class="space-y-2 flex-1">
            <div
              v-for="p in parking" :key="p.id"
              class="bg-slate-800/40 rounded-lg px-3 py-2.5"
              :class="{ 'ring-1 ring-red-500/50': p.remaining / p.total < 0.1 }"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-medium">{{ p.name }}</span>
                <span
                  class="text-xs font-bold"
                  :class="p.remaining / p.total < 0.1 ? 'text-red-400' : p.remaining / p.total < 0.3 ? 'text-yellow-400' : 'text-green-400'"
                >
                  {{ p.remaining > 0 ? `剩余 ${p.remaining}` : '已满' }}
                </span>
              </div>
              <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-1000"
                  :class="p.remaining / p.total < 0.1 ? 'bg-red-500' : p.remaining / p.total < 0.3 ? 'bg-yellow-500' : 'bg-green-500'"
                  :style="{ width: (p.remaining / p.total * 100) + '%' }"
                />
              </div>
              <div class="flex justify-between mt-1 text-xs text-gray-500">
                <span>总车位 {{ p.total }}</span>
                <span>占用 {{ p.total - p.remaining }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="overloadModal.visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div class="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl shadow-red-500/10">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">🚨</div>
              <div>
                <h3 class="font-bold text-red-400">区域超载预警</h3>
                <p class="text-xs text-gray-400">{{ overloadModal.areaName }} 已超出承载能力</p>
              </div>
            </div>
            <div class="bg-slate-800/60 rounded-lg p-3 mb-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-gray-400">当前人数 / 容量</span>
                <span class="text-red-400 font-bold">{{ overloadModal.currentCount }} / {{ overloadModal.capacity }}</span>
              </div>
              <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-red-500 rounded-full" :style="{ width: Math.min(100, overloadModal.currentCount / overloadModal.capacity * 100) + '%' }" />
              </div>
              <div class="text-right text-xs text-red-400 mt-1">
                {{ (overloadModal.currentCount / overloadModal.capacity * 100).toFixed(0) }}% 负载
              </div>
            </div>
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-amber-400 mt-0.5">💡</span>
                <p class="text-amber-200 leading-relaxed">{{ overloadModal.suggestion }}</p>
              </div>
            </div>
            <div class="flex gap-3">
              <button
                @click="closeOverloadModal"
                class="flex-1 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-medium text-sm hover:bg-red-500/30 transition-colors"
              >
                立即启动限流
              </button>
              <button
                @click="closeOverloadModal"
                class="flex-1 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/40 text-gray-300 font-medium text-sm hover:bg-slate-700/70 transition-colors"
              >
                暂时忽略
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScenicMap from '@/components/monitor/ScenicMap.vue'
import FlowTrendChart from '@/components/monitor/FlowTrendChart.vue'
import { useMonitorData } from '@/composables/useMonitorData'

const {
  areas,
  queues,
  parking,
  flowData,
  weatherAlerts,
  currentTime,
  overloadModal,
  overloadedAreas,
  peakHour,
  enterPeakHour,
  totalInPark,
  closeOverloadModal,
  dismissWeatherAlert,
  getSaturation,
  getSaturationColor,
} = useMonitorData()

const formattedTime = computed(() => {
  const d = currentTime.value
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const activeWeatherAlerts = computed(() => weatherAlerts.filter(a => a.active))
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 2px;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
