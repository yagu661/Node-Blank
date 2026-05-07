import { Player, AudioFilters } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { SpotifyExtractor, SoundCloudExtractor } from "@discord-player/extractor";
import { EmbedBuilder } from "discord.js";
import { config } from "../config";
import { getRelatedSongs } from "./ai";
import type { BotClient } from "../client";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

AudioFilters.define("bassboost" as any, "bass=g=20,dynaudnorm=f=200");
AudioFilters.define("8d"        as any, "apulsator=hz=0.08");
AudioFilters.define("echo"      as any, "aecho=0.8:0.9:1000:0.3");
AudioFilters.define("pitch"     as any, "asetrate=48000*1.15,aresample=48000");

const _require = createRequire(import.meta.url);
const ffmpegPath: string = _require("ffmpeg-static");

// Find yt-dlp: prefer explicit env var, then PATH
const YTDLP_PATH = process.env.YOUTUBE_DL_PATH ?? "yt-dlp";

/**
 * Run yt-dlp --get-url to resolve a direct/HLS stream URL.
 * Returns the URL string so discord-player can pass it straight to ffmpeg.
 * ffmpeg handles HLS manifests natively, so no piping is needed.
 */
async function getYtDlpStreamUrl(videoUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(YTDLP_PATH, [
      videoUrl,
      "--format", "bestaudio/best",
      "--get-url",
      "--no-playlist",
      "--no-warnings",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      const url = stdout.trim().split("\n")[0]?.trim();
      if (url && url.startsWith("http")) {
        resolve(url);
      } else {
        reject(new Error(`yt-dlp exited ${code}: ${stderr.trim().slice(0, 200)}`));
      }
    });

    proc.on("error", (err) => reject(new Error(`yt-dlp spawn: ${err.message}`)));
  });
}

const autoplaying = new Set<string>();

async function handleAIAutoplay(queue: any, lastTrack: any) {
  const guildId = queue.guild?.id as string | undefined;
  if (!guildId || autoplaying.has(guildId)) return;
  autoplaying.add(guildId);

  const meta = queue.metadata as { channel: any } | null;

  try {
    if (meta?.channel) {
      const loadingEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🤖 AI Autoplay")
        .setDescription(`> Finding songs similar to **${lastTrack.title}** by **${lastTrack.author}**...`)
        .setFooter({ text: `⚡ ${config.embedFooter}` })
        .setTimestamp();
      meta.channel.send({ embeds: [loadingEmbed] }).catch(() => null);
    }

    const suggestions = await getRelatedSongs(lastTrack.title, lastTrack.author);
    if (!suggestions.length) {
      autoplaying.delete(guildId);
      if (meta?.channel) {
        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("🎶 Queue Finished")
          .setDescription("> No more tracks in the queue. Add more with `/play`!")
          .setFooter({ text: `⚡ ${config.embedFooter}` })
          .setTimestamp();
        meta.channel.send({ embeds: [embed] }).catch(() => null);
      }
      return;
    }

    const player = queue.player;
    const added: any[] = [];

    for (const song of suggestions) {
      try {
        const result = await player.search(song, {
          requestedBy: null,
          searchEngine: "youtubeSearch",
        });
        if (!result.isEmpty()) {
          queue.addTrack(result.tracks[0]);
          added.push(result.tracks[0]);
        }
      } catch {}
    }

    if (added.length === 0) {
      autoplaying.delete(guildId);
      if (meta?.channel) {
        const embed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("🎶 Queue Finished")
          .setDescription("> No more tracks in the queue. Add more with `/play`!")
          .setFooter({ text: `⚡ ${config.embedFooter}` })
          .setTimestamp();
        meta.channel.send({ embeds: [embed] }).catch(() => null);
      }
      return;
    }

    if (!queue.node.isPlaying()) {
      await queue.node.play();
    }

    if (meta?.channel) {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🤖 AI Autoplay")
        .setDescription(
          `> Queued **${added.length}** genre-matched songs:\n` +
          added.map((t) => `> • **${t.title}** — ${t.author}`).join("\n")
        )
        .setFooter({ text: `⚡ ${config.embedFooter} • Use /stop to end autoplay` })
        .setTimestamp();
      meta.channel.send({ embeds: [embed] }).catch(() => null);
    }
  } catch {
    if (meta?.channel) {
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎶 Queue Finished")
        .setDescription("> No more tracks in the queue. Add more with `/play`!")
        .setFooter({ text: `⚡ ${config.embedFooter}` })
        .setTimestamp();
      meta.channel.send({ embeds: [embed] }).catch(() => null);
    }
  } finally {
    autoplaying.delete(guildId);
  }
}

export async function initPlayer(client: BotClient): Promise<Player> {
  const player = new Player(client, { skipFFmpeg: false, ffmpegPath });

  // Register YoutubeiExtractor FIRST for search/metadata.
  // createStream bypasses all internal youtubei streaming by spawning yt-dlp
  // directly — this avoids IP blocking, signature decipher failures, and
  // youtube-dl-exec binary lookup issues.
  await player.extractors.register(YoutubeiExtractor, {
    disablePlayer: true,
    createStream: async (track: any) => {
      console.log(`[yt-dlp] Resolving URL for: ${track.title} — ${track.url}`);
      const streamUrl = await getYtDlpStreamUrl(track.url);
      console.log(`[yt-dlp] Got stream URL (${streamUrl.slice(0, 80)}...)`);
      return streamUrl;
    },
  } as any);

  // Spotify and SoundCloud are metadata-only — registered AFTER YoutubeiExtractor
  // so they delegate actual audio streaming to it.
  await player.extractors.register(SoundCloudExtractor, {});
  await player.extractors.register(SpotifyExtractor, {});

  player.events.on("playerStart", (queue, track) => {
    const meta = queue.metadata as { channel: any } | null;
    if (!meta?.channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("🎵 Now Playing")
      .setDescription(`**[${track.title}](${track.url})**\nby **${track.author}**`)
      .setThumbnail(track.thumbnail)
      .addFields(
        { name: "⏱️ Duration",     value: track.duration,                              inline: true },
        { name: "👤 Requested by", value: `${track.requestedBy ?? "🤖 AI Autoplay"}`,  inline: true },
      )
      .setFooter({ text: `⚡ ${config.embedFooter}` })
      .setTimestamp();
    meta.channel.send({ embeds: [embed] }).catch(() => null);
  });

  player.events.on("emptyQueue", (queue) => {
    const history   = (queue as any).history?.tracks as any[] | undefined;
    const lastTrack = history?.at?.(-1) ?? (queue.metadata as any)?.seedTrack;

    if (lastTrack) {
      handleAIAutoplay(queue, lastTrack).catch(() => null);
    } else {
      const meta = queue.metadata as { channel: any } | null;
      if (!meta?.channel) return;
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎶 Queue Finished")
        .setDescription("> No more tracks in the queue. Add more with `/play`!")
        .setFooter({ text: `⚡ ${config.embedFooter}` })
        .setTimestamp();
      meta.channel.send({ embeds: [embed] }).catch(() => null);
    }
  });

  player.events.on("playerError", (queue, error) => {
    const meta = queue.metadata as { channel: any } | null;
    if (!meta?.channel) return;
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("❌ Playback Error")
      .setDescription(`> An error occurred: \`${error.message}\``)
      .setFooter({ text: `⚡ ${config.embedFooter}` })
      .setTimestamp();
    meta.channel.send({ embeds: [embed] }).catch(() => null);
  });

  player.events.on("error", (queue, error) => {
    const meta = (queue as any).metadata as { channel: any } | null;
    if (!meta?.channel) return;
    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("❌ Player Error")
      .setDescription(`> An error occurred: \`${error.message}\``)
      .setFooter({ text: `⚡ ${config.embedFooter}` })
      .setTimestamp();
    meta.channel.send({ embeds: [embed] }).catch(() => null);
  });

  return player;
}
