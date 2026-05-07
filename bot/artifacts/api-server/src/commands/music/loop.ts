import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { QueueRepeatMode } from "discord-player";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const loop: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("🔁 Set the loop mode: disabled, single track repeat, or full queue loop")
    .addStringOption((o) =>
      o.setName("mode")
        .setDescription("Loop mode to apply")
        .setRequired(true)
        .addChoices(
          { name: "🚫 Off",        value: "off"      },
          { name: "🔂 Track",      value: "track"    },
          { name: "🔁 Queue",      value: "queue"    },
          { name: "♾️ Autoplay",   value: "autoplay" },
        )
    ),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue?.isPlaying()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const modeMap: Record<string, QueueRepeatMode> = {
      off:      QueueRepeatMode.OFF,
      track:    QueueRepeatMode.TRACK,
      queue:    QueueRepeatMode.QUEUE,
      autoplay: QueueRepeatMode.AUTOPLAY,
    };

    const labelMap: Record<string, string> = {
      off:      "🚫 Off",
      track:    "🔂 Track",
      queue:    "🔁 Queue",
      autoplay: "♾️ Autoplay",
    };

    const modeKey = interaction.options.getString("mode", true);
    const mode    = modeMap[modeKey]!;
    queue.setRepeatMode(mode);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🔁 Loop Mode Updated")
          .setDescription(`> Loop mode set to **${labelMap[modeKey]}**.`)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
