import type { Semigroup } from './Semigroup'

import { makeSemigroup } from './Semigroup'

/**
 * `Monoid` defines a binary operation on type `M`, and an `identity element` (or `natural element`, hence the name `nat`).
 *
 * In addition to the associative law satisfied by `Semigroup`, a `Monoid` must satisfy the left and right `unit` laws:
 *
 * For a binary operation `*` on type `M` and identity element `1` in `M`:
 *
 * ```
 * 1 * a === 1 === a * 1 for a in M
 * ```
 */
export interface Monoid<M> extends Semigroup<M> {
  readonly nat: M
}

export const makeMonoid = <A>(c: (l: A, r: A) => A, nat: A): Monoid<A> => ({
  ...makeSemigroup(c),
  nat
})
