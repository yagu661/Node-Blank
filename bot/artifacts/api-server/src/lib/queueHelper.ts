import type { GuildMember } from "discord.js";
import { useMainPlayer, useQueue } from "discord-player";

export function getQueueForMember(member: GuildMember) {
  if (!member.guild) return null;
  // discord-player stores queues keyed by guild ID
  const queue = useQueue(member.guild.id);
  if (queue) return queue;

  // Fallback: try looking up via player nodes
  const player = useMainPlayer();
  if (!player) return null;
  return player.nodes.get(member.guild.id) ?? null;
}
