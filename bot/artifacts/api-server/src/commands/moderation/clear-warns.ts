import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";
import type { BotClient } from "../../client";

export const clearWarns: Command = {
  data: new SlashCommandBuilder()
    .setName("clear-warns")
    .setDescription("🗑️ Wipe every recorded warning from a member's moderation history")
    .addUserOption((o) => o.setName("target").setDescription("The member to clear warnings for").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction, client: BotClient) {
    await interaction.deferReply();
    const target  = interaction.options.getUser("target", true);
    const guild   = interaction.guild!;
    const case_id = caseId();

    const count = client.warnings.get(guild.id)?.get(target.id)?.length ?? 0;
    if (count === 0) { await interaction.editReply({ embeds: [errEmbed("No Warnings", `**${target.tag}** has no warnings to clear.`)] }); return; }

    client.warnings.get(guild.id)!.delete(target.id);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("🧹 Warnings Cleared")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> All warnings for **${target.tag}** have been removed.\n> ${config.divider}`)
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "👤 User",              value: `${target.tag}\n\`${target.id}\``, inline: true },
            { name: "🗑️ Warnings Removed", value: `\`${count}\``,                   inline: true },
            { name: "⚖️ Moderator",         value: interaction.user.tag,             inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
