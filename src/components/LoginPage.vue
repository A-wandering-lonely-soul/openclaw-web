<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { loginUser } from '@/lib/api'

const authStore = useAuthStore()

const mode = ref<'choose' | 'admin'>('choose')
const adminUsername = ref('')
const adminPassword = ref('')
const loading = ref(false)
const error = ref('')
const canvasRef = ref<HTMLCanvasElement | null>(null)

let animationId: number | null = null
let cleanupFns: (() => void)[] = []

async function loginAsGuest() {
  loading.value = true
  error.value = ''
  try {
    const res = await loginUser('admin', '123456')
    authStore.setAuth({
      username: res.username,
      role: res.role as 'guest' | 'admin',
      displayName: res.display_name,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}

async function loginAsAdmin() {
  if (!adminUsername.value.trim() || !adminPassword.value) {
    error.value = '请填写账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await loginUser(adminUsername.value.trim(), adminPassword.value)
    authStore.setAuth({
      username: res.username,
      role: res.role as 'guest' | 'admin',
      displayName: res.display_name,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '登录失败'
  } finally {
    loading.value = false
  }
}

function showAdminForm() {
  mode.value = 'admin'
  error.value = ''
}

function backToChoose() {
  mode.value = 'choose'
  error.value = ''
  adminUsername.value = ''
  adminPassword.value = ''
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // Assign to a typed const so TypeScript doesn't lose the narrowing inside class closures
  const c: CanvasRenderingContext2D = ctx

  let width = 0
  let height = 0
  let particles: TechNode[] = []
  let sakuras: Sakura[] = []
  const mouse = { x: null as number | null, y: null as number | null, radius: 150 }
  const nodeColor = 'rgba(0, 243, 255, 0.8)'
  const sakuraColor = 'rgba(255, 105, 180, 0.7)'

  const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
  const onMouseOut = () => { mouse.x = null; mouse.y = null }

  class TechNode {
    x: number; y: number; vx: number; vy: number; radius: number; baseRadius: number
    constructor() {
      this.x = Math.random() * width
      this.y = Math.random() * height
      this.vx = (Math.random() - 0.5) * 1
      this.vy = (Math.random() - 0.5) * 1
      this.radius = Math.random() * 2 + 1
      this.baseRadius = this.radius
    }
    update() {
      this.x += this.vx; this.y += this.vy
      if (this.x < 0 || this.x > width) this.vx = -this.vx
      if (this.y < 0 || this.y > height) this.vy = -this.vy
      if (mouse.x != null && mouse.y != null) {
        const dx = mouse.x - this.x, dy = mouse.y - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius
          this.vx += (dx / dist) * force * 0.05
          this.vy += (dy / dist) * force * 0.05
          this.radius = this.baseRadius + force * 3
        } else { this.radius = this.baseRadius }
      }
      this.vx *= 0.99; this.vy *= 0.99
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
      if (speed < 0.2) { this.vx += (Math.random() - 0.5) * 0.1; this.vy += (Math.random() - 0.5) * 0.1 }
    }
    draw() {
      c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
      c.fillStyle = nodeColor; c.shadowBlur = 10; c.shadowColor = nodeColor
      c.fill(); c.shadowBlur = 0
    }
  }

  class Sakura {
    x: number; y: number; vx: number; vy: number; radius: number; angle: number; angleSpeed: number
    constructor() {
      this.x = Math.random() * width
      this.y = Math.random() * height - height
      this.vx = (Math.random() - 0.5) * 2
      this.vy = Math.random() * 1.5 + 0.5
      this.radius = Math.random() * 3 + 1
      this.angle = Math.random() * Math.PI * 2
      this.angleSpeed = (Math.random() - 0.5) * 0.05
    }
    update() {
      this.x += this.vx + Math.sin(this.angle); this.y += this.vy; this.angle += this.angleSpeed
      if (this.y > height + 10) { this.y = -10; this.x = Math.random() * width }
      if (this.x > width + 10) this.x = -10
      if (this.x < -10) this.x = width + 10
    }
    draw() {
      c.beginPath(); c.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
      c.fillStyle = sakuraColor; c.shadowBlur = 15; c.shadowColor = sakuraColor
      c.fill(); c.shadowBlur = 0
    }
  }

  function initParticles() {
    particles = []; sakuras = []
    const numNodes = Math.floor((width * height) / 15000)
    const numSakura = Math.floor((width * height) / 30000)
    for (let i = 0; i < numNodes; i++) particles.push(new TechNode())
    for (let i = 0; i < numSakura; i++) sakuras.push(new Sakura())
  }

  function connectNodes() {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        const pa = particles[a]!, pb = particles[b]!
        const dx = pa.x - pb.x, dy = pa.y - pb.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          c.strokeStyle = `rgba(0, 243, 255, ${(1 - dist / 120) * 0.2})`
          c.lineWidth = 1; c.beginPath()
          c.moveTo(pa.x, pa.y)
          c.lineTo(pb.x, pb.y)
          c.stroke()
        }
      }
    }
  }

  const onResize = () => {
    width = canvas.width = window.innerWidth
    height = canvas.height = window.innerHeight
    initParticles()
  }

  function animate() {
    animationId = requestAnimationFrame(animate)
    c.clearRect(0, 0, width, height)
    connectNodes()
    particles.forEach(p => { p.update(); p.draw() })
    sakuras.forEach(s => { s.update(); s.draw() })
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseout', onMouseOut)
  window.addEventListener('resize', onResize)
  cleanupFns = [
    () => window.removeEventListener('mousemove', onMouseMove),
    () => window.removeEventListener('mouseout', onMouseOut),
    () => window.removeEventListener('resize', onResize),
  ]

  onResize()
  animate()
}

onMounted(() => {
  const ids = ['login-font-space', 'login-font-material']
  const hrefs = [
    'https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Space+Grotesk:wght@600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  ]
  ids.forEach((id, i) => {
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id; link.rel = 'stylesheet'; link.href = hrefs[i]!
      document.head.appendChild(link)
    }
  })
  initCanvas()
})

onUnmounted(() => {
  if (animationId !== null) cancelAnimationFrame(animationId)
  cleanupFns.forEach(fn => fn())
})
</script>

<template>
  <div class="lp-shell">
    <canvas ref="canvasRef" class="lp-canvas" />
    <div class="lp-radial" />

    <main class="lp-main">
      <div class="lp-card">
        <!-- Data corners -->
        <span class="dc dc-tl" aria-hidden="true" />
        <span class="dc dc-tr" aria-hidden="true" />
        <span class="dc dc-bl" aria-hidden="true" />
        <span class="dc dc-br" aria-hidden="true" />

        <!-- Branding -->
        <div class="lp-header">
          <div class="lp-icon-wrap">
            <span class="material-symbols-outlined lp-icon" style="font-variation-settings: 'FILL' 1;">terminal</span>
          </div>
          <h1 class="lp-title">OpenClaw</h1>
          <p class="lp-subtitle">
            <span class="lp-pulse" />
            需要认证访问权限
          </p>
        </div>

        <!-- 选择模式 -->
        <div v-if="mode === 'choose'" class="lp-choices">
          <button class="lp-choice-btn" type="button" :disabled="loading" @click="loginAsGuest">
            <span v-if="loading" class="lp-spinner" aria-hidden="true" />
            <span v-else class="material-symbols-outlined lp-choice-icon" style="font-variation-settings: 'FILL' 1;">person</span>
            <span class="lp-choice-body">
              <span class="lp-choice-label">游客登陆</span>
              <span class="lp-choice-hint">无需密码，直接进入</span>
            </span>
            <span class="material-symbols-outlined lp-choice-arrow">arrow_forward</span>
          </button>

          <button class="lp-choice-btn lp-choice-admin" type="button" :disabled="loading" @click="showAdminForm">
            <span class="material-symbols-outlined lp-choice-icon" style="font-variation-settings: 'FILL' 1;">key</span>
            <span class="lp-choice-body">
              <span class="lp-choice-label">管理员登陆</span>
              <span class="lp-choice-hint">需要账号和密码</span>
            </span>
            <span class="material-symbols-outlined lp-choice-arrow">arrow_forward</span>
          </button>
        </div>

        <!-- 管理员表单 -->
        <form v-else class="lp-form" @submit.prevent="loginAsAdmin">
          <div class="lp-field-group">
            <label class="lp-label" for="lp-username">代理 ID</label>
            <div class="lp-input-wrap">
              <span class="material-symbols-outlined lp-input-icon">badge</span>
              <input
                id="lp-username"
                v-model="adminUsername"
                class="lp-cyber-input"
                type="text"
                placeholder="输入管理员账号"
                autocomplete="username"
                :disabled="loading"
              />
            </div>
          </div>

          <div class="lp-field-group">
            <label class="lp-label" for="lp-password">通行密钥</label>
            <div class="lp-input-wrap">
              <span class="material-symbols-outlined lp-input-icon">lock</span>
              <input
                id="lp-password"
                v-model="adminPassword"
                class="lp-cyber-input"
                type="password"
                placeholder="••••••••••••"
                autocomplete="current-password"
                :disabled="loading"
              />
            </div>
          </div>

          <div class="lp-form-actions">
            <button class="lp-back-btn" type="button" :disabled="loading" @click="backToChoose">
              <span class="material-symbols-outlined">arrow_back</span>
              返回
            </button>
            <button class="lp-submit-btn" type="submit" :disabled="loading">
              <span v-if="loading" class="lp-spinner lp-spinner-dark" aria-hidden="true" />
              <template v-else>
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">login</span>
                连接至指挥室
              </template>
            </button>
          </div>
        </form>

        <p v-if="error" class="lp-error">
          <span class="material-symbols-outlined" style="font-size:15px;vertical-align:-3px">error</span>
          {{ error }}
        </p>

        <!-- Footer -->
        <div class="lp-footer">
          <span class="lp-status">系统在线 // 等待输入</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.lp-shell {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f141b;
  z-index: 10;
}

.lp-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.lp-radial {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 0%, rgba(15, 20, 27, 0.85) 100%);
}

.lp-main {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
  padding: 20px;
}

/* ── Card ── */
.lp-card {
  position: relative;
  background: rgba(15, 20, 27, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(58, 73, 75, 0.6);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(0, 243, 255, 0.08);
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.lp-card::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(45deg, transparent 40%, rgba(0, 243, 255, 0.8) 50%, transparent 60%);
  background-size: 200% 200%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: lp-border-glow 4s linear infinite;
  z-index: -1;
  pointer-events: none;
}

@keyframes lp-border-glow {
  0%   { background-position: 0% 0%; }
  100% { background-position: 200% 200%; }
}

/* ── Data corners ── */
.dc {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: #00f3ff;
  pointer-events: none;
  opacity: 0.7;
}
.dc-tl { top: -2px; left: -2px; border-top: 2px solid; border-left: 2px solid; }
.dc-tr { top: -2px; right: -2px; border-top: 2px solid; border-right: 2px solid; }
.dc-bl { bottom: -2px; left: -2px; border-bottom: 2px solid; border-left: 2px solid; }
.dc-br { bottom: -2px; right: -2px; border-bottom: 2px solid; border-right: 2px solid; }

/* ── Header ── */
.lp-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.lp-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(37, 42, 50, 0.8);
  border: 1px solid rgba(0, 243, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(0, 243, 255, 0.15);
}

.lp-icon {
  font-size: 32px;
  color: #00f3ff;
}

.lp-title {
  margin: 0;
  font-family: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #e3fdff;
  text-transform: uppercase;
  line-height: 1;
}

.lp-subtitle {
  margin: 0;
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(0, 243, 255, 0.7);
  display: flex;
  align-items: center;
  gap: 8px;
}

.lp-pulse {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00f3ff;
  flex-shrink: 0;
  animation: lp-pulse-anim 1.8s ease-in-out infinite;
}

@keyframes lp-pulse-anim {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(0.65); }
}

/* ── Choice buttons ── */
.lp-choices {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lp-choice-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #3a494b;
  border-radius: 4px;
  color: #dee2ec;
  cursor: pointer;
  transition: all 0.25s ease;
  text-align: left;
  width: 100%;
  position: relative;
  overflow: hidden;
  font-family: 'Geist', 'Noto Sans SC', sans-serif;
}

.lp-choice-btn::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(0, 243, 255, 0.1), transparent);
  transform: skewX(-20deg);
}

.lp-choice-btn:hover:not(:disabled) {
  border-color: rgba(0, 243, 255, 0.55);
  background: rgba(0, 20, 30, 0.5);
  box-shadow: 0 0 18px rgba(0, 243, 255, 0.14), inset 0 0 0 1px rgba(0, 243, 255, 0.07);
  transform: translateY(-1px);
}

.lp-choice-btn:hover:not(:disabled)::after {
  animation: lp-sweep 1.2s ease-out;
}

.lp-choice-admin:hover:not(:disabled) {
  border-color: rgba(235, 178, 255, 0.55);
  background: rgba(20, 0, 30, 0.5);
  box-shadow: 0 0 18px rgba(235, 178, 255, 0.14), inset 0 0 0 1px rgba(235, 178, 255, 0.07);
}

.lp-choice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes lp-sweep {
  0%   { left: -100%; }
  100% { left: 200%; }
}

.lp-choice-icon {
  font-size: 26px;
  color: #00f3ff;
  flex-shrink: 0;
}

.lp-choice-admin .lp-choice-icon {
  color: #ebb2ff;
}

.lp-choice-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.lp-choice-label {
  font-family: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #dee2ec;
  letter-spacing: 0.02em;
}

.lp-choice-hint {
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 0.75rem;
  color: #849495;
  letter-spacing: 0.05em;
}

.lp-choice-arrow {
  font-size: 18px;
  color: #849495;
  flex-shrink: 0;
  transition: color 0.2s, transform 0.2s;
}

.lp-choice-btn:hover:not(:disabled) .lp-choice-arrow {
  color: #00f3ff;
  transform: translateX(3px);
}

.lp-choice-admin:hover:not(:disabled) .lp-choice-arrow {
  color: #ebb2ff;
}

/* ── Admin form ── */
.lp-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lp-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lp-label {
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b9cacb;
}

.lp-input-wrap {
  position: relative;
}

.lp-input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: #849495;
  pointer-events: none;
  transition: color 0.2s;
}

.lp-input-wrap:focus-within .lp-input-icon {
  color: #00f3ff;
}

.lp-cyber-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-bottom: 1px solid #3a494b;
  border-radius: 4px 4px 0 0;
  color: #dee2ec;
  padding: 12px 14px 12px 42px;
  font-family: 'Space Grotesk', 'Noto Sans SC', monospace;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.25s ease;
}

.lp-cyber-input::placeholder {
  color: rgba(132, 148, 149, 0.5);
}

.lp-cyber-input:focus {
  border-bottom-color: #00f3ff;
  background: rgba(0, 20, 30, 0.6);
  box-shadow: 0 1px 15px rgba(0, 243, 255, 0.18);
}

.lp-cyber-input:disabled {
  opacity: 0.5;
}

/* ── Form actions ── */
.lp-form-actions {
  display: flex;
  gap: 10px;
  padding-top: 6px;
}

.lp-back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: transparent;
  border: 1px solid #3a494b;
  border-radius: 4px;
  color: #b9cacb;
  cursor: pointer;
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}

.lp-back-btn:hover:not(:disabled) {
  border-color: #849495;
  color: #dee2ec;
}

.lp-back-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.lp-submit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  background: #00f3ff;
  color: #002022;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Space Grotesk', 'Noto Sans SC', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.lp-submit-btn::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: skewX(-20deg);
  animation: lp-sweep-btn 3s infinite;
}

.lp-submit-btn:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 243, 255, 0.6);
  transform: translateY(-1px);
}

.lp-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes lp-sweep-btn {
  0%   { left: -100%; }
  20%  { left: 200%; }
  100% { left: 200%; }
}

/* ── Error ── */
.lp-error {
  margin: 0;
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 0.85rem;
  color: #ffb4ab;
  text-align: center;
  letter-spacing: 0.03em;
}

/* ── Footer ── */
.lp-footer {
  border-top: 1px solid rgba(58, 73, 75, 0.5);
  padding-top: 18px;
  text-align: center;
}

.lp-status {
  font-family: 'Geist', 'Noto Sans SC', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(0, 243, 255, 0.45);
}

/* ── Spinner ── */
.lp-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: lp-spin 0.7s linear infinite;
  flex-shrink: 0;
}

.lp-spinner-dark {
  border-color: rgba(0, 34, 34, 0.3);
  border-top-color: #002022;
}

@keyframes lp-spin {
  to { transform: rotate(360deg); }
}
</style>
