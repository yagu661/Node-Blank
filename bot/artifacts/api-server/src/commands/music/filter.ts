import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

const FILTERS: Record<string, { label: string; emoji: string; description: string }> = {
  bassboost:  { label: "Bass Boost",   emoji: "🔊", description: "Deep bass enhancement"      },
  "8d":       { label: "8D Audio",     emoji: "🎧", description: "Immersive 360° sound"        },
  nightcore:  { label: "Nightcore",    emoji: "⚡", description: "Sped up + pitch raised"      },
  vaporwave:  { label: "Vaporwave",    emoji: "🌊", description: "Slowed + pitch lowered"      },
  lofi:       { label: "Lo-Fi",        emoji: "☕", description: "Chill lo-fi effect"           },
  echo:       { label: "Echo",         emoji: "🔁", description: "Echo / reverb effect"        },
  pitch:      { label: "Pitch Up",     emoji: "📈", description: "Slightly higher pitch"       },
  karaoke:    { label: "Karaoke",      emoji: "🎤", description: "Vocal removal"               },
  tremolo:    { label: "Tremolo",      emoji: "〰️", description: "Amplitude modulation"        },
  vibrato:    { label: "Vibrato",      emoji: "🎸", description: "Pitch oscillation"           },
  subboost:   { label: "Sub Boost",    emoji: "💥", description: "Sub-bass rumble"             },
  flanger:    { label: "Flanger",      emoji: "🌀", description: "Swirling flanger effect"     },
  normalizer: { label: "Normalizer",   emoji: "📊", description: "Even out volume dynamics"    },
  compressor: { label: "Compressor",   emoji: "🎚️", description: "Dynamic range compression"  },
  reverse:    { label: "Reverse",      emoji: "⏪", description: "Play audio backwards"        },
};

export const filter: Command = {
  data: new SlashCommandBuilder()
    .setName("filter")
    .setDescription("🎛️ Toggle real-time audio effects: bass boost, 8D, nightcore, vaporwave & more")
    .addStringOption((o) =>
      o.setName("preset")
        .setDescription("Filter to toggle (leave empty to see active filters or use clear)")
        .setRequired(false)
        .addChoices(
          ...Object.entries(FILTERS).map(([val, { label, emoji }]) => ({
            name: `${emoji} ${label}`,
            value: val,
          }))
        )
    )
    .addBooleanOption((o) =>
      o.setName("clear").setDescription("Clear ALL active filters").setRequired(false)
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

    const shouldClear = interaction.options.getBoolean("clear") ?? false;
    const preset      = interaction.options.getString("preset");

    if (shouldClear) {
      await queue.filters.ffmpeg.setFilters(false);
      return void interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(MUSIC_COLOR)
            .setTitle("🎛️ Filters Cleared")
            .setDescription("> All audio filters have been removed. Back to pure, clean sound.")
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter}` }),
        ],
      });
    }

    const activeFilters = queue.filters.ffmpeg.toArray() as string[];

    if (!preset) {
      const list = activeFilters.length > 0
        ? activeFilters.map((f) => {
            const meta = FILTERS[f];
            return meta ? `> ${meta.emoji} **${meta.label}** — ${meta.description}` : `> 🔧 \`${f}\``;
          }).join("\n")
        : "> No filters are currently active.";

      return void interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(MUSIC_COLOR)
            .setTitle("🎛️ Active Filters")
            .setDescription(list)
            .addFields({ name: "💡 Tip", value: "Use `/filter preset:<name>` to toggle a filter, or `/filter clear:True` to remove all." })
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter}` }),
        ],
      });
    }

    const meta      = FILTERS[preset]!;
    const wasActive = activeFilters.includes(preset);

    await queue.filters.ffmpeg.toggle([preset] as any);

    const nowActive = !wasActive;

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle(`${meta.emoji} ${meta.label} — ${nowActive ? "Enabled" : "Disabled"}`)
          .setDescription(
            nowActive
              ? `> ✅ **${meta.label}** filter is now **on**.\n> ${meta.description}.`
              : `> ❌ **${meta.label}** filter has been **removed**.`,
          )
          .addFields({
            name: "🎛️ Active Filters",
            value: (() => {
              const updated = nowActive
                ? [...activeFilters, preset]
                : activeFilters.filter((f) => f !== preset);
              return updated.length > 0
                ? updated.map((f) => {
                    const m = FILTERS[f];
                    return m ? `${m.emoji} **${m.label}**` : `\`${f}\``;
                  }).join("  •  ")
                : "None";
            })(),
          })
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
