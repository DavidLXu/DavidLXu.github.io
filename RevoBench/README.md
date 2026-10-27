# RevoBench task board

Published at https://davidlxu.github.io/RevoBench/ using this repository's existing GitHub Pages deployment. Buildless HTML/CSS/JS; no app server or account credentials.

Canonical data: https://raw.githubusercontent.com/DavidLXu/RevoBench-Refactor/refs/heads/main/dashboard/tasks.json . Edit records in the benchmark repository, not here. The UI polls main every 60 seconds and marks failed refreshes or bundled snapshot fallback explicitly. Videos and posters also come from the benchmark repository or the public URL in the task record.

`snapshot.json` is the initial release fallback; it is intentionally not live. Follow the benchmark's `docs/DASHBOARD.md` for task maintenance. Change site code here, task evidence there. Future data updates do not require rebuilding this site.

Local preview: `python3 -m http.server 18772 --bind 127.0.0.1` from the repository root, then open `/RevoBench/`.
