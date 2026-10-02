/** A forced hour for previews (0..24), or null to follow the clock. */
export type ForcedHour = number | null

declare module 'claude-code' {
  interface PluginState {
    'night-shift': {
      isShown: boolean
      label: string
      forcedHour: ForcedHour
    }
  }
}
