# night-shift

A Claude Code mod. Clawd's office above the prompt follows your clock: sunrise, day shift, desk lamp at night, yawning after midnight. /night-shift toggles it.

![preview](preview.png)

*Preview frames rendered from the mod's own drawing code.*

**It won't use any of your usage.** Everything is drawn locally from code: no model calls, no tokens.

## Install

```
/plugin marketplace add saiharsha03/night-shift
/plugin install night-shift@night-shift
```

Or from a clone: `claude --plugin-dir ./night-shift`.

## Where it shows

In the band above the prompt, hidden until `/night-shift`. Terminal only.

## Commands

- `/night-shift`

## What the hooks do

`hooks/register.tsx` hooks: session.start, tool.call, turn.complete, command.run{command=night-shift}, ui.render{component=AbovePrompt}. It never blocks or rewrites a tool call or a prompt; it only watches them, draws, and answers its own commands.

## Privacy: what data it sends

None. It makes no network or model calls; anything it remembers stays in Claude Code's local plugin storage on your machine.

## Licence

MIT. Clawd is Anthropic's Claude Code mascot; this is an unofficial fan mod.
