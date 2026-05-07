import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../../config";
import { errEmbed } from "../../../lib/helpers";
import type { Command } from "../../../types/index";
import type { BotClient } from "../../../client";

export const warns: Command = {
  data: new SlashCommandBuilder()
    .setName("warns")
    .setDescription("<a:rules_book2:1501544101336580146> See every recorded warning on a member's moderation history")
    .addUserOption((o) => o.setName("target").setDescription("The member to check warnings for").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction, client: BotClient) {
    await interaction.deferReply();
    const target = interaction.options.getUser("target", true);
    const guild  = interaction.guild!;

    const list = client.warnings.get(guild.id)?.get(target.id) ?? [];

    if (list.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle("✅ No Warnings")
            .setDescription(`> **${target.tag}** has a clean record — no active warnings.\n> ${config.divider}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
        ],
      });
      return;
    }

    const shown  = list.slice(-10);
    const fields = shown.map((w, i) => ({
      name: `⚠️ Warning ${list.length - shown.length + i + 1} — <t:${Math.floor(w.timestamp / 1000)}:R>`,
      value: `> <a:rules_book2:1501544101336580146> **Reason:** ${w.reason}\n> ⚖️ **Moderator:** ${w.moderator}`,
      inline: false,
    }));

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`⚠️ Warnings — ${target.tag}`)
          .setDescription(
            `> **${target.tag}** has **${list.length}** active warning(s).\n` +
            `> Showing last ${shown.length}.\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(fields)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ID: ${target.id}` }),
      ],
    });
  },
};
