import { Player, AudioFilters } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { SpotifyExtractor, SoundCloudExtractor } from "@discord-player/extractor";
import { EmbedBuilder } from "discord.js";
import { config } from "../config";
import { getRelatedSongs } from "./ai";
import type { BotClient } from "../client";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

AudioFilters.define("bassboost" as any, "bass=g=20,dynaudnorm=f=200");
AudioFilters.define("8d"        as any, "apulsator=hz=0.08");
AudioFilters.define("echo"      as any, "aecho=0.8:0.9:1000:0.3");
AudioFilters.define("pitch"     as any, "asetrate=48000*1.15,aresample=48000");

const _require = createRequire(import.meta.url);
const ffmpegPath: string = _require("ffmpeg-static");

// Find yt-dlp: prefer explicit env var, then PATH
const YTDLP_PATH = process.env.YOUTUBE_DL_PATH ?? "yt-dlp";

function createYtDlpStream(url: string): Readable {
  // Extract bare video ID/URL for yt-dlp
  let videoUrl = url;
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v) videoUrl = `https://www.youtube.com/watch?v=${v}`;
  } catch {}

  const proc = spawn(YTDLP_PATH, [
    videoUrl,
    "--format", "bestaudio[ext=webm]/bestaudio/best",
    "--output", "-",
    "--quiet",
    "--no-warnings",
    "--no-playlist",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  proc.stderr.on("data", (d) => {
    const msg = d.toString().trim();
    if (msg) console.error("[yt-dlp]", msg);
  });

  const stream = proc.stdout as Readable;
  const cleanup = () => { if (!proc.killed) proc.kill("SIGKILL"); };
  stream.on("close", cleanup);
  stream.on("error", cleanup);
  proc.on("error", (err) => {
    console.error("[yt-dlp spawn error]", err.message);
    stream.destroy(err);
  });

  return stream;
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
      console.log(`[yt-dlp] Streaming: ${track.title} — ${track.url}`);
      return createYtDlpStream(track.url);
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
