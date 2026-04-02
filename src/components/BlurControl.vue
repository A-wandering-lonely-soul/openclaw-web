<script setup lang="ts">
import { useUiSettingsStore } from '@/stores/uiSettings'
import { storeToRefs } from 'pinia'

const uiSettings = useUiSettingsStore()
const { blurAmount } = storeToRefs(uiSettings)
</script>

<template>
  <div class="blur-control" title="调整面板虚化强度">
    <svg class="blur-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3.5" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.5" opacity="0.55"/>
      <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1" opacity="0.25"/>
    </svg>
    <input
      v-model.number="blurAmount"
      type="range"
      min="0"
      max="40"
      step="1"
      class="blur-slider"
      aria-label="虚化强度"
    />
    <span class="blur-value">{{ blurAmount }}</span>
  </div>
</template>

<style scoped>
.blur-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  user-select: none;
}

.blur-icon {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.blur-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 90px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  outline: none;
  cursor: pointer;
  padding: 0;
  border: none;
  box-shadow: none;
}

.blur-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.blur-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.blur-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: none;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.blur-value {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.6);
  min-width: 18px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
