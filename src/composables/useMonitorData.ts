import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'

export type SaturationLevel = '舒适' | '拥挤' | '饱和' | '超载'

export interface AreaInfo {
  id: string
  name: string
  icon: string
  x: number
  y: number
  currentCount: number
  capacity: number
  category: string
}

export interface QueueInfo {
  id: string
  name: string
  waitMinutes: number
}

export interface ParkingLot {
  id: string
  name: string
  total: number
  remaining: number
}

export interface FlowDataPoint {
  hour: string
  enterCount: number
  exitCount: number
  inParkCount: number
}

export interface WeatherAlert {
  type: string
  level: string
  color: string
  message: string
  active: boolean
}

export type OverloadAction = 'limit' | 'dismiss'

const AREAS: AreaInfo[] = [
  { id: 'a1', name: '游客中心', icon: '🏛️', x: 25, y: 70, currentCount: 320, capacity: 500, category: '服务' },
  { id: 'a2', name: '检票口', icon: '🎫', x: 45, y: 65, currentCount: 180, capacity: 200, category: '入口' },
  { id: 'a3', name: '索道站', icon: '🚡', x: 50, y: 20, currentCount: 450, capacity: 300, category: '交通' },
  { id: 'a4', name: '云海观景台', icon: '🏔️', x: 35, y: 30, currentCount: 280, capacity: 400, category: '观景' },
  { id: 'a5', name: '日出观景台', icon: '🌅', x: 65, y: 35, currentCount: 520, capacity: 350, category: '观景' },
  { id: 'a6', name: '洗手间A', icon: '🚻', x: 20, y: 50, currentCount: 30, capacity: 80, category: '服务' },
  { id: 'a7', name: '餐饮区', icon: '🍜', x: 70, y: 60, currentCount: 260, capacity: 300, category: '餐饮' },
  { id: 'a8', name: '瀑布观景台', icon: '💧', x: 30, y: 45, currentCount: 190, capacity: 250, category: '观景' },
  { id: 'a9', name: '索道下站', icon: '🚡', x: 55, y: 75, currentCount: 350, capacity: 300, category: '交通' },
  { id: 'a10', name: '洗手间B', icon: '🚻', x: 75, y: 45, currentCount: 15, capacity: 60, category: '服务' },
]

const QUEUES: QueueInfo[] = [
  { id: 'q1', name: '云海观景台', waitMinutes: 12 },
  { id: 'q2', name: '日出观景台', waitMinutes: 35 },
  { id: 'q3', name: '索道站（上行）', waitMinutes: 25 },
  { id: 'q4', name: '瀑布观景台', waitMinutes: 8 },
  { id: 'q5', name: '检票口', waitMinutes: 15 },
]

const PARKING: ParkingLot[] = [
  { id: 'p1', name: 'P1 主停车场', total: 800, remaining: 45 },
  { id: 'p2', name: 'P2 东停车场', total: 500, remaining: 180 },
  { id: 'p3', name: 'P3 西停车场', total: 600, remaining: 320 },
  { id: 'p4', name: 'P4 备用停车场', total: 300, remaining: 290 },
]

function generateFlowData(): FlowDataPoint[] {
  const data: FlowDataPoint[] = []
  let inPark = 0
  for (let h = 6; h <= 21; h++) {
    const hour = `${h.toString().padStart(2, '0')}:00`
    let enter: number, exit: number
    if (h >= 6 && h <= 9) {
      enter = Math.floor(200 + Math.random() * 400)
      exit = Math.floor(20 + Math.random() * 50)
    } else if (h >= 10 && h <= 12) {
      enter = Math.floor(100 + Math.random() * 200)
      exit = Math.floor(50 + Math.random() * 100)
    } else if (h >= 13 && h <= 15) {
      enter = Math.floor(50 + Math.random() * 100)
      exit = Math.floor(80 + Math.random() * 150)
    } else {
      enter = Math.floor(10 + Math.random() * 30)
      exit = Math.floor(150 + Math.random() * 300)
    }
    inPark = Math.max(0, inPark + enter - exit)
    data.push({ hour, enterCount: enter, exitCount: exit, inParkCount: inPark })
  }
  return data
}

const WEATHER_ALERTS: WeatherAlert[] = [
  {
    type: '暴雨预警',
    level: '橙色',
    color: '#f97316',
    message: '气象台发布暴雨橙色预警，预计14:00-18:00有强降雨，建议暂停索道运营及户外观景项目，引导游客进入室内区域。',
    active: true,
  },
]

export function getSaturation(area: AreaInfo): SaturationLevel {
  const ratio = area.currentCount / area.capacity
  if (ratio < 0.6) return '舒适'
  if (ratio < 0.85) return '拥挤'
  if (ratio < 1.0) return '饱和'
  return '超载'
}

export function getSaturationColor(level: SaturationLevel): string {
  switch (level) {
    case '舒适': return '#22c55e'
    case '拥挤': return '#eab308'
    case '饱和': return '#f97316'
    case '超载': return '#ef4444'
  }
}

export function useMonitorData() {
  const areas = reactive<AreaInfo[]>(AREAS.map(a => ({ ...a })))
  const queues = reactive<QueueInfo[]>(QUEUES.map(q => ({ ...q })))
  const parking = reactive<ParkingLot[]>(PARKING.map(p => ({ ...p })))
  const flowData = ref<FlowDataPoint[]>(generateFlowData())
  const weatherAlerts = reactive<WeatherAlert[]>(WEATHER_ALERTS.map(w => ({ ...w })))
  const currentTime = ref(new Date())
  const overloadModal = reactive({
    visible: false,
    areaId: '',
    areaName: '',
    currentCount: 0,
    capacity: 0,
    suggestion: '',
  })
  const dismissedOverloadAreas = reactive<Set<string>>(new Set())

  const overloadedAreas = computed(() =>
    areas.filter(a => getSaturation(a) === '超载')
  )

  const peakHour = computed(() => {
    if (!flowData.value.length) return '--'
    const max = flowData.value.reduce((prev, curr) =>
      curr.inParkCount > prev.inParkCount ? curr : prev
    )
    return max.hour
  })

  const enterPeakHour = computed(() => {
    if (!flowData.value.length) return '--'
    const max = flowData.value.reduce((prev, curr) =>
      curr.enterCount > prev.enterCount ? curr : prev
    )
    return max.hour
  })

  const totalInPark = computed(() =>
    Math.round(areas.reduce((sum, a) => sum + a.currentCount, 0))
  )

  let timer: ReturnType<typeof setInterval> | null = null
  let clockTimer: ReturnType<typeof setInterval> | null = null

  function simulateUpdate() {
    areas.forEach(area => {
      const delta = Math.floor((Math.random() - 0.45) * 40)
      area.currentCount = Math.max(0, Math.min(area.capacity * 1.3, area.currentCount + delta))
    })

    queues.forEach(q => {
      const delta = Math.floor((Math.random() - 0.4) * 8)
      q.waitMinutes = Math.max(0, q.waitMinutes + delta)
    })

    parking.forEach(p => {
      const delta = Math.floor((Math.random() - 0.55) * 15)
      p.remaining = Math.max(0, Math.min(p.total, p.remaining + delta))
    })

    cleanupDismissedAreas()
    checkOverload()
  }

  function cleanupDismissedAreas() {
    const currentOverloadedIds = new Set(overloadedAreas.value.map(a => a.id))
    for (const id of Array.from(dismissedOverloadAreas)) {
      if (!currentOverloadedIds.has(id)) {
        dismissedOverloadAreas.delete(id)
      }
    }
  }

  function checkOverload() {
    const overloaded = overloadedAreas.value.filter(a => !dismissedOverloadAreas.has(a.id))
    if (overloaded.length > 0 && !overloadModal.visible) {
      const area = overloaded[0]
      overloadModal.visible = true
      overloadModal.areaId = area.id
      overloadModal.areaName = area.name
      overloadModal.currentCount = Math.round(area.currentCount)
      overloadModal.capacity = area.capacity
      const ratio = (area.currentCount / area.capacity * 100).toFixed(0)
      overloadModal.suggestion = `${area.name}当前人数${Math.round(area.currentCount)}人，已达容量${ratio}%，建议立即启动限流措施，引导游客前往${getAlternativeArea(area.id)}等低密度区域。`
    }
  }

  function getAlternativeArea(areaId: string): string {
    const lowDensity = areas.filter(a => a.id !== areaId && getSaturation(a) === '舒适')
    if (lowDensity.length > 0) return lowDensity.map(a => a.name).join('、')
    return '其他区域'
  }

  function closeOverloadModal(action: OverloadAction = 'dismiss') {
    const areaId = overloadModal.areaId
    overloadModal.visible = false
    overloadModal.areaId = ''
    if (action === 'dismiss' && areaId) {
      dismissedOverloadAreas.add(areaId)
    }
  }

  function dismissWeatherAlert(index: number) {
    weatherAlerts[index].active = false
  }

  onMounted(() => {
    timer = setInterval(simulateUpdate, 5000)
    clockTimer = setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
    setTimeout(checkOverload, 2000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    if (clockTimer) clearInterval(clockTimer)
  })

  return {
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
  }
}
