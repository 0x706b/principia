import type * as HKT from "@principia/prelude/HKT";

import type { Effect } from "../../Effect/model";

export type Decision<R, I, O> = Done<O> | Continue<R, I, O>;

export interface Continue<R, I, O> {
   readonly _tag: "Continue";
   readonly out: O;
   readonly interval: number;
   readonly next: StepFunction<R, I, O>;
}

export interface Done<O> {
   readonly _tag: "Done";
   readonly out: O;
}

export type StepFunction<R, I, O> = (interval: number, input: I) => Effect<R, never, Decision<R, I, O>>;

export const URI = "Decision";
export type URI = typeof URI;

export type V = HKT.V<"X", "+"> & HKT.V<"R", "-"> & HKT.V<"E", "-">;
