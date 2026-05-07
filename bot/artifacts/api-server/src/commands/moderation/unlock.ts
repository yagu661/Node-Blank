import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const unlock: Command = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("🔓 Re-open a locked channel so members can send messages again")
    .addChannelOption((o) => o.setName("channel").setDescription("Channel to unlock (defaults to current)").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for unlocking").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    await interaction.deferReply();
    const reason = interaction.options.getString("reason") ?? "No reason provided";
    const guild = interaction.guild!;

    const channelOption = interaction.options.getChannel("channel");
    const channel = (channelOption
      ? guild.channels.cache.get(channelOption.id)
      : interaction.channel) as TextChannel | null;

    if (!channel) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Failed").setDescription("> Could not find that channel.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })] });
      return;
    }

    const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const isLocked = overwrite?.deny.has("SendMessages");

    if (!isLocked) {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle("⚠️ Already Unlocked").setDescription(`> <#${channel.id}> is not locked.`).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
      return;
    }

    try {
      await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: null }, { reason: `${interaction.user.username}: ${reason}` });
    } catch {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Failed").setDescription("> I don't have permission to edit this channel's permissions.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })] });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(config.colors.success).setTitle("🔓 Channel Unlocked")
          .setDescription(`> <#${channel.id}> has been unlocked.\n> Members can send messages again.\n> ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
          .addFields(
            { name: "📢 Channel", value: `<#${channel.id}>`, inline: true },
            { name: "⚖️ Moderator", value: interaction.user.username, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason", value: reason, inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
