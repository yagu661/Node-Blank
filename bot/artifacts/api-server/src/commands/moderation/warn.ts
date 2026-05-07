import { SlashCommandBuilder, PermissionFlagsBits, Collection } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, safeDM, errEmbed, modEmbed, dmEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";
import type { BotClient } from "../../client";

export const warn: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("⚠️ Issue a formal warning — logged and reviewable any time with /warns")
    .addUserOption((o) => o.setName("target").setDescription("The member to warn").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning").setMaxLength(512).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  async execute(interaction, client: BotClient) {
    await interaction.deferReply();
    const target  = interaction.options.getUser("target", true);
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    if (target.id === interaction.user.id) { await interaction.editReply({ embeds: [errEmbed("Cannot Warn", "You cannot warn yourself.")] }); return; }
    if (target.bot)                        { await interaction.editReply({ embeds: [errEmbed("Cannot Warn", "You cannot issue warnings to bots.")] }); return; }

    if (!client.warnings.has(guild.id)) client.warnings.set(guild.id, new Collection());
    const guildWarns = client.warnings.get(guild.id)!;
    if (!guildWarns.has(target.id)) guildWarns.set(target.id, []);

    guildWarns.get(target.id)!.push({ reason, moderator: interaction.user.tag, timestamp: Date.now() });
    const total = guildWarns.get(target.id)!.length;

    const dm = dmEmbed({ color: config.colors.warning, title: `⚠️ You received a warning in ${guild.name}`, guildName: guild.name, guildIcon: guild.iconURL() })
      .addFields(
        { name: "<a:rules_book2:1501544101336580146> Reason",         value: reason,                inline: false },
        { name: "⚖️ Moderator",      value: interaction.user.tag,  inline: true  },
        { name: "🔢 Total Warnings", value: `\`${total}\``,        inline: true  },
      ).setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` });
    const dmSent = await safeDM(target, dm);

    await interaction.editReply({
      embeds: [
        modEmbed({ color: config.colors.warning, title: "⚠️ Member Warned", description: `> **${target.tag}** has been issued a formal warning.`, target, moderator: interaction.user })
          .addFields(
            { name: "🎯 Warned User",    value: `${target.tag}\n\`${target.id}\``,    inline: true },
            { name: "⚖️ Moderator",      value: interaction.user.tag,                 inline: true },
            { name: "🔢 Total Warnings", value: `\`${total}\``,                       inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",         value: reason,                               inline: false },
            { name: "📬 DM Notified",    value: dmSent ? "✅ Delivered" : "❌ DMs closed", inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
