import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { config } from "../../../config";
import type { Command } from "../../../types/index";

export const banlist: Command = {
  data: new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("<a:rules_book:1501544042931028059> View a paginated list of every banned user in this server")
    .addIntegerOption((o) => o.setName("page").setDescription("Page number").setMinValue(1).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 10,
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  async execute(interaction) {
    await interaction.deferReply();
    const guild = interaction.guild!;

    const bans = await guild.bans.fetch();

    if (bans.size === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.success)
            .setTitle("<a:rules_book:1501544042931028059> Ban List")
            .setDescription(`> This server has no active bans.\n> ${config.divider}`)
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
        ],
      });
      return;
    }

    const perPage  = 10;
    const page     = Math.min(interaction.options.getInteger("page") ?? 1, Math.ceil(bans.size / perPage));
    const start    = (page - 1) * perPage;
    const slice    = [...bans.values()].slice(start, start + perPage);
    const pages    = Math.ceil(bans.size / perPage);

    const fields = slice.map((ban, i) => ({
      name: `🔨 ${start + i + 1}. ${ban.user.tag}`,
      value: `> 🆔 \`${ban.user.id}\`\n> <a:rules_book2:1501544101336580146> ${ban.reason ?? "No reason provided"}`,
      inline: false,
    }));

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle(`<a:rules_book:1501544042931028059> Ban List — ${guild.name}`)
          .setDescription(
            `> **${bans.size}** total banned user(s).\n` +
            `> Showing page **${page}/${pages}** (${slice.length} entries).\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
          .addFields(fields)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • Page ${page}/${pages} • ${interaction.user.tag}` }),
      ],
    });
  },
};
