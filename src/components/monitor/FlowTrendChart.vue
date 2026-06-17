<template>
  <div ref="chartRef" class="w-full h-full min-h-0"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { FlowDataPoint } from '@/composables/useMonitorData'

const props = defineProps<{
  data: FlowDataPoint[]
  peakHour: string
  enterPeakHour: string
}>()

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

function renderChart() {
  if (!chart || !props.data.length) return

  const hours = props.data.map(d => d.hour)
  const enterData = props.data.map(d => d.enterCount)
  const exitData = props.data.map(d => d.exitCount)
  const inParkData = props.data.map(d => d.inParkCount)

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: '#06b6d4',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter(params: any) {
        let html = `<div style="font-weight:bold;margin-bottom:4px">${params[0].axisValue}</div>`
        params.forEach((p: any) => {
          html += `<div style="display:flex;align-items:center;gap:4px;margin:2px 0">
            ${p.marker} ${p.seriesName}：<b>${p.value}</b>人
          </div>`
        })
        return html
      },
    },
    legend: {
      top: 0,
      right: 10,
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
    series: [
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
      {
        name: '园内总人数',
        type: 'line',
        yAxisIndex: 1,
        data: inParkData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#f97316', width: 2 },
        itemStyle: { color: '#f97316', borderColor: '#fff', borderWidth: 1 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(249, 115, 22, 0.25)' },
            { offset: 1, color: 'rgba(249, 115, 22, 0.02)' },
          ]),
        },
        markPoint: {
          data: [
            {
              type: 'max',
              name: '最高',
              symbolSize: 40,
              label: { fontSize: 9, color: '#fff' },
              itemStyle: { color: '#ef4444' },
            },
          ],
        },
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
      },
    ],
  })
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
</script>
