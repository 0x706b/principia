import * as E from "../Either";
import { succeed } from "./constructors";
import { foldM_ } from "./fold";
import type { XPure } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Fallible XPure
 * -------------------------------------------
 */

export function recover<S1, S2, R, E, A>(fa: XPure<S1, S2, R, E, A>): XPure<S1, S2, R, never, E.Either<E, A>> {
   return foldM_(
      fa,
      (e) => succeed(E.left(e)),
      (a) => succeed(E.right(a))
   );
}

export function absolve<S1, S2, R, E, E1, A>(fa: XPure<S1, S2, R, E, E.Either<E1, A>>): XPure<S1, S2, R, E | E1, A> {
   return chain_(fa, E.fold(fail, succeed));
}
