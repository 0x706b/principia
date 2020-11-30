import * as I from "./_internal/io";
import { Managed } from "./model";
import type { ReleaseMap } from "./ReleaseMap";

/*
 * -------------------------------------------
 * Functor Managed
 * -------------------------------------------
 */

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map_<R, E, A, B>(fa: Managed<R, E, A>, f: (a: A) => B): Managed<R, E, B> {
  return new Managed<R, E, B>(I.map_(fa.io, ([fin, a]) => [fin, f(a)]));
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Managed<R, E, A>) => Managed<R, E, B> {
  return (fa) => map_(fa, f);
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return new Managed<R & R1, E | E1, B>(
    I.chain_(fa.io, ([fin, a]) =>
      I.gives_(
        I.map_(f(a), (b) => [fin, b]),
        ([r]: readonly [R & R1, ReleaseMap]) => r
      )
    )
  );
}

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export function mapM<R1, E1, A, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => mapM_(fa, f);
}
