import type { Unfoldable } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as O from "../Option";
import { collect_ } from "./combinators";
import type { ReadonlyRecord } from "./model";

/**
 * @category Destructors
 * @since 1.0.0
 */
export function toArray<N extends string, A>(
  r: ReadonlyRecord<N, A>
): ReadonlyArray<readonly [N, A]> {
  return collect_(r, (k, a) => [k, a]);
}

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUnfoldable<F extends HKT.URIS, C = HKT.Auto>(U: Unfoldable<F, C>) {
  return <N extends string, A>(
    r: ReadonlyRecord<N, A>
  ): HKT.Kind<
    F,
    C,
    HKT.Initial<C, "N">,
    HKT.Initial<C, "K">,
    HKT.Initial<C, "Q">,
    HKT.Initial<C, "W">,
    HKT.Initial<C, "X">,
    HKT.Initial<C, "I">,
    HKT.Initial<C, "S">,
    HKT.Initial<C, "R">,
    HKT.Initial<C, "E">,
    readonly [N, A]
  > => {
    const arr = toArray(r);
    const len = arr.length;
    return U.unfold(0, (b) => (b < len ? O.some([arr[b], b + 1]) : O.none()));
  };
}
