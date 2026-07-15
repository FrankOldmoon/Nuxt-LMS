import { ref, onMounted, onBeforeUnmount } from 'vue'

export function useFireworks(emit: (event: 'done', ...args: any[]) => void) {
  const canvasRef = ref<any>(null)
  let ctx: CanvasRenderingContext2D | null = null
  let animationId: number | null = null
  let particles: any[] = []
  let rockets: any[] = []
  let startTime = 0
  let launchTimer: ReturnType<typeof setInterval> | null = null

  const DURATION = 2800
  const COLORS = [
    '#ff4444', '#ff8800', '#ffdd00', '#44ff44',
    '#00ddff', '#4488ff', '#cc44ff', '#ff44aa',
    '#ffd700', '#ff69b4', '#00ced1', '#7fff00',
  ]

  onMounted(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    const parent = canvas.parentElement
    const w = parent.offsetWidth
    const h = parent.offsetHeight
    if (w < 10 || h < 10) { emit('done'); return }

    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    startTime = Date.now()

    // one by oneitemsHairfireworkFlower
    let count = 0
    const launch = () => {
      if (count >= 7 || Date.now() - startTime > DURATION - 800) {
        clearInterval(launchTimer)
        return
      }
      launchRocket(w, h)
      count++
    }
    launch()
    launchTimer = setInterval(launch, 350)

    animate(w, h)
  })

  function launchRocket(w: number, h: number) {
    rockets.push({
      x: w * (0.15 + Math.random() * 0.7),
      y: h,
      targetY: h * (0.08 + Math.random() * 0.35),
      trail: [],
    })
  }

  function explode(x: number, y: number, w: number, h: number) {
    const count = 35 + Math.floor(Math.random() * 25)
    const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)]
    const scale = Math.min(w, h) / 200
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
      const speed = (1 + Math.random() * 2.5) * scale
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.25 ? baseColor : COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        size: 1.5 + Math.random() * 2,
      })
    }
  }

  function animate(w: number, h: number) {
    if (!ctx) return
    const elapsed = Date.now() - startTime

    ctx.clearRect(0, 0, w, h)

    // UpdateFirearrow
    rockets = rockets.filter(r => {
      r.trail.push({ x: r.x, y: r.y })
      if (r.trail.length > 6) r.trail.shift()
      r.y -= 3.5

      r.trail.forEach((t, i) => {
        const alpha = (i / r.trail.length) * 0.6
        ctx.beginPath()
        ctx.arc(t.x, t.y, 1.2 * (i / r.trail.length + 0.3), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`
        ctx.fill()
      })

      if (r.y <= r.targetY) {
        explode(r.x, r.y, w, h)
        return false
      }
      return true
    })

    // UpdateparticleSon
    particles = particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.04
      p.vx *= 0.99
      p.life -= p.decay
      if (p.life <= 0) return false

      ctx.save()
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.shadowBlur = 6
      ctx.shadowColor = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * Math.max(0.3, p.life), 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
      ctx.restore()

      return true
    })

    if (elapsed < DURATION || particles.length > 0 || rockets.length > 0) {
      animationId = requestAnimationFrame(() => animate(w, h))
    } else {
      emit('done')
    }
  }

  onBeforeUnmount(() => {
    if (animationId) cancelAnimationFrame(animationId)
    if (launchTimer) clearInterval(launchTimer)
  })

  return {
    canvasRef,
  }
}
