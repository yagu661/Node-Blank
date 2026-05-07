import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const lock: Command = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("🔒 Prevent members from sending messages in a specific channel")
    .addChannelOption((o) => o.setName("channel").setDescription("Channel to lock (defaults to current)").addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for locking").setRequired(false))
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

    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }, { reason: `${interaction.user.tag}: ${reason}` });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(config.colors.error).setTitle("🔒 Channel Locked")
          .setDescription(`> <#${channel.id}> has been locked.\n> Members can no longer send messages.\n> ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
          .addFields(
            { name: "📢 Channel", value: `<#${channel.id}>`, inline: true },
            { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason", value: reason, inline: false },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
