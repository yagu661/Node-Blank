import { SlashCommandBuilder, EmbedBuilder, ImageFormat } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const avatar: Command = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("🖼️ View a user's full-size avatar")
    .addUserOption((o) => o.setName("user").setDescription("The user to fetch the avatar of (defaults to you)").setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    const target = interaction.options.getUser("user") ?? interaction.user;

    const pngUrl  = target.displayAvatarURL({ size: 1024, extension: ImageFormat.PNG });
    const jpgUrl  = target.displayAvatarURL({ size: 1024, extension: ImageFormat.JPEG });
    const webpUrl = target.displayAvatarURL({ size: 1024, extension: ImageFormat.WebP });
    const gifUrl  = target.avatar?.startsWith("a_")
      ? target.displayAvatarURL({ size: 1024, extension: ImageFormat.GIF })
      : null;

    const links = [
      `[PNG](${pngUrl})`,
      `[JPG](${jpgUrl})`,
      `[WebP](${webpUrl})`,
      ...(gifUrl ? [`[GIF](${gifUrl})`] : []),
    ].join(" **·** ");

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`🖼️ ${target.username}'s Avatar`)
          .setDescription(
            `> ${links}\n` +
            `> ${config.divider}`,
          )
          .setImage(gifUrl ?? pngUrl)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
