<script setup lang="ts">
import { onMounted, ref } from 'vue'
import mermaid from 'mermaid'

const props = defineProps<{ code: string }>()

const svgHtml = ref('')
const hasError = ref(false)

let initialized = false

onMounted(async () => {
  if (!initialized) {
    initialized = true
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#7aa2f7',
        primaryTextColor: '#c0caf5',
        primaryBorderColor: 'rgba(255,255,255,0.25)',
        lineColor: 'rgba(255,255,255,0.45)',
        mainBkg: 'rgba(255,255,255,0.07)',
        nodeBorder: 'rgba(255,255,255,0.3)',
        clusterBkg: 'rgba(255,255,255,0.05)',
        titleColor: '#c0caf5',
        edgeLabelBackground: 'rgba(20,20,40,0.7)',
      },
    })
  }

  const id = `mmd-${Math.random().toString(36).slice(2, 9)}`
  try {
    const { svg } = await mermaid.render(id, props.code)
    svgHtml.value = svg
  } catch (_) {
    hasError.value = true
  }
})
</script>

<template>
  <div class="mermaid-block">
    <div v-if="svgHtml" class="mermaid-svg" v-html="svgHtml" />
    <p v-else-if="hasError" class="mermaid-error">Mermaid 渲染失败，请检查语法</p>
    <p v-else class="mermaid-loading">图表生成中...</p>
  </div>
</template>

<style scoped>
.mermaid-block {
  margin: 8px 0;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: auto;
}

.mermaid-svg :deep(svg) {
  max-width: 100%;
  height: auto;
  background: transparent !important;
}

.mermaid-error {
  color: #ffd4d4;
  margin: 0;
  font-size: 0.88rem;
}

.mermaid-loading {
  margin: 0;
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
