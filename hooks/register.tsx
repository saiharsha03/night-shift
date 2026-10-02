import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ForcedHour } from '../types'

import { encode, ROWS } from './art'
import { clockText, frame, shiftOf } from './scene'

const FRAME_MS = 125
const isShown = atom({ plugin: 'night-shift', key: 'isShown' } as const, false)
const label = atom({ plugin: 'night-shift', key: 'label' } as const, '')
const forcedHour = atom({ plugin: 'night-shift', key: 'forcedHour' } as const, null as ForcedHour)

/** The band's mount, for blits between redraws. Module state: a reload mounts it again. */
const anim = { mount: null as { requestId: string; columns: number } | null, working: false, label: '', forced: null as number | null, last: '', retryAt: 0, nagged: '' }

const hourAt = (ms: number) => {
  const d = new Date(ms)
  return d.getHours() + d.getMinutes() / 60
}

const base = (p: string) => p.split(/[\\/]/).pop() ?? p

/** A short label for what the tool is on: the file's name, the command's first words. */
function labelFor(tool: string, input: Record<string, unknown>): string {
  const path = input.file_path ?? input.notebook_path ?? input.path
  if (typeof path === 'string' && path) return base(path)
  if (tool === 'Bash' && typeof input.command === 'string') return input.command.trim().split(/\s+/).slice(0, 2).join(' ')
  return tool
}

async function paint($: EngineInterface) {
  const m = anim.mount
  if (!m) return
  const now = await $.clock.now()
  const cells = encode(frame({ t: now, hour: anim.forced ?? hourAt(now), working: anim.working, label: anim.label }, m.columns))
  if (cells === anim.last) return
  anim.last = cells
  const r = await $.ui.blit({ requestId: m.requestId, key: 'office', cells })
  if ('deny' in r && r.deny) {
    anim.mount = null
    if (now - anim.retryAt > 2000) {
      anim.retryAt = now
      $.ui.invalidate('ui.render')
    }
  }
}

export const register: Register = hook => {
  hook('session.start', async ($, e, next) => {
    await $.command.register({ name: 'night-shift', description: 'Night Shift: toggle Clawd\'s office above the prompt; /night-shift <hour> previews an hour, auto follows the clock' })
    const saved = await $.store.get('isShown')
    if (saved === true) await update($, isShown, () => true)
    if (e.isInteractive) $.clock.every(FRAME_MS, () => void paint($))
    return next(e)
  })

  hook('tool.call', async ($, e, next) => {
    const now = labelFor(String(e.tool), e as unknown as Record<string, unknown>)
    if (!e.agentId) await update($, label, () => now)
    return next(e)
  })

  hook('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || !(await read($, isShown))) return done
    // After midnight, Clawd says it once a night.
    const now = await $.clock.now()
    const hour = (await read($, forcedHour)) ?? hourAt(now)
    const night = new Date(now).toDateString()
    if (shiftOf(hour) === 'graveyard' && anim.nagged !== night) {
      anim.nagged = night
      $.ui.toast(`Clawd yawns: it's ${clockText(hour)}. Bed soon?`)
    }
    return done
  })

  hook('command.run', { command: 'night-shift' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'auto') {
      await update($, forcedHour, () => null)
      return { text: 'Night Shift follows your clock again.' }
    }
    const hour = Number(arg.replace(':', '.'))
    if (arg && Number.isFinite(hour) && hour >= 0 && hour < 24) {
      await update($, forcedHour, () => hour)
      await update($, isShown, () => true)
      return { text: `Night Shift shows ${clockText(hour)} (${shiftOf(hour)} shift). /night-shift auto follows the clock again.` }
    }
    const shown = !(await read($, isShown))
    await update($, isShown, () => shown)
    await $.store.set('isShown', shown)
    return { text: shown ? 'Night Shift is open above the prompt.' : 'Night Shift is hidden.' }
  })

  hook('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const shown = await read($, isShown)
    const columns = e.props.bodyColumns - 2
    if (!shown || e.surface !== 'terminal' || e.props.hasSurvey || e.props.maxRows < ROWS || columns < 60) {
      anim.mount = null
      return next(e)
    }
    const { Raster } = $.ui.resolve(e)
    anim.working = e.props.isWorking
    anim.label = e.props.isWorking ? await read($, label) : ''
    anim.forced = await read($, forcedHour)
    anim.mount = { requestId: e.requestId, columns }
    const now = await $.clock.now()
    const cells = encode(frame({ t: now, hour: anim.forced ?? hourAt(now), working: anim.working, label: anim.label }, columns))
    anim.last = cells
    return <Raster key="office" columns={columns} rows={ROWS} cells={cells} />
  })
}
