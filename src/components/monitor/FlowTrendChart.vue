<template>
  <div class="relative w-full h-full min-h-0">
    <div ref="chartRef" class="w-full h-full"></div>
    <button
      @click="showYesterday = !showYesterday"
      class="absolute top-0 right-0 z-10 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors"
      :class="showYesterday
        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
        : 'bg-slate-800/60 border-slate-600/40 text-gray-400 hover:bg-slate-700/60 hover:text-gray-200'"
    >
      <span class="relative inline-flex items-center justify-center w-7 h-3.5 rounded-full transition-colors"
            :class="showYesterday ? 'bg-cyan-500' : 'bg-slate-600'">
        <span class="absolute w-2.5 h-2.5 rounded-full bg-white shadow transition-all"
              :style="{ left: showYesterday ? 'calc(100% - 11px)' : '2px' }" />
      </span>
      <span>对比昨日</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { FlowDataPoint } from '@/composables/useMonitorData'

const props = defineProps<{
  data: FlowDataPoint[]
  yesterdayData?: FlowDataPoint[]
  peakHour: string
  enterPeakHour: string
}>()

const chartRef = ref<HTMLElement | null>(null)
const showYesterday = ref(false)
let chart: echarts.ECharts | null = null

function renderChart() {
  if (!chart || !props.data.length) return

  const hours = props.data.map(d => d.hour)
  const enterData = props.data.map(d => d.enterCount)
  const exitData = props.data.map(d => d.exitCount)
  const inParkData = props.data.map(d => d.inParkCount)
  const yesterdayInPark = props.yesterdayData?.map(d => d.inParkCount) ?? []

  const series: any[] = [
    {
      name: '入园人数',
      type: 'bar',
      data: enterData,
      barWidth: '20%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#22d3ee' },
          { offset: 1, color: '#0891b2' },
        ]),
        borderRadius: [2, 2, 0, 0],
      },
    },
    {
      name: '出园人数',
      type: 'bar',
      data: exitData,
      barWidth: '20%',
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#a78bfa' },
          { offset: 1, color: '#7c3aed' },
        ]),
        borderRadius: [2, 2, 0, 0],
      },
    },
  ]

  if (showYesterday.value && yesterdayInPark.length === inParkData.length) {
    const baseData = inParkData.map((v, i) => Math.min(v, yesterdayInPark[i]))
    const diffUpData = inParkData.map((v, i) => Math.max(0, v - yesterdayInPark[i]))
    const diffDownData = inParkData.map((v, i) => Math.max(0, yesterdayInPark[i] - v))

    series.push(
      {
        name: '__base_band',
        type: 'line',
        yAxisIndex: 1,
        data: baseData,
        stack: 'diff_band',
        lineStyle: { opacity: 0, width: 0 },
        symbol: 'none',
        silent: true,
        areaStyle: { opacity: 0 },
      },
      {
        name: '高于昨日',
        type: 'line',
        yAxisIndex: 1,
        data: diffUpData,
        stack: 'diff_band',
        lineStyle: { opacity: 0, width: 0 },
        symbol: 'none',
        silent: true,
        areaStyle: {
          color: 'rgba(239, 68, 68, 0.18)',
        },
        tooltip: { show: false },
      },
      {
        name: '低于昨日',
        type: 'line',
        yAxisIndex: 1,
        data: diffDownData,
        stack: 'diff_band',
        lineStyle: { opacity: 0, width: 0 },
        symbol: 'none',
        silent: true,
        areaStyle: {
          color: 'rgba(34, 197, 94, 0.18)',
        },
        tooltip: { show: false },
      }
    )
  }

  const todaySeriesName = showYesterday.value ? '园内总人数（今日）' : '园内总人数'

  series.push({
    name: todaySeriesName,
    type: 'line',
    yAxisIndex: 1,
    data: inParkData,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { color: '#f97316', width: 2 },
    itemStyle: { color: '#f97316', borderColor: '#fff', borderWidth: 1 },
    areaStyle: showYesterday.value
      ? undefined
      : {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(249, 115, 22, 0.25)' },
            { offset: 1, color: 'rgba(249, 115, 22, 0.02)' },
          ]),
        },
    markPoint: !showYesterday.value
      ? {
          data: [
            {
              type: 'max',
              name: '最高',
              symbolSize: 40,
              label: { fontSize: 9, color: '#fff' },
              itemStyle: { color: '#ef4444' },
            },
          ],
        }
      : undefined,
    markLine: {
      silent: true,
      data: [
        {
          yAxis: 2000,
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
          label: { formatter: '承载上限', color: '#ef4444', fontSize: 9 },
        },
      ],
    },
  })

  if (showYesterday.value && yesterdayInPark.length === inParkData.length) {
    series.push({
      name: '园内总人数（昨日）',
      type: 'line',
      yAxisIndex: 1,
      data: yesterdayInPark,
      smooth: true,
      symbol: 'emptyCircle',
      symbolSize: 5,
      lineStyle: { color: '#94a3b8', width: 2, type: 'dashed' },
      itemStyle: { color: '#94a3b8' },
      z: 3,
    })
  }

  const legendData = showYesterday.value && yesterdayInPark.length === inParkData.length
    ? ['入园人数', '出园人数', '园内总人数（今日）', '园内总人数（昨日）']
    : ['入园人数', '出园人数', '园内总人数']

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#06b6d4',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter(params: any[]) {
        if (!params.length) return ''
        const axisValue = params[0].axisValue
        let html = `<div style="font-weight:bold;margin-bottom:6px">${axisValue}</div>`

        const todayInPark = params.find(p => p.seriesName === '园内总人数（今日）' || p.seriesName === '园内总人数')
        const yesterdayInParkP = params.find(p => p.seriesName === '园内总人数（昨日）')

        params.forEach((p: any) => {
          if (['__base_band', '高于昨日', '低于昨日'].includes(p.seriesName)) return
          html += `<div style="display:flex;align-items:center;gap:4px;margin:2px 0">
            ${p.marker} ${p.seriesName}：<b>${p.value}</b>人
          </div>`
        })

        if (todayInPark && yesterdayInParkP) {
          const diff = todayInPark.value - yesterdayInParkP.value
          const sign = diff > 0 ? '+' : ''
          const color = diff > 0 ? '#ef4444' : diff < 0 ? '#22c55e' : '#94a3b8'
          const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '='
          html += `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #334155">
            <span style="color:${color}">${arrow} 较昨日 ${sign}${diff} 人</span>
          </div>`
        }

        return html
      },
    },
    legend: {
      top: 0,
      right: 96,
      data: legendData,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      itemGap: 16,
    },
    grid: {
      top: 36,
      left: 12,
      right: 16,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: hours,
      axisLine: { lineStyle: { color: '#334155' } },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    yAxis: [
      {
        type: 'value',
        name: '人数',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      {
        type: 'value',
        name: '园内总数',
        nameTextStyle: { color: '#94a3b8', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
    ],
    series,
  }, true)
}

onMounted(() => {
  if (chartRef.value) {
    chart = echarts.init(chartRef.value, 'dark')
    renderChart()

    const ro = new ResizeObserver(() => {
      chart?.resize()
    })
    ro.observe(chartRef.value)
  }
})

onUnmounted(() => {
  chart?.dispose()
})

watch(() => props.data, renderChart, { deep: true })
watch(() => props.yesterdayData, renderChart, { deep: true })
watch(showYesterday, renderChart)
</script>
