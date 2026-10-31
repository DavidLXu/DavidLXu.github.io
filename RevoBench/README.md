# RevoBench: An Agent-Native Framework for Dexterous Manipulation Benchmarking

公开地址：https://davidlxu.github.io/RevoBench/

以视频为主的静态任务集，视觉参考 SuperMimic 的大标题、留白、圆角媒体和简洁导航。支持状态筛选、关键词搜索、视频回放与任务深链接，例如 `#task=insert_pen`。

## 本地预览

在网站仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/RevoBench/`。无需安装依赖或构建；GitHub Pages 直接发布这些静态文件。

## 内容与维护

- `snapshot.json` 是本站独立的展示数据，不轮询 GitHub，也不自动读取开发仓库。
- `media/` 保存所有展示视频及封面，页面只请求本站资源。`media/provenance.json` 保留导入视频的来源记录。
- 当前内容快照日期为 2026-10-27：36 项任务、29 段视频、21 条已登记验收参考轨迹。21 项已验收、8 项开发中、7 项未开始。这是历史展示快照，不是实时工作进度。
- 修改任务时手动更新 `snapshot.json`，新增视频与封面放入 `media/`，随本站提交发布即可。首页统计和筛选数量根据快照计算。项目介绍和首页主视频位于 `index.html`。
- 每项任务包含 `id`、`title`、`status`、`category`、`description`、`trajectory_count` 和 `videos`。状态值为 `accepted`、`in_progress` 或 `not_started`。视频沿用来源标记 `kind` 与 `sampling`，不能把调试视频标成验收结果。
- “已验收”仅指物理与数据验收；默认姿态回归、轨迹连续、整体姿态仿人、有效内侧接触四项动作质量另行复核。尚未录制的任务显示占位提示，不补造视频。

## 检查

运行 `node --check RevoBench/app.js`；预览时检查状态筛选、搜索、视频播放、弹窗关闭、手机布局。视频保留原始帧序列和时间，页面不改变播放速度；尊重减少动态效果偏好。
