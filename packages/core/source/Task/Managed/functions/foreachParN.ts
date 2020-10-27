import * as T from "../_internal/task";
import { tuple } from "../../../Function";
import { parallelN, sequential } from "../../ExecutionStrategy";
import { foreachParN_ as effectForeachParN } from "../../Task/functions/foreachParN";
import { mapTask_ } from "../core";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => foreachParN_(n)(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, readonly B[]> =>
   mapTask_(makeManagedReleaseMap(parallelN(n)), (parallelReleaseMap) => {
      const makeInnerMap = T.local_(
         T.map_(makeManagedReleaseMap(sequential()).task, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return effectForeachParN(n)(as, (a) =>
         T.map_(
            T.chain_(makeInnerMap, (innerMap) => T.local_(f(a).task, (u: R) => tuple(u, innerMap))),
            ([_, b]) => b
         )
      );
   });
