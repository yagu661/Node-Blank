import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { config } from "../../../config";
import { sanitizeReason, auditReason, canTarget, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../../../lib/helpers";
import { logger } from "../../../lib/logger";
import type { Command } from "../../../types/index";
import type { BotClient } from "../../../client";

const DURATIONS: Record<string, { ms: number; label: string }> = {
  "1h":  { ms: 3_600_000,    label: "1 Hour"   },
  "6h":  { ms: 21_600_000,   label: "6 Hours"  },
  "12h": { ms: 43_200_000,   label: "12 Hours" },
  "1d":  { ms: 86_400_000,   label: "1 Day"    },
  "3d":  { ms: 259_200_000,  label: "3 Days"   },
  "7d":  { ms: 604_800_000,  label: "7 Days"   },
};

export const tempban: Command = {
  data: new SlashCommandBuilder()
    .setName("tempban")
    .setDescription("⏳ Ban a member for a set duration — they are unbanned automatically")
    .addUserOption((o) => o.setName("target").setDescription("The user to temporarily ban").setRequired(true))
    .addStringOption((o) =>
      o.setName("duration").setDescription("How long to ban them for").setRequired(true)
        .addChoices(
          { name: "1 Hour",   value: "1h"  },
          { name: "6 Hours",  value: "6h"  },
          { name: "12 Hours", value: "12h" },
          { name: "1 Day",    value: "1d"  },
          { name: "3 Days",   value: "3d"  },
          { name: "7 Days",   value: "7d"  },
        ),
    )
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction, client: BotClient) {
    await interaction.deferReply();
    const target           = interaction.options.getUser("target", true);
    const durKey           = interaction.options.getString("duration", true);
    const reason           = sanitizeReason(interaction.options.getString("reason"));
    const { ms, label }    = DURATIONS[durKey]!;
    const guild            = interaction.guild!;
    const case_id          = caseId();
    const unbanAt          = Math.floor((Date.now() + ms) / 1000);
    const tempKey          = `${guild.id}-${target.id}`;

    if (target.id === interaction.user.id)         { await interaction.editReply({ embeds: [errEmbed("Cannot Tempban", "You cannot tempban yourself.")] }); return; }
    if (target.id === interaction.client.user!.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Tempban", "I cannot tempban myself.")] }); return; }
    if (client.tempBans.has(tempKey))              { await interaction.editReply({ embeds: [errEmbed("Already Tempbanned", "That user already has an active temporary ban.")] }); return; }

    const member   = await guild.members.fetch(target.id).catch(() => null);
    const executor = await guild.members.fetch(interaction.user.id);

    if (member) {
      if (!member.bannable)             { await interaction.editReply({ embeds: [errEmbed("Cannot Tempban", "I lack the role hierarchy to ban this member.")] }); return; }
      if (!canTarget(executor, member)) { await interaction.editReply({ embeds: [errEmbed("Cannot Tempban", "You cannot tempban someone with an equal or higher role.")] }); return; }
    }

    let dmSent = false;
    if (member) {
      const dm = dmEmbed({ color: config.colors.ban, title: `⏳ You were temporarily banned from ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
        .addFields(
          { name: "⏱️ Duration",  value: label,                inline: true },
          { name: "🔓 Unban At",  value: `<t:${unbanAt}:R>`,  inline: true },
          { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
          { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,               inline: false },
        ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
      dmSent = await safeDM(target, dm);
    }

    await guild.members.ban(target, { reason: auditReason(interaction.user, `[TEMPBAN ${label}] ${reason}`) });

    const timer = setTimeout(async () => {
      client.tempBans.delete(tempKey);
      await guild.members.unban(target.id, `[TEMPBAN EXPIRED] ${label} ban for ${target.tag}`).catch((err) => {
        logger.error({ err, user: target.tag }, "Failed to auto-unban tempban");
      });
      logger.info({ user: target.tag, guild: guild.name }, "Tempban expired — user unbanned");
    }, ms);

    client.tempBans.set(tempKey, timer);

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.ban, title: "⏳ Member Tempbanned", description: `> **${target.tag}** has been temporarily banned for **${label}**.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 User",          value: `${target.tag}\n\`${target.id}\``,          inline: true },
            { name: "⚖️ Moderator",     value: interaction.user.tag,                       inline: true },
            { name: "⏱️ Duration",      value: label,                                      inline: true },
            { name: "🔓 Unban At",      value: `<t:${unbanAt}:R>`,                         inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",        value: reason,                                     inline: false },
            { name: "📬 DM Notified",   value: dmSent ? "✅ Delivered" : "❌ DMs closed",  inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
