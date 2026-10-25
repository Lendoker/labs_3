import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

FONT = r"C:\Windows\Fonts\segoeui.ttf"
if os.path.exists(FONT):
    font_manager.fontManager.addfont(FONT)
    plt.rcParams["font.family"] = "Segoe UI"


def save_genre_chart(rows, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    labels = [row["genre"] or "Без жанру" for row in rows]
    values = [row["books_count"] for row in rows]
    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(labels, values, color="#1f6b4a")
    ax.set_title("Кількість книг за жанрами")
    ax.set_ylabel("Книги")
    ax.tick_params(axis="x", rotation=30)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height(), str(value),
                ha="center", va="bottom")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path
