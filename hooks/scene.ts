// Night Shift: Clawd's office as your clock has it. Pure: frame() turns the moment into Raster cells.
import { along, canvas, cells, clawd, CLAWD_W, GROUND, mix, put, rect, rnd, text, type Glyph } from './art'

export type Moment = {
  t: number  // ms, for the animation
  hour: number  // local hour, 0..24 with the minutes as a fraction
  working: boolean  // a turn is running
  label: string  // what the turn is on (a file's name, a command), '' for none
}

export type Shift = 'dawn' | 'day' | 'evening' | 'night' | 'graveyard'

export function shiftOf(hour: number): Shift {
  if (hour < 5) return 'graveyard'
  if (hour < 8) return 'dawn'
  if (hour < 17) return 'day'
  if (hour < 21) return 'evening'
  return 'night'
}

const SKY: Record<Shift, [number, number]> = {
  dawn: [0x6a6aa0, 0xe8a070],
  day: [0x5a8ec0, 0x8ab8e0],
  evening: [0x3a2e5a, 0xb0607a],
  night: [0x101626, 0x1a2238],
  graveyard: [0x080b16, 0x0e1222],
}

const WALL = 0x2a2d36
const DESK = 0x6a4a30
const MUTED = 0x8a8f9c
const AMBER = 0xe0a050

export const clockText = (hour: number) => {
  const h = Math.floor(hour)
  const m = Math.floor((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const TAGLINE: Record<Shift, string> = {
  dawn: 'dawn shift',
  day: 'day shift',
  evening: 'evening shift',
  night: 'night shift',
  graveyard: 'graveyard shift. bed soon?',
}

export function frame(m: Moment, W: number): Uint32Array {
  const c = canvas(W)
  const glyphs: Glyph[] = []
  const shift = shiftOf(m.hour)
  const dark = shift === 'night' || shift === 'graveyard'

  // the window, right side: the sky as the hour has it
  const wx = W - 26, wy = 1, ww = 18, wh = 10
  const [skyTop, skyLow] = SKY[shift]
  for (let j = 0; j < wh; j++) rect(c, wx, wy + j, ww, 1, mix(skyTop, skyLow, j / (wh - 1)))
  if (!dark) {
    // the sun crosses the window from 6:00 to 20:00
    const k = Math.min(1, Math.max(0, (m.hour - 6) / 14))
    const sx = wx + 2 + Math.round(k * (ww - 5))
    const sy = wy + 1 + Math.round(Math.abs(k - 0.5) * 2 * (wh - 4))
    const sun = shift === 'day' ? 0xffe08a : 0xffb060
    rect(c, sx, sy, 2, 2, sun)
  } else {
    put(c, wx + ww - 5, wy + 2, 0xe8e4d0); put(c, wx + ww - 4, wy + 2, 0xe8e4d0); put(c, wx + ww - 5, wy + 3, 0xe8e4d0)
    for (let i = 0; i < 7; i++) {
      const x = wx + 1 + Math.floor(rnd(i, 7) * (ww - 2)), y = wy + 1 + Math.floor(rnd(i, 9) * (wh - 3))
      if (rnd(i, Math.floor(m.t / 900)) > 0.25) put(c, x, y, mix(0x1a2238, 0xc8ccd8, 0.4 + 0.6 * rnd(i)))
    }
  }
  // window frame and sill
  const frameC = 0x4a4d58
  for (let i = -1; i <= ww; i++) { put(c, wx + i, wy - 1, frameC); put(c, wx + i, wy + wh, frameC) }
  for (let j = 0; j < wh; j++) { put(c, wx - 1, wy + j, frameC); put(c, wx + ww, wy + j, frameC); put(c, wx + ww / 2, wy + j, frameC) }

  // the desk, monitor and (after dark) the lamp
  const dx = Math.round(Math.max(22, W * 0.3))
  rect(c, dx, GROUND - 5, 23, 1, DESK)
  rect(c, dx + 1, GROUND - 4, 1, 4, DESK); rect(c, dx + 21, GROUND - 4, 1, 4, DESK)
  const mx = dx + 5
  rect(c, mx, GROUND - 11, 9, 5, 0x3a3d48)
  const screen = m.working ? (dark ? 0x2a4a6a : 0x1e3448) : 0x14161c
  rect(c, mx + 1, GROUND - 10, 7, 3, screen)
  if (m.working) {
    for (let j = 0; j < 3; j++) {
      const len = 1 + Math.floor(rnd(j + Math.floor(m.t / 250), 3) * 6)
      for (let i = 0; i < len; i++) put(c, mx + 1 + i, GROUND - 10 + j, mix(screen, 0x9ad0ff, 0.55))
    }
  }
  put(c, mx + 4, GROUND - 6, 0x3a3d48)
  if (dark) {
    // a desk lamp and its warm pool of light
    const lx = dx + 20
    rect(c, lx, GROUND - 9, 1, 3, 0x5a5d68); rect(c, lx - 2, GROUND - 10, 3, 1, 0x5a5d68)
    for (let j = 0; j < 3; j++) for (let i = -1 - j; i <= 1 + j; i++) put(c, lx - 2 + i, GROUND - 9 + j, mix(0x1a1c24, AMBER, 0.28 - j * 0.07))
  }
  // a mug on the desk
  rect(c, dx + 15, GROUND - 7, 2, 2, 0xc8ccd8)
  if (Math.floor(m.t / 400) % 3) put(c, dx + 15 + (Math.floor(m.t / 600) % 2), GROUND - 8 - (Math.floor(m.t / 300) % 2), mix(0x9aa0b0, 0x1a1c24, 0.5))

  // the floor
  for (let x = 0; x < W; x++) put(c, x, GROUND, WALL)

  // Clawd: at the desk while a turn runs; between the desk and the window otherwise
  const seat = dx - CLAWD_W + 4
  const sleepy = shift === 'graveyard'
  if (m.working) {
    clawd(c, m.t, sleepy && Math.floor(m.t / 4000) % 3 === 0 ? 'yawn' : 'type', seat, 1)
  } else {
    const look = wx - CLAWD_W - 1
    const at = along([{ x: seat, stay: 4200, pose: sleepy ? 'yawn' : 'sip' }, { x: look, stay: 5200, pose: sleepy ? 'yawn' : 'stand' }], m.t)
    clawd(c, m.t, at.pose, at.x, at.facing)
    if (sleepy && at.still) {
      const zx = Math.round(at.x) + 13
      const z = Math.floor(m.t / 700) % 3
      text(glyphs, zx + z, 2 - Math.min(2, z), 'z', MUTED)
    }
  }

  // the clock and the label of the work
  const clock = clockText(m.hour)
  text(glyphs, 1, 0, clock, sleepy ? AMBER : MUTED)
  text(glyphs, clock.length + 2, 0, TAGLINE[shift], sleepy ? AMBER : mix(MUTED, 0x000000, 0.25))
  if (m.label) {
    const label = m.label.length > 16 ? `${m.label.slice(0, 15)}~` : m.label
    text(glyphs, mx + 4 - Math.floor(label.length / 2), 1, label, mix(0x9ad0ff, 0x000000, 0.2))
  }
  return cells(c, glyphs)
}
