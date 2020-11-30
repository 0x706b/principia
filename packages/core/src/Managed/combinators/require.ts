import * as O from "../../Option";
import { fail, succeed, total } from "../constructors";
import type { Managed } from "../model";
import { chain_ } from "../monad";

export function require_<R, E, A>(
  ma: Managed<R, E, O.Option<A>>,
  error: () => E
): Managed<R, E, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(error), fail), succeed)
  );
}

function _require<E>(error: () => E): <R, A>(ma: Managed<R, E, O.Option<A>>) => Managed<R, E, A> {
  return (ma) => require_(ma, error);
}
export { _require as require };
