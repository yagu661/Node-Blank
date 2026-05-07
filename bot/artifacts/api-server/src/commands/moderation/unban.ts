import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const unban: Command = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("🔓 Lift a specific ban by entering the user's Discord ID")
    .addStringOption((o) => o.setName("user_id").setDescription("The Discord user ID to unban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the unban").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const userId  = interaction.options.getString("user_id", true).trim();
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    if (!/^\d{17,20}$/.test(userId)) { await interaction.editReply({ embeds: [errEmbed("Invalid ID", "Please provide a valid Discord user ID (17-20 digits).")] }); return; }

    const ban = await guild.bans.fetch(userId).catch(() => null);
    if (!ban)                        { await interaction.editReply({ embeds: [errEmbed("Not Banned", "That user is not currently banned in this server.")] }); return; }

    await guild.members.unban(userId, auditReason(interaction.user, reason));

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("🔓 User Unbanned")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> **${ban.user.tag}** has been unbanned.\n> ${config.divider}`)
          .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "👤 Unbanned User", value: `${ban.user.tag}\n\`${ban.user.id}\``, inline: true },
            { name: "⚖️ Moderator",    value: interaction.user.tag,                  inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",       value: reason,                                inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
