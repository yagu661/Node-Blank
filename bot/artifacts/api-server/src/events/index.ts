import { ready } from "./ready";
import { interactionCreate } from "./interactionCreate";
import { error, warn } from "./error";

export const events = [ready, interactionCreate, error, warn];
