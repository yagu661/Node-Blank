
import { ping } from "./utility/ping";
import { help } from "./utility/help";
import { info } from "./utility/info";
import { status } from "./utility/status";
import { serverinfo } from "./utility/serverinfo";
import { userinfo } from "./utility/userinfo";
import { avatar } from "./utility/avatar";
import { ban } from "./ban";
import { kick } from "./moderation/kick";
import { unban } from "./moderation/unban";
import { unbanAll } from "./moderation/unban-all";
import { mute } from "./moderation/mute";
import { unmute } from "./moderation/unmute";
import { warn } from "./moderation/warn";
import { clearWarns } from "./moderation/clear-warns";
import { slowMode } from "./moderation/slow-mode";
import { unslowMode } from "./moderation/unslow-mode";
import { lock } from "./moderation/lock";
import { lockAll } from "./moderation/lock-all";
import { unlock } from "./moderation/unlock";
import { unlockAll } from "./moderation/unlock-all";
import { nick } from "./moderation/nick";
import { hide } from "./moderation/hide";
import { unhide } from "./moderation/unhide";
import { clear } from "./moderation/clear";
import { warns } from "./moderation/advanced/warns";
import { softban } from "./moderation/advanced/softban";
import { tempban } from "./moderation/advanced/tempban";
import { role } from "./moderation/advanced/role";
import { banlist } from "./moderation/advanced/banlist";
import { join } from "./music/join";

import { leave } from"./music/leave";
import { play } from "./music/play";
import { toggle247 } from "./music/247";
import { disable247 } from "./music/247off";
import { filter } from "./music/filter";
import { pause } from "./music/pause";
import { resume } from "./music/resume";
import { skip } from "./music/skip";
import { stop } from "./music/stop";
import { queue } from "./music/queue";
import { nowplaying } from "./music/nowplaying";
import { volume } from "./music/volume";
import { loop } from "./music/loop";
import { shuffle } from "./music/shuffle";
import { remove } from "./music/remove";
import { seek } from "./music/seek";
import type { Command } from "../types/index";


export const commands: Command[] = [
  ping, help, info, status, serverinfo, userinfo, avatar,
  ban, kick, unban, unbanAll,
  mute, unmute,
  warn, clearWarns,
  slowMode, unslowMode,
  lock, lockAll, unlock, unlockAll,
  nick, hide, unhide, clear,
  warns, softban, tempban, role, banlist,

];
