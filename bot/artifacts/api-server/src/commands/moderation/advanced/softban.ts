import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../../../config";
import { sanitizeReason, auditReason, canTarget, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../../../lib/helpers";
import type { Command } from "../../../types/index";

export const softban: Command = {
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("🔄 Ban then instantly unban a user to purge their recent messages")
    .addUserOption((o) => o.setName("target").setDescription("The user to softban").setRequired(true))
    .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (1–7, default 1)").setMinValue(1).setMaxValue(7).setRequired(false))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the softban").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const target  = interaction.options.getUser("target", true);
    const delDays = interaction.options.getInteger("delete_days") ?? 1;
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    if (target.id === interaction.user.id)         { await interaction.editReply({ embeds: [errEmbed("Cannot Softban", "You cannot softban yourself.")] }); return; }
    if (target.id === interaction.client.user!.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Softban", "I cannot softban myself.")] }); return; }

    const member   = await guild.members.fetch(target.id).catch(() => null);
    const executor = await guild.members.fetch(interaction.user.id);

    if (member) {
      if (!member.bannable)               { await interaction.editReply({ embeds: [errEmbed("Cannot Softban", "I lack the role hierarchy to ban this member.")] }); return; }
      if (!canTarget(executor, member))   { await interaction.editReply({ embeds: [errEmbed("Cannot Softban", "You cannot softban someone with an equal or higher role.")] }); return; }
    }

    let dmSent = false;
    if (member) {
      const dm = dmEmbed({ color: config.colors.warning, title: `🔄 You were softbanned from ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
        .addFields(
          { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
          { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,               inline: true },
          { name: "ℹ️ Note",      value: "A softban removes your recent messages but does not permanently ban you. You may rejoin.", inline: false },
        ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
      dmSent = await safeDM(target, dm);
    }

    await guild.members.ban(target, { reason: auditReason(interaction.user, `[SOFTBAN] ${reason}`), deleteMessageSeconds: delDays * 86400 });
    await guild.members.unban(target, auditReason(interaction.user, `[SOFTBAN UNBAN] ${reason}`));

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.warning, title: "🔄 Member Softbanned", description: `> **${target.tag}** was softbanned — messages deleted, not permanently banned.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 User",          value: `${target.tag}\n\`${target.id}\``,         inline: true },
            { name: "⚖️ Moderator",     value: interaction.user.tag,                      inline: true },
            { name: "🗑️ Msg Deleted",   value: `\`${delDays} day(s)\``,                  inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",        value: reason,                                    inline: false },
            { name: "📬 DM Notified",   value: dmSent ? "✅ Delivered" : "❌ DMs closed", inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
