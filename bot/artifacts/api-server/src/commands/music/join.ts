import { SlashCommandBuilder, EmbedBuilder, GuildMember, ChannelType } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const join: Command = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("🎤 Make the bot join your voice channel"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Not in Voice").setDescription("> You need to be in a voice channel!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const shoukaku = (interaction.client as any).shoukaku;
    let player = shoukaku.players.get(interaction.guildId!);

    if (player) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle("Already Connected").setDescription("> I'm already in a voice channel!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    player = await shoukaku.joinVoiceChannel({
      guildId: String(interaction.guildId!),
      channelId: String(voiceChannel.id),
      shardId: interaction.guild!.shardId ?? 0,
      deaf: true,
      mute: false,
    });

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🎤 Joined")
          .setDescription(`> Joined **${voiceChannel.name}**!`)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};