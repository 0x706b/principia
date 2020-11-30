import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { fail, halt } from "../_core";
import * as C from "../Cause";
import type { IO } from "../model";
import { catchAllCause_ } from "./catchAllCause";

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefineWith_<R, E, A, E1, E2>(
  fa: IO<R, E, A>,
  pf: (u: unknown) => Option<E1>,
  f: (e: E) => E2
): IO<R, E1 | E2, A> {
  return catchAllCause_(
    fa,
    (cause): IO<R, E1 | E2, A> =>
      pipe(
        cause,
        C.find(pf),
        O.fold(() => pipe(cause, C.map(f), halt), fail)
      )
  );
}

/**
 * Takes some fiber failures and converts them into errors, using the
 * specified function to convert the `E` into an `E1 | E2`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function unrefineWith<E1>(
  fa: (u: unknown) => Option<E1>
): <E, E2>(f: (e: E) => E2) => <R, A>(ef: IO<R, E, A>) => IO<R, E1 | E2, A> {
  return (f) => (ef) => unrefineWith_(ef, fa, f);
}
