<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import TableBlock from './TableBlock.vue'

const ChartBlock = defineAsyncComponent(() => import('./ChartBlock.vue'))
const MermaidBlock = defineAsyncComponent(() => import('./MermaidBlock.vue'))

const props = defineProps<{
  content: string
  pending?: boolean
  failed?: boolean
}>()

type SegType = 'markdown' | 'chart' | 'datatable' | 'mermaid'

interface Segment {
  type: SegType
  content: string
}

function parseSegments(raw: string): Segment[] {
  const re = /```(chart|datatable|mermaid)\n([\s\S]*?)```/g
  const segs: Segment[] = []
  let last = 0

  for (const m of raw.matchAll(re)) {
    if (m.index! > last) {
      const txt = raw.slice(last, m.index).trim()
      if (txt) segs.push({ type: 'markdown', content: txt })
    }
    const blockType = m[1]
    const blockContent = m[2]
    if (blockType && blockContent !== undefined) {
      segs.push({ type: blockType as SegType, content: blockContent.trim() })
    }
    last = m.index! + m[0].length
  }

  const rest = raw.slice(last).trim()
  if (rest) segs.push({ type: 'markdown', content: rest })

  return segs.length ? segs : [{ type: 'markdown', content: raw }]
}

function renderMd(md: string): string {
  return DOMPurify.sanitize(marked.parse(md) as string)
}

const segments = computed(() => parseSegments(props.content))
</script>

<template>
  <div class="message-body" :class="{ pending, failed }">
    <template v-for="(seg, i) in segments" :key="i">
      <div v-if="seg.type === 'markdown'" class="seg-md" v-html="renderMd(seg.content)" />
      <ChartBlock v-else-if="seg.type === 'chart'" :data="seg.content" />
      <TableBlock v-else-if="seg.type === 'datatable'" :data="seg.content" />
      <MermaidBlock v-else-if="seg.type === 'mermaid'" :code="seg.content" />
    </template>
  </div>
</template>

<style scoped>
.seg-md :deep(p) {
  margin: 0 0 0.5em;
  white-space: pre-wrap;
  word-break: break-word;
}

.seg-md :deep(p:last-child) {
  margin-bottom: 0;
}

.seg-md :deep(ul),
.seg-md :deep(ol) {
  margin: 0.2em 0 0.5em;
  padding-left: 1.4em;
}

.seg-md :deep(li) {
  margin-bottom: 0.2em;
}

.seg-md :deep(pre) {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 10px;
  padding: 12px 14px;
  overflow-x: auto;
  font-size: 0.85em;
  margin: 0.4em 0;
}

.seg-md :deep(code) {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.88em;
}

.seg-md :deep(pre code) {
  background: none;
  padding: 0;
}

.seg-md :deep(h1),
.seg-md :deep(h2),
.seg-md :deep(h3) {
  margin: 0.6em 0 0.3em;
  font-weight: 600;
}

.seg-md :deep(blockquote) {
  margin: 0.4em 0;
  padding: 6px 12px;
  border-left: 3px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
}

.seg-md :deep(table) {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.9em;
  margin: 0.4em 0;
}

.seg-md :deep(th),
.seg-md :deep(td) {
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 10px;
}

.seg-md :deep(th) {
  background: rgba(255, 255, 255, 0.08);
  font-weight: 600;
}
</style>
