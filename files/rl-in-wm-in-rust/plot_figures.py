"""Reproduce the blog figures: python plot_figures.py [output_directory].

Requires matplotlib. Reads the JSON files beside this script, not raw rollouts.
"""
import json
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter

DATA = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else DATA
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 11,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.titleweight": "bold", "axes.labelcolor": "#29394a",
    "text.color": "#172a3a", "axes.edgecolor": "#bcc6ce",
    "xtick.color": "#455769", "ytick.color": "#455769",
    "svg.fonttype": "none",
})

benchmark = json.loads((DATA / "benchmark-4000-summary.json").read_text())
confirm = json.loads((DATA / "standalone-confirmation.json").read_text())
fig, axes = plt.subplots(1, 2, figsize=(10.8, 4.8), layout="constrained")
panels = [
    (axes[0], ["Real PPO", "WM fine-tuned", "WM cold-start"],
     [p["metrics"]["success_rate"] for p in benchmark["policies"]],
     ["#3266a8", "#c68a39", "#b45b64"], "100 simulator episodes", "Seeds 80000–80099"),
    (axes[1], ["Real PPO", "BC-only"],
     [r["metrics"]["success_rate"] for r in confirm["rows"]],
     ["#3266a8", "#39867d"], "1,000 simulator episodes", "Seeds 80000–80999"),
]
for ax, labels, values, colors, title, note in panels:
    bars = ax.bar(labels, values, color=colors, width=.57, zorder=3)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, value + .025,
                f"{value:.1%}", ha="center", fontsize=12, weight="bold")
    ax.set_ylim(0, 1.05)
    ax.yaxis.set_major_formatter(PercentFormatter(1))
    ax.set_ylabel("Success in the physics simulator")
    ax.set_title(title, loc="left", pad=22)
    ax.text(0, 1.025, note, transform=ax.transAxes, fontsize=10, color="#687885")
    ax.grid(axis="y", color="#e4e9ed", zorder=0)
    ax.tick_params(axis="x", length=0)
fig.suptitle("Model training did not improve the simulator policy", fontsize=16, weight="bold")
fig.supxlabel("BC-only: demonstration action labels; zero world-model PPO updates", fontsize=10)
fig.savefig(OUT / "policy-results.png", dpi=180, facecolor="white")
plt.close(fig)

data = json.loads((DATA / "heldout-30step-mse.json").read_text())
fig, axes = plt.subplots(1, 2, figsize=(10.8, 4.8), layout="constrained")
colors = {"1000e30": "#8a739d", "4000e10": "#277f87", "10000e5": "#c47b35"}
labels = {"1000e30": "1,000 trajectories / 30 epochs", "4000e10": "4,000 / 10", "10000e5": "10,000 / 5"}
for tag, color in colors.items():
    rows = [r for r in data["curves"] if r["tag"] == tag]
    for ax, metric in zip(axes, ["full_state_mse", "block_xy_mse"]):
        ax.plot([r["step"] for r in rows], [r[metric] for r in rows],
                label=labels[tag], color=color, linewidth=2.1)
for ax, title, ylabel in zip(axes,
        ["All 18 state coordinates", "Block position only"],
        ["Raw full-state MSE (mixed units)", "Block XY MSE (position units squared)"]):
    ax.set_title(title, loc="left", fontsize=12)
    ax.set_xlabel("Autoregressive prediction step (15 Hz)")
    ax.set_ylabel(ylabel)
    ax.set_xlim(1, 30)
    ax.set_ylim(bottom=0)
    ax.grid(color="#e4e9ed")
axes[0].legend(loc="upper left", frameon=False, fontsize=9)
fig.suptitle("More trajectories did not guarantee lower rollout error", fontsize=15, weight="bold")
fig.supxlabel("Fixed cohort: 299 episodes lasting at least 30 steps; identical recorded actions; no teacher forcing", fontsize=9)
fig.savefig(OUT / "world-model-error.png", dpi=180, facecolor="white")
plt.close(fig)
