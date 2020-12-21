import type { Managed, URManaged } from "../core";

import { chain } from "../core";
import { swapWith_ } from "./swap";

/**
 * Effectfully map the error channel
 */
export function chainError_<R, E, A, R1, E1>(
  ma: Managed<R, E, A>,
  f: (e: E) => URManaged<R1, E1>
): Managed<R & R1, E1, A> {
  return swapWith_(ma, chain(f));
}

/**
 * Effectfully map the error channel
 */
export function chainError<E, R1, E1>(
  f: (e: E) => URManaged<R1, E1>
): <R, A>(ma: Managed<R, E, A>) => Managed<R & R1, E1, A> {
  return (ma) => chainError_(ma, f);
}
