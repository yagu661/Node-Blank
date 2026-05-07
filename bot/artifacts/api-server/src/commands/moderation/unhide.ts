import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, auditReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const unhide: Command = {
  data: new SlashCommandBuilder()
    .setName("unhide")
    .setDescription("👁️ Restore a hidden channel so regular members can see it again")
    .addChannelOption((o) => o.setName("channel").setDescription("Channel to unhide (defaults to current)").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for unhiding").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    await interaction.deferReply();
    const reason  = sanitizeReason(interaction.options.getString("reason"));
    const guild   = interaction.guild!;
    const case_id = caseId();

    const channelOpt = interaction.options.getChannel("channel");
    const channel = (channelOpt ? guild.channels.cache.get(channelOpt.id) : interaction.channel) as TextChannel | null;
    if (!channel) { await interaction.editReply({ embeds: [errEmbed("Not Found", "Could not find that channel.")] }); return; }

    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null }, { reason: auditReason(interaction.user, reason) });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("👁️ Channel Visible")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> <#${channel.id}> is now visible to members again.\n> ${config.divider}`)
          .addFields(
            { name: "📢 Channel",   value: `<#${channel.id}>`,   inline: true },
            { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",    value: reason,               inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
