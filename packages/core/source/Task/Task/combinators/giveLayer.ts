import { local_ } from "../_core";
import type { Layer } from "../../Layer";
import { build } from "../../Layer";
import * as M from "../../Managed";
import type { Task } from "../model";

/**
 * Provides a layer to the given effect
 */
export const giveLayer_ = <R, E, A, R1, E1, A1>(
   fa: Task<R & A1, E, A>,
   layer: Layer<R1, E1, A1>
): Task<R & R1, E | E1, A> => M.use_(build(layer), (p) => local_(fa, (r: R & R1) => ({ ...r, ...p })));

/**
 * Provides a layer to the given effect
 */
export const giveLayer = <R1, E1, A1>(layer: Layer<R1, E1, A1>) => <R, E, A>(
   fa: Task<R & A1, E, A>
): Task<R & R1, E | E1, A> => M.use_(build(layer), (p) => local_(fa, (r: R & R1) => ({ ...r, ...p })));
