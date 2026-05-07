import { SlashCommandBuilder, ChannelType, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

const VERIFICATION: Record<number, string> = { 0: "None", 1: "Low", 2: "Medium", 3: "High", 4: "Highest" };
const CONTENT_FILTER: Record<number, string> = { 0: "Disabled", 1: "Members without roles", 2: "All members" };

export const serverinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("🏰 Display detailed statistics about this server"),
  cooldown: 10,
  async execute(interaction) {
    const guild = interaction.guild;
    if (!guild) { await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true }); return; }

    await guild.members.fetch();

    const textCh   = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceCh  = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const cats     = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;
    const threads  = guild.channels.cache.filter((c) => c.isThread()).size;
    const roles    = guild.roles.cache.size - 1;
    const bots     = guild.members.cache.filter((m) => m.user.bot).size;
    const humans   = guild.memberCount - bots;
    const emojis   = guild.emojis.cache.size;
    const stickers = guild.stickers.cache.size;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`🏰 ${guild.name}`)
          .setDescription(
            `> 🆔 **ID:** \`${guild.id}\`\n` +
            `> 👑 **Owner:** <@${guild.ownerId}>\n` +
            `> 📅 **Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
          .addFields(
            {
              name: "👥 Members",
              value: `👤 Humans: \`${humans}\`\n🤖 Bots: \`${bots}\`\n📊 Total: \`${guild.memberCount}\``,
              inline: true,
            },
            {
              name: "💬 Channels",
              value: `💬 Text: \`${textCh}\`\n🔊 Voice: \`${voiceCh}\`\n📁 Categories: \`${cats}\`\n🧵 Threads: \`${threads}\``,
              inline: true,
            },
            {
              name: "🛡️ Security",
              value: `🔒 Verification: \`${VERIFICATION[guild.verificationLevel] ?? "Unknown"}\`\n🧹 Filter: \`${CONTENT_FILTER[guild.explicitContentFilter] ?? "Unknown"}\``,
              inline: true,
            },
            {
              name: "💎 Boosts",
              value: `🚀 Level: \`${guild.premiumTier}\`\n✨ Boosts: \`${guild.premiumSubscriptionCount ?? 0}\``,
              inline: true,
            },
            {
              name: "🎨 Assets",
              value: `😀 Emojis: \`${emojis}\`\n🎭 Roles: \`${roles}\`\n🎑 Stickers: \`${stickers}\``,
              inline: true,
            },
          )
          .setImage(guild.bannerURL({ size: 1024 }) ?? null)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
