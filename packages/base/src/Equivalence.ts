/**
 * An `Equivalence<A, B>` defines an equivalence between two types `A` and `B`.
 * These types represent different ways to store the same information.
 *
 * Equivalences are symmetrical. So if `A` is equivalent to `B`, then `B` is
 * equivalent to `A`.
 */
export interface Equivalence<A, B> {
  readonly to: (a: A) => B
  readonly from: (b: B) => A
}

/**
 * Constructs an equivalence between a right-associated nested tuple, and a
 * left-associated nested tuple.
 */
export const tuple = <A, B, C>(): Equivalence<readonly [A, readonly [B, C]], readonly [readonly [A, B], C]> => ({
  to: ([a, [b, c]]) => [[a, b], c],
  from: ([[a, b], c]) => [a, [b, c]]
})

export const tupleUnit = <A>(): Equivalence<readonly [A, void], A> => ({
  to: ([a, _]) => a,
  from: (a) => [a, undefined]
})

export const tupleFlip = <A, B>(): Equivalence<readonly [A, B], readonly [B, A]> => ({
  to: ([a, b]) => [b, a],
  from: ([b, a]) => [a, b]
})

export function compose_<A, B, C>(ab: Equivalence<A, B>, bc: Equivalence<B, C>): Equivalence<A, C> {
  return {
    from: (c) => ab.from(bc.from(c)),
    to: (a) => bc.to(ab.to(a))
  }
}

export function compose<B, C>(bc: Equivalence<B, C>): <A>(ab: Equivalence<A, B>) => Equivalence<A, C> {
  return (ab) => compose_(ab, bc)
}
