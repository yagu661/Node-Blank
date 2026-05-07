import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, canTarget, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

const DURATIONS: Record<string, { ms: number; label: string }> = {
  "60s": { ms: 60_000,      label: "60 Seconds" },
  "5m":  { ms: 300_000,     label: "5 Minutes"  },
  "10m": { ms: 600_000,     label: "10 Minutes" },
  "30m": { ms: 1_800_000,   label: "30 Minutes" },
  "1h":  { ms: 3_600_000,   label: "1 Hour"     },
  "6h":  { ms: 21_600_000,  label: "6 Hours"    },
  "12h": { ms: 43_200_000,  label: "12 Hours"   },
  "1d":  { ms: 86_400_000,  label: "1 Day"      },
  "1w":  { ms: 604_800_000, label: "1 Week"     },
};

export const mute: Command = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("🔇 Apply Discord's native timeout to a member for a chosen duration")
    .addUserOption((o) => o.setName("target").setDescription("The member to mute").setRequired(true))
    .addStringOption((o) =>
      o.setName("duration").setDescription("Duration of the timeout").setRequired(true)
        .addChoices(
          { name: "60 Seconds", value: "60s" },
          { name: "5 Minutes",  value: "5m"  },
          { name: "10 Minutes", value: "10m" },
          { name: "30 Minutes", value: "30m" },
          { name: "1 Hour",     value: "1h"  },
          { name: "6 Hours",    value: "6h"  },
          { name: "12 Hours",   value: "12h" },
          { name: "1 Day",      value: "1d"  },
          { name: "1 Week",     value: "1w"  },
        ),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the mute").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const target     = interaction.options.getUser("target", true);
    const durKey     = interaction.options.getString("duration", true);
    const reason     = sanitizeReason(interaction.options.getString("reason"));
    const { ms, label } = DURATIONS[durKey]!;
    const guild      = interaction.guild!;
    const case_id    = caseId();
    const expiresAt  = Math.floor((Date.now() + ms) / 1000);

    if (target.id === interaction.user.id)         { await interaction.editReply({ embeds: [errEmbed("Cannot Mute", "You cannot mute yourself.")] }); return; }
    if (target.id === interaction.client.user!.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Mute", "I cannot mute myself.")] }); return; }

    const member   = await guild.members.fetch(target.id).catch(() => null);
    if (!member)                                   { await interaction.editReply({ embeds: [errEmbed("Not Found", "That user is not in this server.")] }); return; }
    if (!member.moderatable)                       { await interaction.editReply({ embeds: [errEmbed("Cannot Mute", "I lack the role hierarchy to timeout this member.")] }); return; }

    const executor = await guild.members.fetch(interaction.user.id);
    if (!canTarget(executor, member))              { await interaction.editReply({ embeds: [errEmbed("Cannot Mute", "You cannot mute someone with an equal or higher role than you.")] }); return; }

    const dm = dmEmbed({ color: config.colors.mute, title: `🔇 You were muted in ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
      .addFields(
        { name: "⏱️ Duration",   value: label,                inline: true },
        { name: "🕐 Expires",    value: `<t:${expiresAt}:R>`, inline: true },
        { name: "⚖️ Moderator",  value: interaction.user.tag, inline: true },
        { name: "<a:rules_book2:1501544101336580146> Reason",     value: reason,               inline: false },
      ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
    const dmSent = await safeDM(target, dm);

    await member.timeout(ms, auditReason(interaction.user, reason));

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.mute, title: "🔇 Member Muted", description: `> **${target.tag}** has been timed out.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 Muted User",  value: `${target.tag}\n\`${target.id}\``,     inline: true },
            { name: "⚖️ Moderator",   value: interaction.user.tag,                  inline: true },
            { name: "⏱️ Duration",    value: label,                                 inline: true },
            { name: "🕐 Expires",     value: `<t:${expiresAt}:R>`,                  inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",      value: reason,                                inline: false },
            { name: "📬 DM Notified", value: dmSent ? "✅ Delivered" : "❌ DMs closed", inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
