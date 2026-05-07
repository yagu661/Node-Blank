import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

const STATUS_EMOJI: Record<string, string> = { online: "🟢", idle: "🟡", dnd: "🔴", offline: "⚫" };
const STATUS_LABEL: Record<string, string> = { online: "Online", idle: "Idle", dnd: "Do Not Disturb", offline: "Offline" };

export const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("🔍 View detailed information about a member")
    .addUserOption((o) => o.setName("user").setDescription("The user to inspect (defaults to you)").setRequired(false)),
  cooldown: 5,
  async execute(interaction) {
    if (!interaction.guild) { await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true }); return; }

    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const status = member?.presence?.status ?? "offline";
    const roles = member
      ? member.roles.cache
          .filter((r) => r.id !== interaction.guild!.id)
          .sort((a, b) => b.position - a.position)
          .map((r) => r.toString())
          .slice(0, 6)
          .join(" ") || "`None`"
      : "`N/A — not in server`";

    const color = (member?.displayHexColor && member.displayHexColor !== "#000000")
      ? member.displayHexColor
      : config.colors.primary;

    const warnings = interaction.client;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(`🔍 ${target.tag}`)
          .setDescription(
            `> ${target.bot ? "🤖 Bot Account" : "👤 User Account"}\n` +
            `> ${STATUS_EMOJI[status] ?? "⚫"} **${STATUS_LABEL[status] ?? "Offline"}**\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(target.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "🆔 User ID",         value: `\`${target.id}\``,                                           inline: true },
            { name: "📅 Account Created",  value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,        inline: true },
            ...(member ? [
              { name: "📥 Joined Server",  value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`,        inline: true },
              { name: "🏷️ Nickname",       value: member.nickname ? `\`${member.nickname}\`` : "`None`",        inline: true },
              { name: "🎨 Color",          value: `\`${member.displayHexColor}\``,                              inline: true },
              { name: "⏱️ Timeout",        value: member.communicationDisabledUntil ? `<t:${Math.floor(member.communicationDisabledUntilTimestamp! / 1000)}:R>` : "`None`", inline: true },
              { name: `🎭 Roles (top 6)`,  value: roles,                                                        inline: false },
            ] : []),
          )
          .setImage(target.bannerURL({ size: 1024 }) ?? null)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
