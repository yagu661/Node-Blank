import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { guilds247 } from "../../lib/musicState";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const disable247: Command = {
  data: new SlashCommandBuilder()
    .setName("24-7off")
    .setDescription("⏹️ Disable 24/7 mode — bot will leave once the voice channel goes empty"),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const guildId = interaction.guildId!;

    if (!guilds247.has(guildId)) {
      return void interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.warning)
            .setTitle("⚠️ Already Disabled")
            .setDescription("> 24/7 mode is not currently enabled.\n> Use `/24-7` to enable it.")
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter}` }),
        ],
      });
    }

    guilds247.delete(guildId);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏹️ 24/7 Mode Disabled")
          .setDescription("> The bot will now **leave automatically** when the voice channel is empty.\n> Use `/24-7` to re-enable it.")
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
