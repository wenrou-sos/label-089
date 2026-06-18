import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import {
  useMonitorData,
  getSaturation,
  getSaturationColor,
  type SaturationLevel,
  type AreaInfo,
  type OverloadAction,
} from '../useMonitorData'

type UseMonitorDataReturn = ReturnType<typeof useMonitorData>
function mountComposable() {
  let captured: UseMonitorDataReturn | null = null
  const App = defineComponent({
    setup() {
      captured = useMonitorData()
      return captured as any
    },
    template: '<div />',
  })
  const wrapper = mount(App)
  const data = captured as UseMonitorDataReturn
  return {
    wrapper,
    data,
    closeOverloadModal: (action?: OverloadAction) => data.closeOverloadModal(action),
    dismissWeatherAlert: (i: number) => data.dismissWeatherAlert(i),
  }
}

describe('getSaturation 饱和度分级', () => {
  const makeArea = (ratio: number): AreaInfo => ({
    id: 'test',
    name: '测试区域',
    icon: '📍',
    x: 50,
    y: 50,
    capacity: 100,
    currentCount: Math.round(100 * ratio),
    category: '测试',
  })

  it('ratio < 0.6 → 舒适', () => {
    expect(getSaturation(makeArea(0))).toBe<SaturationLevel>('舒适')
    expect(getSaturation(makeArea(0.59))).toBe<SaturationLevel>('舒适')
  })

  it('0.6 ≤ ratio < 0.85 → 拥挤', () => {
    expect(getSaturation(makeArea(0.6))).toBe<SaturationLevel>('拥挤')
    expect(getSaturation(makeArea(0.84))).toBe<SaturationLevel>('拥挤')
  })

  it('0.85 ≤ ratio < 1.0 → 饱和', () => {
    expect(getSaturation(makeArea(0.85))).toBe<SaturationLevel>('饱和')
    expect(getSaturation(makeArea(0.99))).toBe<SaturationLevel>('饱和')
  })

  it('ratio ≥ 1.0 → 超载', () => {
    expect(getSaturation(makeArea(1.0))).toBe<SaturationLevel>('超载')
    expect(getSaturation(makeArea(1.5))).toBe<SaturationLevel>('超载')
  })
})

describe('getSaturationColor 颜色映射', () => {
  it('舒适 → 绿色', () => {
    expect(getSaturationColor('舒适')).toBe('#22c55e')
  })
  it('拥挤 → 黄色', () => {
    expect(getSaturationColor('拥挤')).toBe('#eab308')
  })
  it('饱和 → 橙色', () => {
    expect(getSaturationColor('饱和')).toBe('#f97316')
  })
  it('超载 → 红色', () => {
    expect(getSaturationColor('超载')).toBe('#ef4444')
  })
})

describe('useMonitorData - 园内总人数 totalInPark（Bug #1 修复验证）', () => {
  it('初始值等于各区域 currentCount 之和', () => {
    const { data, wrapper } = mountComposable()
    const expected = data.areas.reduce((s, a) => s + a.currentCount, 0)
    expect(data.totalInPark.value).toBe(Math.round(expected))
    wrapper.unmount()
  })

  it('不是 flowData 最后一项的 inParkCount（修复前的错误逻辑）', () => {
    const { data, wrapper } = mountComposable()
    const wrongValue = data.flowData.value[data.flowData.value.length - 1]?.inParkCount ?? 0
    const realValue = data.areas.reduce((s, a) => s + a.currentCount, 0)
    expect(data.totalInPark.value).toBe(Math.round(realValue))
    expect(data.totalInPark.value).not.toBe(wrongValue)
    wrapper.unmount()
  })

  it('修改某个区域人数后 totalInPark 会响应式更新', async () => {
    const { data, wrapper } = mountComposable()
    const before = data.totalInPark.value
    data.areas[0].currentCount += 100
    await nextTick()
    expect(data.totalInPark.value).toBe(before + 100)
    wrapper.unmount()
  })
})

describe('useMonitorData - 超载弹窗"暂时忽略"不再重复弹出（Bug #2 修复验证）', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('初始超载区域会在 setTimeout(checkOverload, 2000) 后触发弹窗', () => {
    const { data, wrapper } = mountComposable()
    expect(data.overloadedAreas.value.length).toBeGreaterThan(0)
    expect(data.overloadModal.visible).toBe(false)
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    expect(data.overloadModal.areaId).not.toBe('')
    wrapper.unmount()
  })

  it('点"暂时忽略"(dismiss) 后该区域不再触发弹窗，即使仍超载', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const dismissedId = data.overloadModal.areaId
    const dismissedArea = data.areas.find(a => a.id === dismissedId)!
    data.areas.forEach(a => {
      if (a.id !== dismissedId) a.currentCount = Math.floor(a.capacity * 0.3)
    })
    dismissedArea.currentCount = dismissedArea.capacity * 1.5
    expect(getSaturation(dismissedArea)).toBe('超载')
    closeOverloadModal('dismiss')
    expect(data.overloadModal.visible).toBe(false)
    vi.advanceTimersByTime(15000)
    expect(data.overloadModal.visible).toBe(false)
    wrapper.unmount()
  })

  it('点"立即启动限流"(limit) 后，如果区域仍超载会继续弹出', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const limitId = data.overloadModal.areaId
    const limitArea = data.areas.find(a => a.id === limitId)!
    closeOverloadModal('limit')
    expect(data.overloadModal.visible).toBe(false)
    limitArea.currentCount = limitArea.capacity * 1.2
    vi.advanceTimersByTime(10000)
    expect(data.overloadModal.visible).toBe(true)
    wrapper.unmount()
  })

  it('被忽略的区域恢复正常（非超载）后再次超载时，应该重新弹窗', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const dismissedId = data.overloadModal.areaId
    const dismissedArea = data.areas.find(a => a.id === dismissedId)!
    data.areas.forEach(a => {
      if (a.id !== dismissedId) a.currentCount = Math.floor(a.capacity * 0.3)
    })
    closeOverloadModal('dismiss')
    dismissedArea.currentCount = Math.floor(dismissedArea.capacity * 0.5)
    expect(getSaturation(dismissedArea)).not.toBe('超载')
    vi.advanceTimersByTime(10000)
    expect(data.overloadModal.visible).toBe(false)
    dismissedArea.currentCount = Math.floor(dismissedArea.capacity * 1.5)
    expect(getSaturation(dismissedArea)).toBe('超载')
    vi.advanceTimersByTime(15000)
    expect(data.overloadModal.visible).toBe(true)
    expect(data.overloadModal.areaId).toBe(dismissedId)
    expect(data.overloadedAreas.value.map(a => a.id)).toContain(dismissedId)
    wrapper.unmount()
  })

  it('多个超载区域时，忽略第一个区域后，其他区域仍可触发弹窗', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const firstId = data.overloadModal.areaId
    closeOverloadModal('dismiss')
    expect(data.overloadModal.visible).toBe(false)
    const otherOverloaded = data.areas.find(
      a => a.id !== firstId && getSaturation(a) === '超载'
    )
    if (otherOverloaded) {
      vi.advanceTimersByTime(10000)
      expect(data.overloadModal.visible).toBe(true)
      expect(data.overloadModal.areaId).toBe(otherOverloaded.id)
    }
    wrapper.unmount()
  })
})

describe('useMonitorData - 其他派生数据', () => {
  it('peakHour 返回 flowData 中园内人数最高的小时', () => {
    const { data, wrapper } = mountComposable()
    const maxPoint = data.flowData.value.reduce((p, c) =>
      c.inParkCount > p.inParkCount ? c : p
    )
    expect(data.peakHour.value).toBe(maxPoint.hour)
    wrapper.unmount()
  })

  it('enterPeakHour 返回 flowData 中入园人数最高的小时', () => {
    const { data, wrapper } = mountComposable()
    const maxPoint = data.flowData.value.reduce((p, c) =>
      c.enterCount > p.enterCount ? c : p
    )
    expect(data.enterPeakHour.value).toBe(maxPoint.hour)
    wrapper.unmount()
  })

  it('dismissWeatherAlert 可关闭天气预警', () => {
    const { data, wrapper, dismissWeatherAlert } = mountComposable()
    if (data.weatherAlerts.length > 0) {
      expect(data.weatherAlerts[0].active).toBe(true)
      dismissWeatherAlert(0)
      expect(data.weatherAlerts[0].active).toBe(false)
    }
    wrapper.unmount()
  })
})

describe('useMonitorData - 边界与补充场景', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('totalInPark 所有区域人数为 0 时返回 0', () => {
    const { data, wrapper } = mountComposable()
    data.areas.forEach(a => { a.currentCount = 0 })
    expect(data.totalInPark.value).toBe(0)
    wrapper.unmount()
  })

  it('overloadedAreas 响应式 - 区域从超载变为正常时从列表移除', async () => {
    const { data, wrapper } = mountComposable()
    const overloaded = data.overloadedAreas.value
    expect(overloaded.length).toBeGreaterThan(0)
    const first = overloaded[0]
    first.currentCount = Math.floor(first.capacity * 0.5)
    await nextTick()
    expect(data.overloadedAreas.value.map(a => a.id)).not.toContain(first.id)
    wrapper.unmount()
  })

  it('closeOverloadModal 不传参数时默认为 dismiss', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const areaId = data.overloadModal.areaId
    data.areas.forEach(a => {
      if (a.id !== areaId) a.currentCount = Math.floor(a.capacity * 0.3)
    })
    closeOverloadModal()
    expect(data.overloadModal.visible).toBe(false)
    const area = data.areas.find(a => a.id === areaId)!
    area.currentCount = area.capacity * 1.5
    vi.advanceTimersByTime(15000)
    expect(data.overloadModal.visible).toBe(false)
    wrapper.unmount()
  })

  it('超载弹窗字段填充正确 - areaId/areaName/currentCount/capacity/suggestion', () => {
    const { data, wrapper } = mountComposable()
    vi.advanceTimersByTime(2000)
    expect(data.overloadModal.visible).toBe(true)
    const area = data.areas.find(a => a.id === data.overloadModal.areaId)!
    expect(data.overloadModal.areaName).toBe(area.name)
    expect(data.overloadModal.currentCount).toBe(Math.round(area.currentCount))
    expect(data.overloadModal.capacity).toBe(area.capacity)
    expect(data.overloadModal.suggestion).toContain(area.name)
    expect(data.overloadModal.suggestion).toMatch(/\d+人/)
    expect(data.overloadModal.suggestion).toMatch(/\d+%/)
    wrapper.unmount()
  })

  it('多个超载区域分别 dismiss 后均不再重复弹出', () => {
    const { data, wrapper, closeOverloadModal } = mountComposable()
    vi.advanceTimersByTime(2000)
    const dismissedIds: string[] = []
    while (data.overloadModal.visible) {
      dismissedIds.push(data.overloadModal.areaId)
      closeOverloadModal('dismiss')
      vi.advanceTimersByTime(4000)
      if (dismissedIds.length > 10) break
    }
    const allOverloaded = data.overloadedAreas.value.map(a => a.id)
    dismissedIds.forEach(id => {
      expect(allOverloaded).toContain(id)
    })
    vi.advanceTimersByTime(4000)
    expect(data.overloadModal.visible).toBe(false)
    wrapper.unmount()
  })

  it('getAlternativeArea 优先推荐舒适区域', () => {
    const { data, wrapper } = mountComposable()
    const anyComfort = data.areas.find(a => getSaturation(a) === '舒适')
    if (anyComfort) {
      const overloaded = data.overloadedAreas.value[0]
      if (overloaded) {
        vi.advanceTimersByTime(2000)
        const comfortNames = data.areas
          .filter(a => a.id !== overloaded.id && getSaturation(a) === '舒适')
          .map(a => a.name)
        comfortNames.forEach(name => {
          expect(data.overloadModal.suggestion).toContain(name)
        })
      }
    }
    wrapper.unmount()
  })
})

describe('useMonitorData - 昨日客流数据对比', () => {
  it('yesterdayFlowData 长度与 flowData 一致', () => {
    const { data, wrapper } = mountComposable()
    expect(data.yesterdayFlowData.value.length).toBe(data.flowData.value.length)
    wrapper.unmount()
  })

  it('yesterdayFlowData 每个时段 hour 字段与 flowData 对齐', () => {
    const { data, wrapper } = mountComposable()
    data.flowData.value.forEach((d, i) => {
      expect(data.yesterdayFlowData.value[i]?.hour).toBe(d.hour)
    })
    wrapper.unmount()
  })

  it('yesterdayFlowData 数值为非负整数', () => {
    const { data, wrapper } = mountComposable()
    data.yesterdayFlowData.value.forEach(d => {
      expect(Number.isInteger(d.enterCount)).toBe(true)
      expect(Number.isInteger(d.exitCount)).toBe(true)
      expect(Number.isInteger(d.inParkCount)).toBe(true)
      expect(d.enterCount).toBeGreaterThanOrEqual(0)
      expect(d.exitCount).toBeGreaterThanOrEqual(0)
      expect(d.inParkCount).toBeGreaterThanOrEqual(0)
    })
    wrapper.unmount()
  })

  it('yesterdayPeakHour 返回昨日数据中 inParkCount 最高的时段', () => {
    const { data, wrapper } = mountComposable()
    if (data.yesterdayFlowData.value.length > 0) {
      const expected = data.yesterdayFlowData.value.reduce(
        (p, c) => (c.inParkCount > p.inParkCount ? c : p)
      )
      expect(data.yesterdayPeakHour.value).toBe(expected.hour)
    }
    wrapper.unmount()
  })

  it('yesterdayFlowData 与 flowData 同时段存在差异（模拟值非完全相等）', () => {
    const { data, wrapper } = mountComposable()
    let diffCount = 0
    data.flowData.value.forEach((d, i) => {
      const y = data.yesterdayFlowData.value[i]
      if (y && y.inParkCount !== d.inParkCount) diffCount++
    })
    expect(diffCount).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('yesterdayFlowData 始终包含 06:00 至 21:00 共 16 个小时时段', () => {
    const { data, wrapper } = mountComposable()
    expect(data.yesterdayFlowData.value.length).toBe(16)
    expect(data.yesterdayFlowData.value[0]?.hour).toBe('06:00')
    expect(data.yesterdayFlowData.value[15]?.hour).toBe('21:00')
    wrapper.unmount()
  })
})
