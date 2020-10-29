import { identity } from "../../../Function";
import { both, then } from "./constructors";
import { empty } from "./empty";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Monad Cause
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <E, D>(fa: Cause<E>, f: (e: E) => Cause<D>): Cause<D> => {
   switch (fa._tag) {
      case "Empty":
         return empty;
      case "Fail":
         return f(fa.value);
      case "Die":
         return fa;
      case "Interrupt":
         return fa;
      case "Then":
         return then(chain_(fa.left, f), chain_(fa.right, f));
      case "Both":
         return both(chain_(fa.left, f), chain_(fa.right, f));
   }
};

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <E, D>(f: (e: E) => Cause<D>) => (fa: Cause<E>) => chain_(fa, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten = <E>(ffa: Cause<Cause<E>>) => chain_(ffa, identity);
