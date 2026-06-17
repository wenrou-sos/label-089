<template>
  <div class="scenic-map relative w-full h-full overflow-hidden rounded-xl" ref="mapContainer">
    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="mapBg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#1a3a2a" />
          <stop offset="100%" stop-color="#0d1f17" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.6" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="100" height="100" fill="url(#mapBg)" rx="2" />

      <path d="M 10,90 Q 15,70 12,55 Q 10,40 18,30 Q 25,20 35,18 Q 45,15 55,20 Q 60,22 65,18 Q 72,12 80,15 Q 88,18 92,30 Q 95,40 90,55 Q 88,65 85,75 Q 82,85 75,90 Z"
            fill="#162e22" stroke="#2a5a3f" stroke-width="0.3" opacity="0.7" />

      <ellipse cx="15" cy="40" rx="8" ry="4" fill="#0f2a1f" stroke="#1a4a30" stroke-width="0.2" opacity="0.5" />
      <text x="15" y="41" text-anchor="middle" fill="#3a7a5a" font-size="1.5" opacity="0.6">翠湖</text>

      <path d="M 55,20 L 60,15 L 58,25 Q 56,28 55,20" fill="#2a5a3f" opacity="0.4" />
      <path d="M 35,18 L 38,10 L 42,12 L 40,20" fill="#2a5a3f" opacity="0.4" />
      <path d="M 65,18 L 68,8 L 72,10 L 70,20" fill="#2a5a3f" opacity="0.4" />

      <path d="M 25,70 Q 30,65 45,65" fill="none" stroke="url(#pathGrad)" stroke-width="0.5" stroke-dasharray="1,0.5" />
      <path d="M 45,65 Q 50,60 50,50 Q 50,35 50,20" fill="none" stroke="url(#pathGrad)" stroke-width="0.5" stroke-dasharray="1,0.5" />
      <path d="M 50,50 Q 55,48 65,35" fill="none" stroke="url(#pathGrad)" stroke-width="0.5" stroke-dasharray="1,0.5" />
      <path d="M 35,30 Q 30,40 20,50" fill="none" stroke="url(#pathGrad)" stroke-width="0.4" stroke-dasharray="1,0.5" />
      <path d="M 50,50 Q 60,55 70,60" fill="none" stroke="url(#pathGrad)" stroke-width="0.4" stroke-dasharray="1,0.5" />
      <path d="M 50,65 Q 52,70 55,75" fill="none" stroke="url(#pathGrad)" stroke-width="0.4" stroke-dasharray="1,0.5" />
      <path d="M 65,35 Q 70,40 75,45" fill="none" stroke="url(#pathGrad)" stroke-width="0.4" stroke-dasharray="1,0.5" />

      <g v-for="area in areas" :key="area.id" class="area-marker" @click="selectArea(area)">
        <circle
          :cx="area.x" :cy="area.y"
          :r="getHeatRadius(area)"
          :fill="getHeatColor(area)"
          opacity="0.3"
          class="heat-pulse"
        />
        <circle
          :cx="area.x" :cy="area.y"
          r="2.5"
          :fill="getSaturationColor(getSaturation(area))"
          opacity="0.9"
          filter="url(#glow)"
        />
        <circle
          :cx="area.x" :cy="area.y"
          r="1.5"
          fill="white"
          opacity="0.8"
        />
      </g>
    </svg>

    <div
      v-for="area in areas"
      :key="'label-' + area.id"
      class="area-label"
      :style="{
        left: area.x + '%',
        top: area.y + '%',
        transform: 'translate(-50%, -140%)',
      }"
      @click="selectArea(area)"
    >
      <div
        class="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap backdrop-blur-sm border"
        :class="getLabelClass(area)"
      >
        <span class="mr-1">{{ area.icon }}</span>
        <span>{{ area.name }}</span>
      </div>
    </div>

    <div
      v-for="area in areas"
      :key="'badge-' + area.id"
      class="area-badge"
      :style="{
        left: area.x + '%',
        top: (area.y + 5) + '%',
        transform: 'translate(-50%, 0)',
      }"
    >
      <div
        class="px-1.5 py-0.5 rounded text-xs font-bold"
        :style="{ background: getSaturationColor(getSaturation(area)) + '22', color: getSaturationColor(getSaturation(area)), border: '1px solid ' + getSaturationColor(getSaturation(area)) + '44' }"
      >
        {{ Math.round(area.currentCount) }}人 · {{ getSaturation(area) }}
      </div>
    </div>

    <div
      v-if="selectedArea"
      class="area-detail"
      :style="{
        left: Math.min(selectedArea.x + 5, 80) + '%',
        top: Math.max(selectedArea.y - 5, 5) + '%',
      }"
    >
      <div class="bg-gray-900/95 border border-cyan-500/30 rounded-lg p-3 text-xs min-w-40 backdrop-blur-sm shadow-xl">
        <div class="flex items-center justify-between mb-2">
          <span class="text-cyan-400 font-bold">{{ selectedArea.icon }} {{ selectedArea.name }}</span>
          <button @click="selectedArea = null" class="text-gray-500 hover:text-white ml-2">✕</button>
        </div>
        <div class="space-y-1 text-gray-300">
          <div>当前人数：<span class="text-white font-bold">{{ Math.round(selectedArea.currentCount) }}</span></div>
          <div>最大容量：<span class="text-white">{{ selectedArea.capacity }}</span></div>
          <div>饱和度：<span :style="{ color: getSaturationColor(getSaturation(selectedArea)) }" class="font-bold">{{ (selectedArea.currentCount / selectedArea.capacity * 100).toFixed(0) }}%</span></div>
          <div class="mt-2 pt-2 border-t border-gray-700">
            <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-1000"
                :style="{
                  width: Math.min(100, selectedArea.currentCount / selectedArea.capacity * 100) + '%',
                  background: getSaturationColor(getSaturation(selectedArea)),
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute bottom-2 left-2 flex gap-3 text-xs text-gray-400 bg-gray-900/80 rounded-lg px-3 py-1.5 backdrop-blur-sm">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span> 舒适</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span> 拥挤</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-orange-500 inline-block"></span> 饱和</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span> 超载</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AreaInfo } from '@/composables/useMonitorData'
import { getSaturation, getSaturationColor } from '@/composables/useMonitorData'

const props = defineProps<{
  areas: AreaInfo[]
}>()

const selectedArea = ref<AreaInfo | null>(null)

function selectArea(area: AreaInfo) {
  selectedArea.value = selectedArea.value?.id === area.id ? null : area
}

function getHeatRadius(area: AreaInfo): number {
  const ratio = area.currentCount / area.capacity
  return 3 + ratio * 6
}

function getHeatColor(area: AreaInfo): string {
  const level = getSaturation(area)
  return getSaturationColor(level)
}

function getLabelClass(area: AreaInfo): Record<string, boolean> {
  const level = getSaturation(area)
  return {
    'bg-green-900/60 border-green-500/40 text-green-300': level === '舒适',
    'bg-yellow-900/60 border-yellow-500/40 text-yellow-300': level === '拥挤',
    'bg-orange-900/60 border-orange-500/40 text-orange-300': level === '饱和',
    'bg-red-900/60 border-red-500/40 text-red-300': level === '超载',
  }
}
</script>

<style scoped>
.heat-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.45; }
}

.area-label {
  position: absolute;
  z-index: 10;
  cursor: pointer;
  transition: transform 0.2s;
}

.area-label:hover {
  transform: translate(-50%, -140%) scale(1.1) !important;
}

.area-badge {
  position: absolute;
  z-index: 9;
  pointer-events: none;
}

.area-detail {
  position: absolute;
  z-index: 20;
}
</style>
