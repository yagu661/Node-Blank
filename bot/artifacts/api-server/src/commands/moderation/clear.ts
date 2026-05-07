import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, TextChannel, MessageFlags } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const clear: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("🧹 Bulk-delete up to 100 messages — optionally filter by a specific user")
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Number of messages to delete (1–100)").setMinValue(1).setMaxValue(100).setRequired(true),
    )
    .addUserOption((o) =>
      o.setName("target").setDescription("Only delete messages from this user").setRequired(false),
    )
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for clearing").setMaxLength(512).setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const amount  = interaction.options.getInteger("amount", true);
    const target  = interaction.options.getUser("target");
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const channel = interaction.channel as TextChannel | null;
    const case_id = caseId();

    if (!channel) {
      await interaction.editReply({ embeds: [errEmbed("Invalid Channel", "This command must be used inside a text channel.")] });
      return;
    }

    const cutoff = Date.now() - MAX_AGE_MS;

    let fetched = await channel.messages.fetch({ limit: 100 });
    fetched = fetched.filter((m) => m.createdTimestamp > cutoff);
    if (target) fetched = fetched.filter((m) => m.author.id === target.id);

    const toDelete = fetched.first(amount);

    if (toDelete.length === 0) {
      await interaction.editReply({
        embeds: [errEmbed("Nothing to Delete", target
          ? `No recent messages from **${target.tag}** found. Messages older than 14 days cannot be deleted.`
          : "No deletable messages found. Messages older than 14 days cannot be bulk deleted.",
        )],
      });
      return;
    }

    const deleted = await channel.bulkDelete(toDelete, true);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("🧹 Messages Cleared")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(
            `> Successfully purged **${deleted.size}** message(s) from <#${channel.id}>.\n` +
            `> ${config.divider}`,
          )
          .addFields(
            { name: "🗑️ Deleted",   value: `\`${deleted.size}/${amount}\``,               inline: true },
            { name: "📢 Channel",   value: `<#${channel.id}>`,                             inline: true },
            { name: "⚖️ Moderator", value: interaction.user.tag,                           inline: true },
            { name: "🎯 Filter",    value: target ? `${target.tag} only` : "All messages", inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,                                         inline: false },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
