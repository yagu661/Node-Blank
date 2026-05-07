import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const unbanAll: Command = {
  data: new SlashCommandBuilder()
    .setName("unban-all")
    .setDescription("🔓 Revoke every active ban in the server in a single action")
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the mass unban").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 60,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const reason  = sanitizeReason(interaction.options.getString("reason") ?? "Mass unban");
    const guild   = interaction.guild!;
    const case_id = caseId();

    const bans = await guild.bans.fetch();
    if (bans.size === 0) { await interaction.editReply({ embeds: [errEmbed("No Bans Found", "There are no banned users in this server.")] }); return; }

    let success = 0, failed = 0;
    for (const [id] of bans) {
      await guild.members.unban(id, auditReason(interaction.user, reason)).then(() => success++).catch(() => failed++);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("🔓 Mass Unban Complete")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> All active bans have been lifted.\n> ${config.divider}`)
          .addFields(
            { name: "✅ Unbanned",    value: `\`${success}\``,  inline: true },
            { name: "❌ Failed",      value: `\`${failed}\``,   inline: true },
            { name: "📊 Total",       value: `\`${bans.size}\``, inline: true },
            { name: "⚖️ Moderator",   value: interaction.user.tag, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",      value: reason,             inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
