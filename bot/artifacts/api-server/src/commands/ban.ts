import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../config";
import { sanitizeReason, auditReason, canTarget, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../lib/helpers";
import type { Command } from "../types/index";

export const ban: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("🔨 Permanently ban a user from the server")
    .addUserOption((o) => o.setName("target").setDescription("The user to ban").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban").setMaxLength(512).setRequired(false))
    .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (0–7)").setMinValue(0).setMaxValue(7).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const target   = interaction.options.getUser("target", true);
    const reason   = sanitizeReason(interaction.options.getString("reason"));
    const delDays  = interaction.options.getInteger("delete_days") ?? 0;
    const guild    = interaction.guild!;
    const case_id  = caseId();

    if (target.id === interaction.user.id)        { await interaction.editReply({ embeds: [errEmbed("Cannot Ban", "You cannot ban yourself.")] }); return; }
    if (target.id === interaction.client.user!.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Ban", "I cannot ban myself.")] }); return; }

    const member   = await guild.members.fetch(target.id).catch(() => null);
    const executor = await guild.members.fetch(interaction.user.id);

    if (member) {
      if (!member.bannable)                         { await interaction.editReply({ embeds: [errEmbed("Cannot Ban", "I lack the role hierarchy to ban this member.")] }); return; }
      if (!canTarget(executor, member))             { await interaction.editReply({ embeds: [errEmbed("Cannot Ban", "You cannot ban someone with an equal or higher role than you.")] }); return; }
    }

    let dmSent = false;
    if (member) {
      const dm = dmEmbed({ color: config.colors.ban, title: `🔨 You were banned from ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
        .addFields(
          { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
          { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,                inline: true },
          { name: "🗑️ Messages",  value: `${delDays}d deleted`, inline: true },
        ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
      dmSent = await safeDM(target, dm);
    }

    await guild.members.ban(target, { reason: auditReason(interaction.user, reason), deleteMessageSeconds: delDays * 86400 });

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.ban, title: "🔨 Member Banned", description: `> **${target.tag}** has been permanently banned.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 Banned User",  value: `${target.tag}\n\`${target.id}\``, inline: true },
            { name: "⚖️ Moderator",    value: interaction.user.tag,              inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",       value: reason,                            inline: false },
            { name: "🗑️ Msg Deleted",  value: `\`${delDays} day(s)\``,          inline: true },
            { name: "📬 DM Notified",  value: dmSent ? "✅ Delivered" : "❌ DMs closed", inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
