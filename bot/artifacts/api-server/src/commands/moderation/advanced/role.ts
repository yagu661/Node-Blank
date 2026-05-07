import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../../config";
import { errEmbed, caseId } from "../../../lib/helpers";
import type { Command } from "../../../types/index";

export const role: Command = {
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("🎭 Grant or revoke any role from a member with an optional reason")
    .addStringOption((o) =>
      o.setName("action").setDescription("Whether to add or remove the role").setRequired(true)
        .addChoices(
          { name: "➕ Add",    value: "add"    },
          { name: "➖ Remove", value: "remove" },
        ),
    )
    .addUserOption((o) => o.setName("target").setDescription("The member to update").setRequired(true))
    .addRoleOption((o) => o.setName("role").setDescription("The role to add or remove").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the role change").setMaxLength(512).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  async execute(interaction) {
    await interaction.deferReply();
    const action   = interaction.options.getString("action", true) as "add" | "remove";
    const target   = interaction.options.getUser("target", true);
    const roleOpt  = interaction.options.getRole("role", true);
    const reason   = interaction.options.getString("reason")?.trim() ?? "No reason provided";
    const guild    = interaction.guild!;
    const case_id  = caseId();

    const member = await guild.members.fetch(target.id).catch(() => null);
    if (!member) { await interaction.editReply({ embeds: [errEmbed("Not Found", "That user is not in this server.")] }); return; }

    const botMember = guild.members.me!;
    if (roleOpt.position >= botMember.roles.highest.position) {
      await interaction.editReply({ embeds: [errEmbed("Cannot Manage Role", "That role is equal to or higher than my highest role.")] });
      return;
    }

    const executor = await guild.members.fetch(interaction.user.id);
    if (roleOpt.position >= executor.roles.highest.position) {
      await interaction.editReply({ embeds: [errEmbed("Cannot Manage Role", "You cannot manage a role equal to or higher than your own highest role.")] });
      return;
    }

    if (roleOpt.managed) {
      await interaction.editReply({ embeds: [errEmbed("Cannot Manage Role", "That role is managed by an integration and cannot be manually assigned.")] });
      return;
    }

    const hasRole = member.roles.cache.has(roleOpt.id);

    if (action === "add" && hasRole) {
      await interaction.editReply({ embeds: [errEmbed("Already Has Role", `**${target.tag}** already has the ${roleOpt} role.`)] });
      return;
    }
    if (action === "remove" && !hasRole) {
      await interaction.editReply({ embeds: [errEmbed("Does Not Have Role", `**${target.tag}** does not have the ${roleOpt} role.`)] });
      return;
    }

    if (action === "add") {
      await member.roles.add(roleOpt.id, `[${interaction.user.tag}] ${reason}`);
    } else {
      await member.roles.remove(roleOpt.id, `[${interaction.user.tag}] ${reason}`);
    }

    const isAdd = action === "add";

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(isAdd ? config.colors.success : config.colors.warning)
          .setTitle(isAdd ? "➕ Role Added" : "➖ Role Removed")
          .setAuthor({ name: `⚖️ ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setDescription(
            `> Role ${isAdd ? "added to" : "removed from"} **${target.tag}** successfully.\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "👤 Member",      value: `${target.tag}\n\`${target.id}\``, inline: true },
            { name: "🎭 Role",        value: `${roleOpt}`,                      inline: true },
            { name: "⚖️ Moderator",   value: interaction.user.tag,              inline: true },
            { name: "<a:rules_book2:1501544101336580146> Reason",      value: reason,                            inline: false },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • Case ${case_id}` }),
      ],
    });
  },
};
