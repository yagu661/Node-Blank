import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, errEmbed, modEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const unmute: Command = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("🔊 End a member's timeout early and restore their ability to speak")
    .addUserOption((o) => o.setName("target").setDescription("The member to unmute").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for removing the mute").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const target  = interaction.options.getUser("target", true);
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member)                                { await interaction.editReply({ embeds: [errEmbed("Not Found", "That user is not in this server.")] }); return; }
    if (!member.communicationDisabledUntil)     { await interaction.editReply({ embeds: [errEmbed("Not Muted", "That member is not currently timed out.")] }); return; }

    await member.timeout(null, auditReason(interaction.user, reason));

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.success, title: "🔊 Member Unmuted", description: `> **${target.tag}**'s timeout has been lifted.`, target, moderator: interaction.user })
          .addFields(
            { name: "👤 Unmuted User", value: `${target.tag}\n\`${target.id}\``, inline: true },
            { name: "⚖️ Moderator",   value: interaction.user.tag,              inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",      value: reason,                            inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
