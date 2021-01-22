import type { Either } from './Either'
import type { PredicateWithIndex } from './Function'
import type { Monoid } from './Monoid'
import type * as P from './typeclass'

import * as A from './Array'
import { identity, tuple } from './Function'
import * as HKT from './HKT'

export const URI = 'Iterable'
export type URI = typeof URI

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Iterable<A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
}

export function iterable<A>(iterator: () => IterableIterator<A>): Iterable<A> {
  return {
    [Symbol.iterator]() {
      return iterator()
    }
  }
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function zipWith_<A, B, C>(fa: Iterable<A>, fb: Iterable<B>, f: (a: A, b: B) => C): Iterable<C> {
  return {
    [Symbol.iterator]() {
      let done = false
      const ia = fa[Symbol.iterator]()
      const ib = fb[Symbol.iterator]()
      return {
        next() {
          if (done) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.return!()
          }

          const va = ia.next()
          const vb = ib.next()

          return va.done || vb.done
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.return!()
            : { done: false, value: f(va.value, vb.value) }
        },
        return(value?: unknown) {
          if (!done) {
            done = true

            if (typeof ia.return === 'function') {
              ia.return()
            }
            if (typeof ib.return === 'function') {
              ib.return()
            }
          }

          return { done: true, value }
        }
      }
    }
  }
}

export function zipWith<A, B, C>(fb: Iterable<B>, f: (a: A, b: B) => C): (fa: Iterable<A>) => Iterable<C> {
  return (fa) => zipWith_(fa, fb, f)
}

export function ap_<A, B>(fab: Iterable<(a: A) => B>, fa: Iterable<A>): Iterable<B> {
  return bind_(fab, (f) => map_(fa, f))
}

export function ap<A>(fa: Iterable<A>): <B>(fab: Iterable<(a: A) => B>) => Iterable<B> {
  return (fab) => ap_(fab, fa)
}

export function pure<A>(a: A): Iterable<A> {
  return iterable(function* () {
    yield a
  })
}

export function zip<B>(fb: Iterable<B>): <A>(fa: Iterable<A>) => Iterable<readonly [A, B]> {
  return (fa) => zipWith_(fa, fb, (a, b) => [a, b] as const)
}

export function zip_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b] as const)
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function ifilter_<A>(fa: Iterable<A>, predicate: PredicateWithIndex<number, A>): Iterable<A> {
  return iterable(function* () {
    let i          = -1
    const iterator = fa[Symbol.iterator]()
    for (;;) {
      const result = iterator.next()
      if (result.done) {
        break
      }
      i += 1
      if (predicate(i, result.value)) {
        yield result.value
      }
    }
  })
}

export function ipartitionMap_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => Either<B, C>
): readonly [Iterable<B>, Iterable<C>] {
  return tuple(
    iterable(function* () {
      const mapped   = imap_(fa, f)
      const iterator = mapped[Symbol.iterator]()
      for (;;) {
        const result = iterator.next()
        if (result.done) {
          break
        }
        if (result.value._tag === 'Left') {
          yield result.value.left
        }
      }
    }),
    iterable(function* () {
      const mapped   = imap_(fa, f)
      const iterator = mapped[Symbol.iterator]()
      for (;;) {
        const result = iterator.next()
        if (result.done) {
          break
        }
        if (result.value._tag === 'Right') {
          yield result.value.right
        }
      }
    })
  )
}

export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (as: Iterable<A>) => readonly [Iterable<B>, Iterable<C>] {
  return (as) => ipartitionMap_(as, (_, a) => f(a))
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function ifoldMap_<M>(M: Monoid<M>): <A>(fa: Iterable<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => {
    let res        = M.nat
    let n          = -1
    const iterator = fa[Symbol.iterator]()
    for (;;) {
      const result = iterator.next()
      if (result.done) {
        break
      }
      n  += 1
      res = M.combine_(res, f(n, result.value))
    }
    return res
  }
}

export function ifoldMap<M>(M: Monoid<M>): <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: Monoid<M>): <A>(fa: Iterable<A>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function ifoldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, i: number, a: A) => B): B {
  let res        = b
  let n          = -1
  const iterator = fa[Symbol.iterator]()
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    const result = iterator.next()
    if (result.done) {
      break
    }
    n  += 1
    res = f(res, n, result.value)
  }
  return res
}

export function ifoldl<A, B>(b: B, f: (b: B, i: number, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

export function foldl_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function ifoldr<A, B>(b: B, f: (a: A, i: number, b: B) => B): (fa: Iterable<A>) => B {
  return (fa) => A.ifoldr_(A.from(fa), b, f)
}

export function ifoldr_<A, B>(fa: Iterable<A>, b: B, f: (a: A, i: number, b: B) => B): B {
  return A.ifoldr_(A.from(fa), b, f)
}

export function foldr_<A, B>(fa: Iterable<A>, b: B, f: (a: A, b: B) => B): B {
  return A.foldr_(A.from(fa), b, f)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: Iterable<A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

function* genMap<A, B>(ia: Iterator<A>, f: (i: number, a: A) => B) {
  let n = -1
  for (;;) {
    const result = ia.next()
    if (result.done) {
      break
    }
    n += 1
    yield f(n, result.value)
  }
}

export function imap_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> {
  return iterable(() => genMap(fa[Symbol.iterator](), f))
}

export function imap<A, B>(f: (i: number, a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => iterable(() => genMap(fa[Symbol.iterator](), f))
}

export function map_<A, B>(fa: Iterable<A>, f: (a: A) => B): Iterable<B> {
  return imap_(fa, (_, a) => f(a))
}

export function map<A, B>(f: (a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
  return (ma) => bind_(ma, f)
}

export function bind_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable(function* () {
    yield* genbind(ma[Symbol.iterator](), f)
  })
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
  return bind_(mma, identity)
}

function* genbind<A, B>(ia: Iterator<A>, f: (a: A) => Iterable<B>) {
  for (;;) {
    const result = ia.next()
    if (result.done) {
      break
    }
    const ib = f(result.value)[Symbol.iterator]()
    for (;;) {
      const result = ib.next()
      if (result.done) {
        break
      }
      yield result.value
    }
  }
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Iterable<void> {
  return pure(undefined)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function concat_<A>(ia: Iterable<A>, ib: Iterable<A>): Iterable<A> {
  return iterable(function* () {
    yield* ia
    yield* ib
  })
}

export function concat<A>(ib: Iterable<A>): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => concat_(ia, ib)
}

export function append_<A>(ia: Iterable<A>, element: A): Iterable<A> {
  return iterable(function* () {
    yield* ia
    yield element
  })
}

export function append<A>(element: A): (ia: Iterable<A>) => Iterable<A> {
  return (ia) => append_(ia, element)
}

export function take_<A>(ia: Iterable<A>, n: number): Iterable<A> {
  return iterable(function* () {
    const as = ia[Symbol.iterator]()

    for (let i = 0; i < n; i++) {
      const el = as.next()
      if (el.done) {
        break
      }
      yield el.value
    }
  })
}

export function take(n: number): <A>(fa: Iterable<A>) => Iterable<A> {
  return (fa) => take_(fa, n)
}

export function toArray<A>(fa: Iterable<A>): ReadonlyArray<A> {
  const as: A[]  = []
  const iterator = fa[Symbol.iterator]()
  for (;;) {
    const result = iterator.next()
    if (result.done) {
      break
    }
    as.push(result.value)
  }
  return as
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Foldable = HKT.instance<P.Foldable<[URI]>>({
  foldl_: foldl_,
  foldl: foldl,
  foldr_: foldr_,
  foldr: foldr,
  foldMap_,
  foldMap
})
