import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const slowMode: Command = {
  data: new SlashCommandBuilder()
    .setName("slow-mode")
    .setDescription("🐢 Apply a per-message cooldown to slow a channel down (1s – 6h)")
    .addIntegerOption((o) => o.setName("seconds").setDescription("Cooldown in seconds (1–21600)").setMinValue(1).setMaxValue(21600).setRequired(true))
    .addChannelOption((o) => o.setName("channel").setDescription("Channel to apply slowmode to (defaults to current)").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for setting slowmode").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  async execute(interaction) {
    await interaction.deferReply();
    const seconds = interaction.options.getInteger("seconds", true);
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    const channelOpt = interaction.options.getChannel("channel");
    const channel = (channelOpt ? guild.channels.cache.get(channelOpt.id) : interaction.channel) as TextChannel | null;
    if (!channel) { await interaction.editReply({ embeds: [errEmbed("Not Found", "Could not find that channel.")] }); return; }

    await channel.setRateLimitPerUser(seconds, auditReason(interaction.user, reason));

    const fmt = seconds >= 3600
      ? `${(seconds / 3600).toFixed(1)}h`
      : seconds >= 60
      ? `${Math.floor(seconds / 60)}m ${seconds % 60 > 0 ? `${seconds % 60}s` : ""}`.trim()
      : `${seconds}s`;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle("🐢 Slowmode Enabled")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> Slowmode of **${fmt}** set on <#${channel.id}>.\n> ${config.divider}`)
          .addFields(
            { name: "📢 Channel",   value: `<#${channel.id}>`,  inline: true },
            { name: "⏱️ Interval",  value: `\`${fmt}\``,        inline: true },
            { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,               inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
