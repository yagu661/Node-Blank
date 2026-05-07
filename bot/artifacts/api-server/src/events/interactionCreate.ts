import { Events, PermissionsBitField, EmbedBuilder } from "discord.js";
import { logger } from "../lib/logger";
import { checkCooldown } from "../lib/cooldown";
import { config } from "../config";
import type { BotEvent } from "../types/index";
import type { Interaction } from "discord.js";
import type { BotClient } from "../client";

function sysEmbed(color: number, title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`> ${description}`)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}

export const interactionCreate: BotEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (interaction.isAutocomplete()) {
      const client  = interaction.client as BotClient;
      const command = client.commands.get(interaction.commandName);
      if (command && "autocomplete" in command && typeof (command as any).autocomplete === "function") {
        try {
          await (command as any).autocomplete(interaction);
        } catch {
          await interaction.respond([]).catch(() => null);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guild) {
      await interaction.reply({
        embeds: [sysEmbed(config.colors.error, "🚫 Server Only", "This bot's commands can only be used inside a server.")],
        ephemeral: true,
      });
      return;
    }

    const client  = interaction.client as BotClient;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        embeds: [sysEmbed(config.colors.error, "🚫 Unknown Command", "This command does not exist or has been removed.")],
        ephemeral: true,
      });
      return;
    }

    if (command.userPermissions) {
      const member  = interaction.guild.members.cache.get(interaction.user.id);
      const missing = command.userPermissions.filter((p) => !member?.permissions.has(p as bigint));
      if (missing.length > 0) {
        const perms = new PermissionsBitField(missing as bigint[]).toArray().join("`, `");
        await interaction.reply({
          embeds: [sysEmbed(config.colors.error, "🔒 Missing Permissions", `You need the following permission(s) to use this command:\n> \`${perms}\``)],
          ephemeral: true,
        });
        return;
      }
    }

    if (command.botPermissions) {
      const me      = interaction.guild.members.me;
      const missing = command.botPermissions.filter((p) => !me?.permissions.has(p as bigint));
      if (missing.length > 0) {
        const perms = new PermissionsBitField(missing as bigint[]).toArray().join("`, `");
        await interaction.reply({
          embeds: [sysEmbed(config.colors.error, "⚙️ Bot Missing Permissions", `I need the following permission(s) to run this command:\n> \`${perms}\``)],
          ephemeral: true,
        });
        return;
      }
    }

    const remaining = checkCooldown(client, command, interaction.user.id);
    if (remaining !== null) {
      await interaction.reply({
        embeds: [
          sysEmbed(
            config.colors.warning,
            "⏱️ Slow Down!",
            `You can use **/${command.data.name}** again in **${remaining.toFixed(1)}s**.\nPlease be patient.`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    try {
      logger.info({ command: interaction.commandName, user: interaction.user.username, guild: interaction.guild.name }, "Command executed");
      await command.execute(interaction, client);
    } catch (err) {
      logger.error({ err, command: interaction.commandName }, "Command execution error");
      const payload = {
        embeds: [sysEmbed(config.colors.error, "💥 Unexpected Error", "Something went wrong while running this command. Please try again later.")],
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
  },
};
