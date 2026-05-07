import { Player, AudioFilters } from "discord-player";
import { YoutubeiExtractor } from "discord-player-youtubei";
import { SpotifyExtractor, SoundCloudExtractor } from "@discord-player/extractor";
import { EmbedBuilder } from "discord.js";
import { config } from "../config";
import { getRelatedSongs } from "./ai";
import type { BotClient } from "../client";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import type { Readable } from "node:stream";

AudioFilters.define("bassboost" as any, "bass=g=20,dynaudnorm=f=200");
AudioFilters.define("8d"        as any, "apulsator=hz=0.08");
AudioFilters.define("echo"      as any, "aecho=0.8:0.9:1000:0.3");
AudioFilters.define("pitch"     as any, "asetrate=48000*1.15,aresample=48000");

const _require = createRequire(import.meta.url);
const ffmpegBin: string = _require("ffmpeg-static");

const YTDLP_PATH = process.env.YOUTUBE_DL_PATH ?? "yt-dlp";

/**
 * Pipe yt-dlp into ffmpeg to produce a raw PCM (s16le 48kHz stereo) stream.
 *
 * Returning { $fmt: "pcm", stream } tells discord-player (v7, skipFFmpeg: true
 * default) to use the stream directly — it skips its own internal ffmpeg pass
 * entirely.  This works around YouTube blocking ffmpeg's direct HTTP access to
 * CDN URLs while still letting yt-dlp (which uses its own HTTP client) fetch
 * the audio data.
 */
function createPcmStream(videoUrl: string): { $fmt: string; stream: Readable } {
  let url = videoUrl;
  try {
    const u = new URL(videoUrl);
    const v = u.searchParams.get("v");
    if (v) url = `https://www.youtube.com/watch?v=${v}`;
  } catch {}

  console.log(`[yt-dlp] Fetching audio for: ${url}`);

  const ytdlp = spawn(YTDLP_PATH, [
    url,
    "--format", "bestaudio/best",
    "--output", "-",
    "--quiet",
    "--no-playlist",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  ytdlp.stderr.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg && !msg.startsWith("WARNING") && !msg.includes("Broken pipe")) {
      console.error("[yt-dlp]", msg.slice(0, 200));
    }
  });

  const ffmpeg = spawn(ffmpegBin, [
    "-loglevel", "error",
    "-i", "pipe:0",
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  ytdlp.stdout.pipe(ffmpeg.stdin);

  ytdlp.on("error", (err) => {
    console.error("[yt-dlp spawn error]", err.message);
    (ffmpeg.stdin as any).destroy();
  });
  ffmpeg.on("error", (err) => {
    console.error("[ffmpeg spawn error]", err.message);
  });
  ffmpeg.stderr.on("data", (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error("[ffmpeg]", msg.slice(0, 200));
  });

  return { $fmt: "pcm", stream: ffmpeg.stdout as unknown as Readable };
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
  // skipFFmpeg defaults to true in discord-player v7 — we rely on this so our
  // pre-processed PCM stream bypasses the internal ffmpeg pass entirely.
  const player = new Player(client);

  // YoutubeiExtractor handles search/metadata.
  // createStream is called when it's time to produce audio — we pipe yt-dlp
  // into ffmpeg ourselves and hand back raw PCM.  Discord-player sees
  // { $fmt: "pcm", stream } and skips its own ffmpeg, feeding the stream
  // straight into the voice dispatcher.
  await player.extractors.register(YoutubeiExtractor, {
    disablePlayer: true,
    createStream: async (track: any) => {
      return createPcmStream(track.url);
    },
  } as any);

  // Spotify and SoundCloud provide metadata; they bridge to YoutubeiExtractor
  // for actual audio, so createStream above handles them too.
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
    console.error("[playerError]", error.message, error.stack);
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
    console.error("[player event error]", error.message, error.stack);
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
