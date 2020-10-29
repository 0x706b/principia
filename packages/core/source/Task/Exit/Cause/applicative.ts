import { fail } from "./constructors";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Applicative Cause
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info a `Cause`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <E>(e: E): Cause<E> => fail(e);
