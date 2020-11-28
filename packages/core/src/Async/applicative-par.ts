import { tuple } from "../Function";
import { zipWithPar_ } from "./apply-par";
import type { Async } from "./model";

/*
 * -------------------------------------------
 * Parallel Applicative Async
 * -------------------------------------------
 */

export function zipPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, readonly [A, A1]> {
  return zipWithPar_(fa, fb, tuple);
}

export function zipPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, readonly [A, A1]> {
  return (fa) => zipPar_(fa, fb);
}
