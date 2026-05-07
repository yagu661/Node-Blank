import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { sanitizeReason, errEmbed, caseId } from "../../lib/helpers";
import type { Command } from "../../types/index";

export const nick: Command = {
  data: new SlashCommandBuilder()
    .setName("nick")
    .setDescription("✏️ Change or reset a member's display name on this server")
    .addUserOption((o) => o.setName("target").setDescription("The member to rename").setRequired(true))
    .addStringOption((o) => o.setName("nickname").setDescription("New nickname (omit to reset)").setMaxLength(32).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageNicknames],
  botPermissions: [PermissionFlagsBits.ManageNicknames],
  async execute(interaction) {
    await interaction.deferReply();
    const target   = interaction.options.getUser("target", true);
    const newNick  = interaction.options.getString("nickname")?.trim() ?? null;
    const guild    = interaction.guild!;
    const case_id  = caseId();

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member)             { await interaction.editReply({ embeds: [errEmbed("Not Found", "That user is not in this server.")] }); return; }
    if (!member.manageable)  { await interaction.editReply({ embeds: [errEmbed("Cannot Edit", "I lack the role hierarchy to change this member's nickname.")] }); return; }

    const oldNick = member.nickname ?? member.user.username;
    await member.setNickname(newNick, `Changed by ${interaction.user.tag}`);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle(`✏️ Nickname ${newNick ? "Updated" : "Reset"}`)
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(`> **${target.tag}**'s nickname has been ${newNick ? "changed" : "reset to default"}.\n> ${config.divider}`)
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "👤 Member",     value: `${target.tag}\n\`${target.id}\``,   inline: true },
            { name: "⚖️ Moderator", value: interaction.user.tag,                 inline: true },
            { name: "📝 Before",    value: `\`${oldNick}\``,                     inline: true },
            { name: "📝 After",     value: `\`${newNick ?? target.username}\``,  inline: true },
          ).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
