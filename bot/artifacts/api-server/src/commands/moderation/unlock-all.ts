import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, TextChannel } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const unlockAll: Command = {
  data: new SlashCommandBuilder()
    .setName("unlock-all")
    .setDescription("🔓 Re-open every channel so members can send messages again")
    .addStringOption((o) => o.setName("reason").setDescription("Reason for unlocking all channels").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    await interaction.deferReply();
    const reason = interaction.options.getString("reason") ?? "Server unlocked";
    const guild = interaction.guild!;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
    let success = 0;
    let failed = 0;

    for (const [, channel] of textChannels) {
      await (channel as TextChannel).permissionOverwrites
        .edit(guild.roles.everyone, { SendMessages: null }, { reason: `${interaction.user.tag}: ${reason}` })
        .then(() => success++)
        .catch(() => failed++);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder().setColor(config.colors.success).setTitle("🔓 Server Unlocked")
          .setDescription(`> All channels have been unlocked.\n> ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
          .addFields(
            { name: "✅ Unlocked", value: `\`${success}\``, inline: true },
            { name: "❌ Failed", value: `\`${failed}\``, inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason", value: reason, inline: false },
            { name: "⚖️ Moderator", value: interaction.user.tag, inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
