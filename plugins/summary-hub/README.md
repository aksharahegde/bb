# Summary Hub

Daily and weekly operational roll-up summaries for projects and the global workspace.

## Storage

- Project summaries: `.bb/summaries/daily/YYYY-MM-DD.json` and `.bb/summaries/weekly/YYYY-Www.json`
- Global summaries: `~/.config/bb/summaries/daily/` and `~/.config/bb/summaries/weekly/`

## CLI

```sh
bb summary generate project daily
bb summary generate global weekly 2026-W32
bb summary list project daily
bb summary export SUM-DAILY-2026-08-07 slack project daily 2026-08-07
```

## Panel

Open **Summary Hub** from the sidebar to switch scope, period, and date, generate summaries, and copy a standup brief.
