<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { init, use } from 'echarts/core'
import type { ECharts } from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, LineChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent, CanvasRenderer])

const props = defineProps<{ data: string }>()

const el = ref<HTMLDivElement>()
let chart: ECharts | null = null
let observer: ResizeObserver | null = null

interface SimpleChartData {
  type?: string
  title?: string
  xAxis?: string[]
  series?: { name: string; data: number[] }[]
}

onMounted(() => {
  if (!el.value) return
  try {
    const raw: SimpleChartData = JSON.parse(props.data)
    chart = init(el.value, null, { renderer: 'canvas' })
    const hasTitle = !!raw.title
    const hasLegend = (raw.series?.length ?? 0) > 1

    chart.setOption({
      backgroundColor: 'transparent',
      title: hasTitle
        ? { text: raw.title, left: 'center', textStyle: { color: 'rgba(255,255,255,0.9)', fontSize: 14 } }
        : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(20,20,40,0.88)',
        borderColor: 'rgba(255,255,255,0.18)',
        textStyle: { color: '#fff' },
      },
      legend: hasLegend
        ? { top: hasTitle ? 30 : 8, textStyle: { color: 'rgba(255,255,255,0.75)' } }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        top: hasTitle && hasLegend ? 64 : hasTitle || hasLegend ? 44 : 24,
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: raw.xAxis || [],
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255,255,255,0.65)' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      },
      series: (raw.series || []).map((s) => ({
        name: s.name,
        type: (raw.type as 'bar' | 'line') || 'bar',
        data: s.data,
        smooth: true,
        lineStyle: { width: 2 },
        areaStyle:
          raw.type === 'line'
            ? { opacity: 0.12 }
            : undefined,
      })),
    })

    observer = new ResizeObserver(() => chart?.resize())
    observer.observe(el.value)
  } catch (_) {
    // parse error — silently skip
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>

<template>
  <div ref="el" class="chart-block" />
</template>

<style scoped>
.chart-block {
  width: 100%;
  height: 280px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  margin: 8px 0;
}
</style>
