import type * as HKT from "@principia/base/HKT";
import type { Option } from "@principia/core/Option";

import * as O from "@principia/base/data/Option";
import { constant } from "@principia/core/Function";

/*
 * -------------------------------------------
 * Optional Model
 * -------------------------------------------
 */

export interface Optional<S, A> {
  readonly getOption: (s: S) => Option<A>;
  readonly set: (a: A) => (s: S) => S;
}

export const URI = "optics/Optional";

export type URI = typeof URI;

export type V = HKT.V<"I", "_">;

declare module "@principia/base/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Optional<I, A>;
  }
}

export function id<S>(): Optional<S, S> {
  return {
    getOption: O.some,
    set: constant
  };
}
