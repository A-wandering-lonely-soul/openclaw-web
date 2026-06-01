<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { fetchMarketQuote, fetchWatchlist, saveWatchlist, type WatchItem } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import type { StockQuote, GoldQuote } from '@/lib/types'

const { username } = storeToRefs(useAuthStore())

// 默认自选：A 股主要板块 ETF（仅首次无数据时使用）
const DEFAULT_WATCHLIST: WatchItem[] = [
  { symbol: '512660', kind: 'stock', label: '军工ETF' },
  { symbol: '515220', kind: 'stock', label: '电力ETF' },
  { symbol: '588000', kind: 'stock', label: '科创50' },
  { symbol: '516160', kind: 'stock', label: '新能源ETF' },
  { symbol: '159928', kind: 'stock', label: '消费ETF' },
  { symbol: '512010', kind: 'stock', label: '医药ETF' },
]

// ── 搜索 ────────────────────────────────────────────────────────────────────
const searchInput = ref('')
const searchKind = ref<'stock' | 'gold'>('stock')
const searchResult = ref<StockQuote | GoldQuote | null>(null)
const searchError = ref('')
const searching = ref(false)

// ── 自选 ─────────────────────────────────────────────────────────────────────
const watchlist = ref<WatchItem[]>([])
const watchlistLoading = ref(true)
const watchData = reactive<Record<string, StockQuote | GoldQuote | null>>({})
const watchLoading = reactive<Record<string, boolean>>({})
const watchError = reactive<Record<string, string>>({})

async function persistWatchlist() {
  if (!username.value) return
  try {
    await saveWatchlist(username.value, watchlist.value)
  } catch (e) {
    console.error('[watchlist] save failed', e)
  }
}
// ── 添加自选表单 ──────────────────────────────────────────────────────────────
const showAddForm = ref(false)
const addSymbol = ref('')
const addKind = ref<'stock' | 'gold'>('stock')
const addError = ref('')
const adding = ref(false)

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toFixed(2)
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${v.toFixed(2)}%`
}
function pctClass(v: number | null | undefined): string {
  if (v == null) return ''
  return v > 0 ? 'up' : v < 0 ? 'down' : ''
}
function fmtVol(v: number | null | undefined): string {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿手`
  if (n >= 1e4) return `${(n / 1e4).toFixed(2)}万手`
  return String(n)
}
function fmtAmt(v: number | null | undefined): string {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}亿`
  if (n >= 1e4) return `${(n / 1e4).toFixed(2)}万`
  return String(n)
}
function isStock(q: StockQuote | GoldQuote | null): q is StockQuote {
  return q !== null && 'code' in q
}

// ── 搜索操作 ─────────────────────────────────────────────────────────────────
async function doSearch() {
  const sym = searchInput.value.trim()
  if (!sym) return
  searching.value = true
  searchError.value = ''
  searchResult.value = null
  try {
    searchResult.value = await fetchMarketQuote(sym, searchKind.value)
  } catch (e: unknown) {
    searchError.value = e instanceof Error ? e.message : '查询失败'
  } finally {
    searching.value = false
  }
}

function addSearchToWatchlist() {
  if (!searchResult.value) return
  const sym = isStock(searchResult.value)
    ? (searchResult.value as StockQuote).code
    : (searchResult.value as GoldQuote).symbol
  if (watchlist.value.some((w) => w.symbol === sym)) return
  watchlist.value.unshift({ symbol: sym, kind: searchKind.value })
  persistWatchlist()
  watchData[sym] = searchResult.value
}

// ── 自选操作 ─────────────────────────────────────────────────────────────────
async function loadWatch(item: WatchItem) {
  watchLoading[item.symbol] = true
  watchError[item.symbol] = ''
  try {
    watchData[item.symbol] = await fetchMarketQuote(item.symbol, item.kind)
  } catch (e: unknown) {
    watchError[item.symbol] = e instanceof Error ? e.message : '查询失败'
    watchData[item.symbol] = null
  } finally {
    watchLoading[item.symbol] = false
  }
}
async function refreshAllWatch() {
  await Promise.allSettled(watchlist.value.map(loadWatch))
}
function removeWatch(item: WatchItem) {
  watchlist.value = watchlist.value.filter((w) => w.symbol !== item.symbol)
  persistWatchlist()
}

// ── 添加自选 ─────────────────────────────────────────────────────────────────
async function confirmAdd() {
  const sym = addSymbol.value.trim()
  if (!sym) return
  if (watchlist.value.some((w) => w.symbol === sym)) {
    addError.value = '该标的已在自选中'
    return
  }
  adding.value = true
  addError.value = ''
  try {
    const quote = await fetchMarketQuote(sym, addKind.value)
    watchlist.value.unshift({ symbol: sym, kind: addKind.value })
    persistWatchlist()
    watchData[sym] = quote
    addSymbol.value = ''
    showAddForm.value = false
  } catch (e: unknown) {
    addError.value = e instanceof Error ? e.message : '未找到该标的，请检查代码'
  } finally {
    adding.value = false
  }
}

onMounted(async () => {
  // 从服务端加载自选
  watchlistLoading.value = true
  try {
    if (username.value) {
      const items = await fetchWatchlist(username.value)
      watchlist.value = items.length ? items : [...DEFAULT_WATCHLIST]
      // 首次（空数据）写入默认值
      if (!items.length) persistWatchlist()
    }
  } catch (e) {
    console.error('[watchlist] load failed', e)
    watchlist.value = [...DEFAULT_WATCHLIST]
  } finally {
    watchlistLoading.value = false
  }
  await refreshAllWatch()
})
</script>

<template>
  <div class="market-page">
    <div class="market-header">
      <h1 class="market-title">行情中心</h1>
      <p class="market-sub">股票 · 黄金实时报价</p>
    </div>

    <!-- 行情查询 -->
    <section class="section">
      <div class="section-title">行情查询</div>
      <div class="search-bar">
        <select v-model="searchKind" class="kind-select">
          <option value="stock">股票/指数/ETF</option>
          <option value="gold">黄金</option>
        </select>
        <input
          v-model="searchInput"
          class="search-input"
          :placeholder="searchKind === 'stock' ? '输入代码或名称，如 600519 / 000001' : '输入品种，如 Au99.99'"
          @keydown.enter="doSearch"
        />
        <button class="search-btn" :disabled="searching" @click="doSearch">
          {{ searching ? '查询中…' : '查询' }}
        </button>
      </div>
      <div v-if="searchError" class="error-msg">{{ searchError }}</div>

      <div v-if="searchResult" class="quote-card search-card">
        <template v-if="isStock(searchResult)">
          <div class="quote-head">
            <span class="q-name">{{ (searchResult as StockQuote).name }}</span>
            <span class="q-code">{{ (searchResult as StockQuote).code }}</span>
            <span class="q-source">{{ searchResult.source }}</span>
          </div>
          <div class="quote-body">
            <div class="q-price" :class="pctClass((searchResult as StockQuote).pct_change)">
              {{ fmtPrice((searchResult as StockQuote).latest) }}
            </div>
            <div class="q-pct" :class="pctClass((searchResult as StockQuote).pct_change)">
              {{ fmtPct((searchResult as StockQuote).pct_change) }}
            </div>
          </div>
          <div class="quote-grid">
            <div class="qg-item"><span class="qg-label">今开</span><span class="qg-val">{{ fmtPrice((searchResult as StockQuote).open) }}</span></div>
            <div class="qg-item"><span class="qg-label">昨收</span><span class="qg-val">{{ fmtPrice((searchResult as StockQuote).pre_close) }}</span></div>
            <div class="qg-item"><span class="qg-label">最高</span><span class="qg-val up">{{ fmtPrice((searchResult as StockQuote).high) }}</span></div>
            <div class="qg-item"><span class="qg-label">最低</span><span class="qg-val down">{{ fmtPrice((searchResult as StockQuote).low) }}</span></div>
            <div class="qg-item"><span class="qg-label">成交量</span><span class="qg-val">{{ fmtVol((searchResult as StockQuote).volume) }}</span></div>
            <div class="qg-item"><span class="qg-label">成交额</span><span class="qg-val">{{ fmtAmt((searchResult as StockQuote).amount) }}</span></div>
          </div>
        </template>
        <template v-else>
          <div class="quote-head">
            <span class="q-name">{{ (searchResult as GoldQuote).symbol }}</span>
            <span class="gold-badge">黄金</span>
            <span class="q-source">{{ searchResult.source }}</span>
          </div>
          <div class="quote-body">
            <div class="q-price gold">{{ fmtPrice((searchResult as GoldQuote).latest) }}</div>
            <div class="q-unit">元/克</div>
          </div>
          <div v-if="(searchResult as GoldQuote).is_historical" class="hist-warn">
            ⚠️ 历史收盘价（{{ (searchResult as GoldQuote).data_time }}）
          </div>
          <div v-else-if="(searchResult as GoldQuote).data_time" class="q-meta">
            {{ (searchResult as GoldQuote).data_time }}
          </div>
        </template>
        <button class="add-watch-btn" @click="addSearchToWatchlist">＋ 加入自选</button>
      </div>
    </section>

    <!-- 自选 -->
    <section class="section">
      <div class="section-title-row">
        <span class="section-title">自选</span>
        <div class="row-end">
          <button class="refresh-btn" @click="refreshAllWatch">刷新</button>
          <button class="add-btn" @click="showAddForm = !showAddForm">
            {{ showAddForm ? '取消' : '＋ 添加' }}
          </button>
        </div>
      </div>

      <!-- 添加自选表单 -->
      <div v-if="showAddForm" class="add-form">
        <select v-model="addKind" class="kind-select">
          <option value="stock">股票/ETF/指数</option>
          <option value="gold">黄金</option>
        </select>
        <input
          v-model="addSymbol"
          class="search-input"
          placeholder="输入代码，如 512660 / Au99.99"
          @keydown.enter="confirmAdd"
        />
        <button class="search-btn" :disabled="adding" @click="confirmAdd">
          {{ adding ? '…' : '确认添加' }}
        </button>
        <div v-if="addError" class="error-msg add-error">{{ addError }}</div>
      </div>

      <div v-if="watchlistLoading" class="empty-hint">
        <span class="btn-spinner" aria-hidden="true" style="margin-right:6px" />加载自选中…
      </div>
      <div v-else-if="!watchlist.length" class="empty-hint">暂无自选，点击「＋ 添加」或搜索后加入</div>
      <div class="watch-list">
        <div v-for="item in watchlist" :key="item.symbol" class="watch-row">
          <div class="watch-info">
            <template v-if="watchData[item.symbol]">
              <template v-if="isStock(watchData[item.symbol])">
                <span class="w-name">{{ item.label || (watchData[item.symbol] as StockQuote).name }}</span>
                <span class="w-code">{{ item.symbol }}</span>
                <span class="w-price" :class="pctClass((watchData[item.symbol] as StockQuote).pct_change)">
                  {{ fmtPrice((watchData[item.symbol] as StockQuote).latest) }}
                </span>
                <span class="w-pct" :class="pctClass((watchData[item.symbol] as StockQuote).pct_change)">
                  {{ fmtPct((watchData[item.symbol] as StockQuote).pct_change) }}
                </span>
              </template>
              <template v-else>
                <span class="w-name">{{ item.label || item.symbol }}</span>
                <span class="gold-badge">黄金</span>
                <span class="w-price gold">{{ fmtPrice((watchData[item.symbol] as GoldQuote).latest) }}</span>
                <span class="w-unit">元/克</span>
              </template>
            </template>
            <template v-else>
              <span class="w-name">{{ item.label || item.symbol }}</span>
              <span class="w-code">{{ item.symbol }}</span>
              <span class="w-status">{{ watchLoading[item.symbol] ? '加载中…' : (watchError[item.symbol] || '—') }}</span>
            </template>
          </div>
          <div class="watch-actions">
            <button class="icon-btn" title="刷新" @click="loadWatch(item)">↺</button>
            <button class="icon-btn danger" title="删除" @click="removeWatch(item)">✕</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.market-page {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}

.market-header { margin-bottom: 4px; }

.market-title {
  font-family: 'Cinzel', serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 4px;
  letter-spacing: 0.04em;
}

.market-sub {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-soft);
  opacity: 0.7;
}

/* ── 布局 ── */
.section { display: flex; flex-direction: column; gap: 12px; }

.section-title {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-soft);
  opacity: 0.7;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-end {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── 搜索栏 ── */
.search-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* select：固定深色背景，避免 option 白底白字问题 */
.kind-select {
  background: #1a1f2e;
  border: 1px solid var(--panel-border);
  color: #ffffff;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  min-width: 80px;
}

.kind-select option {
  background: #1a1f2e;
  color: #ffffff;
}

.search-input {
  flex: 1;
  min-width: 200px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid var(--panel-border);
  color: var(--text-main);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: rgba(255, 255, 255, 0.3); }

.search-btn {
  background: var(--accent);
  color: #1a1006;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.refresh-btn {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-soft);
  border: 1px solid var(--panel-border);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s;
}

.refresh-btn:hover { background: rgba(255, 255, 255, 0.14); }

.add-btn {
  background: rgba(255, 223, 133, 0.12);
  border: 1px solid rgba(255, 223, 133, 0.25);
  color: var(--accent);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}

.add-btn:hover { background: rgba(255, 223, 133, 0.22); }

/* ── 添加自选表单 ── */
.add-form {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: flex-start;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
}

.add-error { width: 100%; margin-top: 2px; }

/* ── Quote card ── */
.quote-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  padding: 16px 20px;
  position: relative;
}

.quote-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.q-name { font-size: 1rem; font-weight: 600; color: var(--text-main); }

.q-code {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.07);
  border-radius: 4px;
  padding: 1px 6px;
}

.gold-badge {
  font-size: 0.72rem;
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border-radius: 4px;
  padding: 1px 6px;
}

.q-source {
  margin-left: auto;
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
}

.quote-body {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}

.q-price {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.q-price.up { color: #e85252; }
.q-price.down { color: #52c77a; }
.q-price.gold { color: #ffd700; }

.q-pct { font-size: 1rem; font-weight: 600; }
.q-pct.up { color: #e85252; }
.q-pct.down { color: #52c77a; }

.q-unit { font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); }

.q-meta {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.35);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quote-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.qg-item { display: flex; flex-direction: column; gap: 2px; }
.qg-label { font-size: 0.68rem; color: rgba(255, 255, 255, 0.4); }
.qg-val { font-size: 0.88rem; font-variant-numeric: tabular-nums; font-weight: 500; }
.qg-val.up { color: #e85252; }
.qg-val.down { color: #52c77a; }

.add-watch-btn {
  margin-top: 14px;
  background: rgba(255, 223, 133, 0.12);
  border: 1px solid rgba(255, 223, 133, 0.3);
  color: var(--accent);
  border-radius: 7px;
  padding: 6px 14px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}

.add-watch-btn:hover { background: rgba(255, 223, 133, 0.2); }

.card-refresh-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1rem;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s;
}

.card-refresh-btn:hover { color: var(--accent); }

/* ── 自选列表 ── */
.watch-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.watch-row {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  gap: 10px;
  transition: background 0.15s;
}

.watch-row:hover { background: rgba(255, 255, 255, 0.09); }

.watch-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.w-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.w-code { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }

.w-price {
  margin-left: auto;
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.w-price.up { color: #e85252; }
.w-price.down { color: #52c77a; }
.w-price.gold { color: #ffd700; }

.w-pct {
  font-size: 0.8rem;
  font-weight: 600;
  min-width: 62px;
  text-align: right;
}

.w-pct.up { color: #e85252; }
.w-pct.down { color: #52c77a; }

.w-unit { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
.w-status { font-size: 0.78rem; color: rgba(255, 255, 255, 0.35); }

.watch-actions { display: flex; gap: 4px; }

.icon-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: var(--text-main); }
.icon-btn.danger:hover { color: var(--danger); }

/* ── 杂项 ── */
.error-msg {
  color: var(--danger);
  font-size: 0.83rem;
  padding: 8px 12px;
  background: rgba(255, 142, 171, 0.08);
  border: 1px solid rgba(255, 142, 171, 0.2);
  border-radius: 8px;
}

.hist-warn { font-size: 0.75rem; color: #ffc107; margin-top: 4px; }
.loading-text, .empty-text { font-size: 0.82rem; color: rgba(255, 255, 255, 0.35); padding: 8px 0; }
.empty-hint { font-size: 0.82rem; color: rgba(255, 255, 255, 0.3); text-align: center; padding: 24px; }

/* A 股：红涨绿跌 */
.up { color: #e85252; }
.down { color: #52c77a; }
</style>
