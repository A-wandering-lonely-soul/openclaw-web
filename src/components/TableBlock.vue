<script setup lang="ts">
interface TableData {
  headers: string[]
  rows: string[][]
}

const props = defineProps<{ data: string }>()

function parse(): TableData | null {
  try {
    return JSON.parse(props.data) as TableData
  } catch {
    return null
  }
}

const table = parse()
</script>

<template>
  <div v-if="table" class="table-block">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="h in table.headers" :key="h">{{ h }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in table.rows" :key="ri">
          <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <pre v-else class="table-error">无法解析表格数据</pre>
</template>

<style scoped>
.table-block {
  margin: 8px 0;
  overflow-x: auto;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.data-table th,
.data-table td {
  padding: 9px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  white-space: nowrap;
}

.data-table thead th {
  background: rgba(255, 255, 255, 0.09);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.84rem;
  letter-spacing: 0.04em;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.04);
}

.table-error {
  color: #ffd4d4;
  font-size: 0.85rem;
  margin: 0;
}
</style>
