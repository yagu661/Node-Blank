import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, GuildMember, ChannelType } from "discord.js";
import { useMainPlayer, QueueRepeatMode, QueryType } from "discord-player";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { correctSearchQuery } from "../../lib/ai";
import { guilds247 } from "../../lib/musicState";
import { config } from "../../config";
import type { Command } from "../../types/index";

const autocompleteCache = new Map<string, { results: { name: string; value: string }[]; ts: number }>();
const CACHE_TTL = 30_000;

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("🎵 Search for a song or paste a URL — supports YouTube, Spotify and SoundCloud")
    .addStringOption((o) =>
      o.setName("query").setDescription("Song name, artist, or URL — even with typos!").setRequired(true).setAutocomplete(true)
    ),
  cooldown: 3,

  async autocomplete(interaction) {
    const query = interaction.options.getFocused().trim();
    if (query.length < 2) return interaction.respond([]);

    const cached = autocompleteCache.get(query);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      await interaction.respond(cached.results).catch(() => null);
      return;
    }

    try {
      const player = useMainPlayer();
      if (!player) return interaction.respond([]);

      // Use YouTube search for autocomplete — it always works without extra credentials
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      const search  = player.search(query, {
        requestedBy:  interaction.user,
        searchEngine: QueryType.YOUTUBE_SEARCH,
      });

      const result = await Promise.race([search, timeout]);
      if (!result || result === null) return interaction.respond([]);

      const choices = (result as Awaited<typeof search>).tracks.slice(0, 10).map((t) => ({
        name: `${t.title} — ${t.author} (${t.duration})`.slice(0, 100),
        value: t.url,
      }));

      autocompleteCache.set(query, { results: choices, ts: Date.now() });
      if (autocompleteCache.size > 200) {
        const oldest = [...autocompleteCache.keys()][0];
        if (oldest) autocompleteCache.delete(oldest);
      }

      await interaction.respond(choices).catch(() => null);
    } catch {
      await interaction.respond([]).catch(() => null);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const member       = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Not in Voice").setDescription("> You need to be in a voice channel to play music!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Invalid Channel").setDescription("> That channel type is not supported.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const me    = interaction.guild!.members.me;
    const perms = voiceChannel.permissionsFor(me!);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🔒 Missing Permissions").setDescription("> I don't have permission to **Connect** or **Speak** in that channel.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const rawQuery = interaction.options.getString("query", true);
    const player   = useMainPlayer();
    const isUrl    = rawQuery.startsWith("http://") || rawQuery.startsWith("https://");

    const correctedQuery = isUrl ? rawQuery : await correctSearchQuery(rawQuery);
    const query          = correctedQuery || rawQuery;
    const wasCorrected   = !isUrl && query.toLowerCase() !== rawQuery.toLowerCase();

    // Determine search engine based on input
    let searchEngine = QueryType.YOUTUBE_SEARCH;
    if (isUrl) {
      if (rawQuery.includes("spotify.com")) searchEngine = QueryType.SPOTIFY_SONG;
      else if (rawQuery.includes("soundcloud.com")) searchEngine = QueryType.SOUNDCLOUD_TRACK;
      else searchEngine = QueryType.YOUTUBE;
    } else if (rawQuery.includes("spotify.com")) {
      searchEngine = QueryType.SPOTIFY_SEARCH;
    }

    const searchOpts = {
      requestedBy:  interaction.user,
      searchEngine,
    };

    let result = await player!.search(query, searchOpts);

    // If Spotify search returned nothing, fallback to YouTube
    if (result.isEmpty() && searchEngine === QueryType.SPOTIFY_SEARCH) {
      result = await player!.search(query, { requestedBy: interaction.user, searchEngine: QueryType.YOUTUBE_SEARCH });
    }

    if (result.isEmpty() && wasCorrected) {
      const fallback = await player!.search(rawQuery, { requestedBy: interaction.user, searchEngine: QueryType.YOUTUBE_SEARCH });
      if (!fallback.isEmpty()) {
        return continuePlay(interaction, voiceChannel, player!, fallback, rawQuery, false);
      }
    }

    if (result.isEmpty()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ No Results").setDescription(`> No results found for \`${rawQuery}\`.`).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    return continuePlay(interaction, voiceChannel, player!, result, rawQuery, wasCorrected);
  },
};

async function continuePlay(
  interaction: any,
  voiceChannel: any,
  player: any,
  result: any,
  originalQuery: string,
  wasCorrected: boolean,
) {
  const is247 = guilds247.has(interaction.guildId!);

  try {
    await player.play(voiceChannel, result, {
      nodeOptions: {
        metadata:             { channel: interaction.channel, seedTrack: result.tracks[0] },
        volume:               80,
        selfDeaf:             true,
        leaveOnEmpty:         !is247,
        leaveOnEmptyCooldown: 60_000,
        leaveOnEnd:           !is247,
        leaveOnEndCooldown:   30_000,
        repeatMode:           QueueRepeatMode.OFF,
      },
    });
  } catch (err: any) {
    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle("❌ Playback Failed")
          .setDescription(`> Could not play that track. Try a different search.\n> \`${err?.message ?? "Unknown error"}\``)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  }

  const isPlaylist = result.hasPlaylist();
  const track      = result.tracks[0]!;

  const correctionNote = wasCorrected
    ? `\n> 🔍 *Searched as: \`${result.tracks[0]?.title ?? ""}\`*`
    : "";

  if (isPlaylist) {
    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("📋 Playlist Queued")
          .setDescription(`> Added **${result.tracks.length}** tracks from **[${result.playlist!.title}](${result.playlist!.url})**${correctionNote}`)
          .setThumbnail(result.playlist!.thumbnail)
          .addFields(
            { name: "👤 Requested by", value: `${interaction.user}`, inline: true },
            { name: "♾️ AI Autoplay",  value: "Enabled — similar songs play automatically", inline: false },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  }

  return void interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(MUSIC_COLOR)
        .setTitle("🎵 Added to Queue")
        .setDescription(`> **[${track.title}](${track.url})**\n> by **${track.author}**${correctionNote}`)
        .setThumbnail(track.thumbnail)
        .addFields(
          { name: "⏱️ Duration",    value: track.duration,        inline: true },
          { name: "👤 Requested by", value: `${interaction.user}`, inline: true },
          { name: "♾️ AI Autoplay", value: "On — genre-matched songs auto-queue", inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `⚡ ${config.embedFooter}` }),
    ],
  });
}
