export const MUSIC_COLOR = 0x9b59b6;

export function formatDuration(ms: number): string {
  if (!ms || isNaN(ms)) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function createProgressBar(current: number, total: number, size = 18): string {
  if (!total || total === 0) return `🔘${"▬".repeat(size)}`;
  const pct = Math.min(1, current / total);
  const pos = Math.round(pct * size);
  const before = "▬".repeat(Math.max(0, pos));
  const after  = "▬".repeat(Math.max(0, size - pos));
  return `${before}🔘${after}`;
}

export function parseDuration(input: string): number {
  const parts = input.trim().split(":").map(Number);
  if (parts.some(isNaN)) return -1;
  if (parts.length === 1) return parts[0]! * 1000;
  if (parts.length === 2) return (parts[0]! * 60 + parts[1]!) * 1000;
  if (parts.length === 3) return (parts[0]! * 3600 + parts[1]! * 60 + parts[2]!) * 1000;
  return -1;
}

export function musicEmbed(title: string, description: string, color = MUSIC_COLOR) {
  const { EmbedBuilder } = require("discord.js") as typeof import("discord.js");
  const { config } = require("../config") as typeof import("../config");
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}
