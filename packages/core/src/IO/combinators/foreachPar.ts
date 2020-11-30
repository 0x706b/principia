import * as I from "../_core";
import { foreachUnitPar_ } from "./foreachUnitPar";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar_ = <R, E, A, B>(
  as: Iterable<A>,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> => {
  const arr = Array.from(as);

  return I.chain_(
    I.total<B[]>(() => []),
    (array) => {
      function fn([a, n]: [A, number]) {
        return I.chain_(
          I.suspend(() => f(a)),
          (b) =>
            I.total(() => {
              array[n] = b;
            })
        );
      }
      return I.chain_(
        foreachUnitPar_(
          arr.map((a, n) => [a, n] as [A, number]),
          fn
        ),
        () => I.total(() => array)
      );
    }
  );
};

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export function foreachPar<R, E, A, B>(
  f: (a: A) => I.IO<R, E, B>
): (as: Iterable<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => foreachPar_(as, f);
}
