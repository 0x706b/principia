import { fail, foldCauseM_, pure } from "../core";
import type { Effect } from "../model";

export const causeAsError = <R, E, A>(fa: Effect<R, E, A>) => foldCauseM_(fa, fail, pure);
