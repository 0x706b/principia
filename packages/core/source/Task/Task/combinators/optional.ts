import * as T from "../_core";
import { flow } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";

/**
 * Converts an option on errors into an option on values.
 */
export const optional = <R, E, A>(ef: T.Task<R, Option<E>, A>): T.Task<R, E, Option<A>> =>
   T.foldM_(
      ef,
      O.fold(() => T.pure(O.none()), T.fail),
      flow(O.some, T.pure)
   );
