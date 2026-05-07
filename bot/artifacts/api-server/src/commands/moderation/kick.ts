import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, canTarget, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const kick: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("👢 Remove a member from the server with an optional logged reason")
    .addUserOption((o) => o.setName("target").setDescription("The member to kick").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const target   = interaction.options.getUser("target", true);
    const reason   = sanitizeReason(interaction.options.getString("reason"));
    const guild    = interaction.guild!;
    const case_id  = caseId();

    if (target.id === interaction.user.id)         { await interaction.editReply({ embeds: [errEmbed("Cannot Kick", "You cannot kick yourself.")] }); return; }
    if (target.id === interaction.client.user!.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Kick", "I cannot kick myself.")] }); return; }

    const member   = await guild.members.fetch(target.id).catch(() => null);
    if (!member)                                   { await interaction.editReply({ embeds: [errEmbed("Not Found", "That user is not in this server.")] }); return; }
    if (!member.kickable)                          { await interaction.editReply({ embeds: [errEmbed("Cannot Kick", "I lack the role hierarchy to kick this member.")] }); return; }

    const executor = await guild.members.fetch(interaction.user.id);
    if (!canTarget(executor, member))              { await interaction.editReply({ embeds: [errEmbed("Cannot Kick", "You cannot kick someone with an equal or higher role than you.")] }); return; }

    const dm = dmEmbed({ color: config.colors.kick, title: `👢 You were kicked from ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
      .addFields(
        { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
        { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,                inline: true },
      ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
    const dmSent = await safeDM(target, dm);

    await member.kick(auditReason(interaction.user, reason));

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.kick, title: "👢 Member Kicked", description: `> **${target.tag}** has been kicked.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 Kicked User", value: `${target.tag}\n\`${target.id}\``,      inline: true },
            { name: "⚖️ Moderator",   value: interaction.user.tag,                   inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",      value: reason,                                 inline: false },
            { name: "📬 DM Notified", value: dmSent ? "✅ Delivered" : "❌ DMs closed", inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
