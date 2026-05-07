import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { guilds247 } from "../../lib/musicState";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const toggle247: Command = {
  data: new SlashCommandBuilder()
    .setName("24-7")
    .setDescription("🔁 Enable 24/7 mode — keeps the bot in your voice channel around the clock, non-stop"),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    if (!member.voice.channel) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Not in Voice").setDescription("> You need to be in a voice channel to use this command.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const guildId = interaction.guildId!;
    const enabled = guilds247.has(guildId);

    if (enabled) {
      guilds247.delete(guildId);
    } else {
      guilds247.add(guildId);
    }

    const nowEnabled = !enabled;

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle(nowEnabled ? "✅ 24/7 Mode Enabled" : "❌ 24/7 Mode Disabled")
          .setDescription(
            nowEnabled
              ? "> The bot will **stay in the voice channel** even when everyone leaves.\n> Use `/24-7off` to disable."
              : "> The bot will now **leave automatically** when the voice channel is empty.",
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
