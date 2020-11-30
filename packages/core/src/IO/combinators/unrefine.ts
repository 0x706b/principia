import { identity } from "../../Function";
import type { Option } from "../../Option";
import type { IO } from "../model";
import { unrefineWith_ } from "./unrefineWith";

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefine_<R, E, A, E1>(fa: IO<R, E, A>, pf: (u: unknown) => Option<E1>) {
  return unrefineWith_(fa, pf, identity);
}

/**
 * Takes some fiber failures and converts them into errors.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefine<E1>(
  pf: (u: unknown) => Option<E1>
): <R, E, A>(fa: IO<R, E, A>) => IO<R, E1 | E, A> {
  return (fa) => unrefine_(fa, pf);
}
