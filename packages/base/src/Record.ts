import type * as E from './Either'
import type { Eq } from './Eq'
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from './Function'
import type * as HKT from './HKT'
import type { RecordURI } from './Modules'
import type { Show } from './Show'

import { makeEq } from './Eq/core'
import { identity, pipe, tuple } from './Function'
import * as O from './Option'
import * as P from './typeclass'
import { makeMonoid } from './typeclass'

const _hasOwnProperty = Object.prototype.hasOwnProperty

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type ReadonlyRecord<K extends string, T> = Readonly<Record<K, T>>

export type InferRecordType<T extends ReadonlyRecord<any, any>> = T extends {
  readonly [k in keyof T]: infer A
}
  ? A
  : never

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 */
export function has_<N extends string>(r: ReadonlyRecord<N, unknown>, k: string): k is N {
  return _hasOwnProperty.call(r, k)
}

/**
 * Test whether a given record contains the given key
 *
 * @category Guards
 * @since 1.0.0
 */
export function has<N extends string>(k: string, r: ReadonlyRecord<N, unknown>): k is N
export function has<N extends string>(this: any, k: string, r?: ReadonlyRecord<N, unknown>): k is N {
  return _hasOwnProperty.call(r === undefined ? this : r, k)
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 */
export function isSubrecord_<A>(E: Eq<A>): (me: ReadonlyRecord<string, A>, that: ReadonlyRecord<string, A>) => boolean {
  return (me, that) => {
    for (const k in me) {
      if (!_hasOwnProperty.call(that, k) || !E.equals(me[k])(that[k])) {
        return false
      }
    }
    return true
  }
}

/**
 * Test whether one record contains all of the keys and values contained in another record
 *
 * @category Guards
 * @since 1.0.0
 */
export function isSubrecord<A>(
  E: Eq<A>
): (that: ReadonlyRecord<string, A>) => (me: ReadonlyRecord<string, A>) => boolean {
  return (that) => (me) => isSubrecord_(E)(me, that)
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function every_<N extends string, A>(r: ReadonlyRecord<N, A>, predicate: Predicate<A>): boolean {
  for (const k in r) {
    if (!predicate(r[k])) {
      return false
    }
  }
  return true
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function every<A>(predicate: Predicate<A>): <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (r) => every_(r, predicate)
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function some_<N extends string, A>(r: ReadonlyRecord<N, A>, predicate: (a: A) => boolean): boolean {
  for (const k in r) {
    if (predicate(r[k])) {
      return true
    }
  }
  return false
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function some<A>(predicate: (a: A) => boolean): <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (r) => some_(r, predicate)
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function elem_<A>(E: Eq<A>): <N extends string>(r: Readonly<Record<N, A>>, a: A) => boolean {
  return (r, a) => {
    for (const k in r) {
      if (E.equals(r[k])(a)) {
        return true
      }
    }
    return false
  }
}

/**
 * @category Guards
 * @since 1.0.0
 */
export function elem<A>(E: Eq<A>): (a: A) => <N extends string>(r: Readonly<Record<N, A>>) => boolean {
  return (a) => (r) => elem_(E)(r, a)
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const empty: ReadonlyRecord<string, never> = {}

export function fromRecord<N extends string, A>(r: Record<N, A>): ReadonlyRecord<N, A> {
  return Object.assign({}, r)
}

export function toRecord<N extends string, A>(r: ReadonlyRecord<N, A>): Record<N, A> {
  return Object.assign({}, r)
}

export function singleton<N extends string, A>(k: N, a: A): ReadonlyRecord<N, A> {
  return { [k]: a } as any
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * @category Destructors
 * @since 1.0.0
 */
export function toArray<N extends string, A>(r: ReadonlyRecord<N, A>): ReadonlyArray<readonly [N, A]> {
  return collect_(r, (k, a) => [k, a])
}

/**
 * Unfolds a record into a list of key/value pairs
 *
 * @category Destructors
 * @since 1.0.0
 */
export function toUnfoldable<F extends HKT.URIS, C = HKT.Auto>(U: P.Unfoldable<F, C>) {
  return <N extends string, A>(
    r: ReadonlyRecord<N, A>
  ): HKT.Kind<
    F,
    C,
    HKT.Initial<C, 'N'>,
    HKT.Initial<C, 'K'>,
    HKT.Initial<C, 'Q'>,
    HKT.Initial<C, 'W'>,
    HKT.Initial<C, 'X'>,
    HKT.Initial<C, 'I'>,
    HKT.Initial<C, 'S'>,
    HKT.Initial<C, 'R'>,
    HKT.Initial<C, 'E'>,
    readonly [N, A]
  > => {
    const arr = toArray(r)
    const len = arr.length
    return U.unfold(0, (b) => (b < len ? O.Some([arr[b], b + 1]) : O.None()))
  }
}

/*
 * -------------------------------------------
 * Compactable
 * -------------------------------------------
 */

/**
 */
export function separate<N extends string, A, B>(
  fa: ReadonlyRecord<N, E.Either<A, B>>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>] {
  const mut_left: Record<string, A>  = {} as any
  const mut_right: Record<string, B> = {} as any
  const keys                         = Object.keys(fa)
  for (const key of keys) {
    const e = fa[key]
    switch (e.tag_) {
      case 'Left':
        mut_left[key] = e.left
        break
      case 'Right':
        mut_right[key] = e.right
        break
    }
  }
  return [mut_left, mut_right]
}

/**
 */
export function compact<N extends string, A>(fa: ReadonlyRecord<N, O.Option<A>>): ReadonlyRecord<string, A> {
  const mut_r = {} as Record<string, any>
  const ks    = keys(fa)
  for (const key of ks) {
    const optionA = fa[key]
    if (O.isSome(optionA)) {
      mut_r[key] = optionA.value
    }
  }
  return mut_r
}

/*
 * -------------------------------------------
 * Eq Record
 * -------------------------------------------
 */

export function getEq<N extends string, A>(E: Eq<A>): Eq<ReadonlyRecord<N, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>>
export function getEq<A>(E: Eq<A>): Eq<ReadonlyRecord<string, A>> {
  const isSubrecordE = isSubrecord(E)
  return makeEq((x, y) => isSubrecordE(x)(y) && isSubrecordE(y)(x))
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 */
export function ifilter_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: RefinementWithIndex<N, A, B>
): ReadonlyRecord<string, B>
export function ifilter_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: PredicateWithIndex<N, A>
): ReadonlyRecord<string, A>
export function ifilter_<A>(
  fa: ReadonlyRecord<string, A>,
  predicate: PredicateWithIndex<string, A>
): ReadonlyRecord<string, A> {
  const mut_out = {} as Record<string, A>
  let changed   = false
  for (const key in fa) {
    if (_hasOwnProperty.call(fa, key)) {
      const a = fa[key]
      if (predicate(key, a)) {
        mut_out[key] = a
      } else {
        changed = true
      }
    }
  }
  return changed ? mut_out : fa
}

/**
 */
export function ifilter<N extends string, A, B extends A>(
  refinement: RefinementWithIndex<N, A, B>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, B>
export function ifilter<N extends string, A>(
  predicate: PredicateWithIndex<N, A>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>
export function ifilter<A>(
  predicate: PredicateWithIndex<string, A>
): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (fa) => ifilter_(fa, predicate)
}

/**
 */
export function filter_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: Refinement<A, B>
): ReadonlyRecord<string, B>
export function filter_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: Predicate<A>
): ReadonlyRecord<string, A>
export function filter_<A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>): ReadonlyRecord<string, A> {
  return ifilter_(fa, (_, a) => predicate(a))
}

/**
 */
export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): <N extends string>(fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, B>
export function filter<A>(
  predicate: Predicate<A>
): <N extends string>(fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, A>
export function filter<A>(predicate: Predicate<A>): (fa: ReadonlyRecord<string, A>) => ReadonlyRecord<string, A> {
  return (fa) => filter_(fa, predicate)
}

/**
 */
export function ifilterMap_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  f: (k: N, a: A) => O.Option<B>
): ReadonlyRecord<string, B> {
  const mut_r = {} as Record<string, B>
  const ks    = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key     = ks[i]
    const optionB = f(key, fa[key])
    if (optionB._tag === 'Some') {
      mut_r[key] = optionB.value
    }
  }
  return mut_r
}

/**
 */
export function ifilterMap<N extends string, A, B>(
  f: (k: N, a: A) => O.Option<B>
): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<string, B> {
  return (fa) => ifilterMap_(fa, f)
}

/**
 */
export function filterMap_<N extends string, A, B>(
  fa: ReadonlyRecord<N, A>,
  f: (a: A) => O.Option<B>
): ReadonlyRecord<string, B> {
  return ifilterMap_(fa, (_, a) => f(a))
}

/**
 */
export function filterMap<A, B>(
  f: (a: A) => O.Option<B>
): <N extends string>(fa: Readonly<Record<N, A>>) => ReadonlyRecord<string, B> {
  return (fa) => filterMap_(fa, f)
}

/**
 */
export function ipartition_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: RefinementWithIndex<N, A, B>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function ipartition_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: PredicateWithIndex<N, A>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function ipartition_<A>(fa: ReadonlyRecord<string, A>, predicate: PredicateWithIndex<string, A>) {
  const mut_left  = {} as Record<string, A>
  const mut_right = {} as Record<string, A>
  const ks        = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    const a   = fa[key]
    if (predicate(key, a)) {
      mut_right[key] = a
    } else {
      mut_left[key] = a
    }
  }
  return tuple(mut_left, mut_right)
}

/**
 */
export function ipartition<N extends string, A, B extends A>(
  refinement: RefinementWithIndex<N, A, B>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function ipartition<N extends string, A>(
  predicate: PredicateWithIndex<N, A>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function ipartition<A>(
  predicate: PredicateWithIndex<string, A>
): (fa: ReadonlyRecord<string, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>] {
  return (fa) => ipartition_(fa, predicate)
}

/**
 */
export function partition_<N extends string, A, B extends A>(
  fa: ReadonlyRecord<N, A>,
  refinement: Refinement<A, B>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function partition_<N extends string, A>(
  fa: ReadonlyRecord<N, A>,
  predicate: Predicate<A>
): readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function partition_<A>(fa: ReadonlyRecord<string, A>, predicate: Predicate<A>) {
  return ipartition_(fa, (_, a) => predicate(a))
}

/**
 */
export function partition<A, B extends A>(
  refinement: Refinement<A, B>
): <N extends string>(fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, B>]
export function partition<A>(
  predicate: Predicate<A>
): <N extends string>(fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>]
export function partition<A>(
  predicate: Predicate<A>
): (fa: ReadonlyRecord<string, A>) => readonly [ReadonlyRecord<string, A>, ReadonlyRecord<string, A>] {
  return (fa) => partition_(fa, predicate)
}

/**
 */
export function ipartitionMap_<N extends string, A, B, C>(
  fa: ReadonlyRecord<N, A>,
  f: (k: N, a: A) => E.Either<B, C>
): readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  const mut_left  = {} as Record<string, B>
  const mut_right = {} as Record<string, C>
  const ks        = keys(fa)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    const e   = f(key, fa[key])
    switch (e._tag) {
      case 'Left':
        mut_left[key] = e.left
        break
      case 'Right':
        mut_right[key] = e.right
        break
    }
  }
  return [mut_left, mut_right]
}

/**
 */
export function ipartitionMap<N extends string, A, B, C>(
  f: (k: N, a: A) => E.Either<B, C>
): (fa: ReadonlyRecord<N, A>) => readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  return (fa) => ipartitionMap_(fa, f)
}

/**
 */
export function partitionMap_<N extends string, A, B, C>(
  fa: ReadonlyRecord<N, A>,
  f: (a: A) => E.Either<B, C>
): readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  return ipartitionMap_(fa, (_, a) => f(a))
}

/**
 */
export function partitionMap<A, B, C>(
  f: (a: A) => E.Either<B, C>
): <N extends string>(fa: Readonly<Record<N, A>>) => readonly [ReadonlyRecord<string, B>, ReadonlyRecord<string, C>] {
  return (fa) => partitionMap_(fa, f)
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

/**
 */
export function ifoldl_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (b: B, k: N, a: A) => B): B {
  let out   = b
  const ks  = keys(fa)
  const len = ks.length
  for (let i = 0; i < len; i++) {
    const k = ks[i]
    out     = f(out, k, fa[k])
  }
  return out
}

/**
 */
export function ifoldl<N extends string, A, B>(b: B, f: (b: B, k: N, a: A) => B): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => ifoldl_(fa, b, f)
}

/**
 */
export function foldl_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (b: B, a: A) => B): B {
  return ifoldl_(fa, b, (b, _, a) => f(b, a))
}

/**
 */
export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <N extends string>(fa: Readonly<Record<N, A>>) => B {
  return (fa) => foldl_(fa, b, f)
}

/**
 */
export function ifoldr_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (a: A, k: N, b: B) => B): B {
  let out   = b
  const ks  = keys(fa)
  const len = ks.length
  for (let i = len - 1; i >= 0; i--) {
    const k = ks[i]
    out     = f(fa[k], k, out)
  }
  return out
}

/**
 */
export function ifoldr<N extends string, A, B>(b: B, f: (a: A, k: N, b: B) => B): (fa: ReadonlyRecord<N, A>) => B {
  return (fa) => ifoldr_(fa, b, f)
}

/**
 */
export function foldr_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, b: B, f: (a: A, b: B) => B): B {
  return ifoldr_(fa, b, (a, _, b) => f(a, b))
}

/**
 */
export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <N extends string>(fa: Readonly<Record<N, A>>) => B {
  return (fa) => foldr_(fa, b, f)
}

export function ifoldMap_<M>(
  M: P.Monoid<M>
): <N extends string, A>(fa: Readonly<Record<N, A>>, f: (k: N, a: A) => M) => M {
  return (fa, f) => {
    let out   = M.nat
    const ks  = keys(fa)
    const len = ks.length
    for (let i = 0; i < len; i++) {
      const k = ks[i]
      out     = M.combine_(out, f(k, fa[k]))
    }
    return out
  }
}

export function ifoldMap<M>(
  M: P.Monoid<M>
): <N extends string, A>(f: (k: N, a: A) => M) => (fa: Readonly<Record<N, A>>) => M {
  return (f) => (fa) => ifoldMap_(M)(fa, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <N extends string, A>(fa: Readonly<Record<N, A>>, f: (a: A) => M) => M {
  return (fa, f) => ifoldMap_(M)(fa, (_, a) => f(a))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <N extends string>(fa: Readonly<Record<N, A>>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function fromFoldableMap<B, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<B>, F: P.Foldable<F, C>) {
  return <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, A, N extends string>(
    fa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, A>,
    f: (a: A) => readonly [N, B]
  ): ReadonlyRecord<N, B> =>
    pipe(
      fa,
      F.foldl<A, Record<N, B>>({} as any, (mut_r, a) => {
        const [k, b] = f(a)
        mut_r[k]     = _hasOwnProperty.call(mut_r, k) ? S.combine_(mut_r[k], b) : b
        return mut_r
      })
    )
}

export function fromFoldable<A, F extends HKT.URIS, C = HKT.Auto>(S: P.Semigroup<A>, F: P.Foldable<F, C>) {
  const fromFoldableMapS = fromFoldableMap(S, F)
  return <NF extends string, KF, QF, WF, XF, IF, SF, RF, EF, N extends string>(
    fa: HKT.Kind<F, C, NF, KF, QF, WF, XF, IF, SF, RF, EF, readonly [N, A]>
  ): ReadonlyRecord<N, A> => fromFoldableMapS(fa, identity)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, f: (k: N, a: A) => B): ReadonlyRecord<N, B> {
  const mut_out = {} as Record<N, B>
  const keys    = Object.keys(fa)
  for (let i = 0; i < keys.length; i++) {
    const k    = keys[i] as keyof typeof fa
    mut_out[k] = f(k, fa[k])
  }
  return mut_out
}

/**
 * Map a record passing the keys to the iterating function
 *
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export function imap<N extends string, A, B>(f: (k: N, a: A) => B): (fa: ReadonlyRecord<N, A>) => ReadonlyRecord<N, B> {
  return (fa) => imap_(fa, f)
}

/**
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<N extends string, A, B>(fa: ReadonlyRecord<N, A>, f: (a: A) => B): ReadonlyRecord<N, B> {
  return imap_(fa, (_, a) => f(a))
}

/**
 * Map a record passing the values to the iterating function
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<A, B>(f: (a: A) => B): <N extends string>(fa: Readonly<Record<N, A>>) => Readonly<Record<N, B>> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

export function getMonoid<N extends string, A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<N, A>>
export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<string, A>>
export function getMonoid<A>(S: P.Semigroup<A>): P.Monoid<ReadonlyRecord<string, A>> {
  return makeMonoid<ReadonlyRecord<string, A>>((x, y) => {
    if (x === empty) {
      return y
    }
    if (y === empty) {
      return x
    }
    const keys = Object.keys(y)
    const len  = keys.length
    if (len === 0) {
      return x
    }
    const mut_r = Object.assign({}, x) as Record<string, A>
    for (let i = 0; i < len; i++) {
      const k  = keys[i]
      mut_r[k] = _hasOwnProperty.call(x, k) ? S.combine_(x[k], y[k]) : y[k]
    }
    return mut_r
  }, empty)
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

export function getShow<A>(S: Show<A>): Show<ReadonlyRecord<string, A>> {
  return {
    show: (a) => {
      const elements = collect_(a, (k, a) => `${JSON.stringify(k)}: ${S.show(a)}`).join(', ')
      return elements === '' ? '{}' : `{ ${elements} }`
    }
  }
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

/**
 */
export const itraverse_ = P.implementTraverseWithIndex_<[HKT.URI<RecordURI>]>()((_) => (G) => {
  return (ta, f) => {
    type _ = typeof _

    const ks = keys(ta)
    if (ks.length === 0) {
      return G.pure(empty)
    }
    let mut_gr: HKT.HKT<_['G'], Record<_['N'], _['B']>> = G.pure({}) as any
    for (let i = 0; i < ks.length; i++) {
      const key = ks[i]
      mut_gr    = pipe(
        mut_gr,
        G.map((mut_r) => (b: _['B']) => {
          mut_r[key] = b
          return mut_r
        }),
        G.ap(f(key, ta[key]))
      )
    }
    return mut_gr
  }
})

/**
 */
export const itraverse: P.TraverseWithIndexFn<[HKT.URI<RecordURI>]> = (G) => (f) => (ta) => itraverse_(G)(ta, f)

/**
 */
export const traverse_: P.TraverseFn_<[HKT.URI<RecordURI>]> = (G) => (ta, f) => itraverse_(G)(ta, (_, a) => f(a))

/**
 */
export const traverse: P.TraverseFn<[HKT.URI<RecordURI>]> = (G) => (f) => (ta) => traverse_(G)(ta, f)

/**
 */
export const sequence: P.SequenceFn<[HKT.URI<RecordURI>]> = (G) => (ta) => itraverse_(G)(ta, (_, a) => a)

/*
 * -------------------------------------------
 * Witherable
 * -------------------------------------------
 */

/**
 */
export const icompactA_: P.WitherWithIndexFn_<[HKT.URI<RecordURI>]> = (G) => {
  const traverseG = itraverse_(G)
  return (wa, f) => pipe(traverseG(wa, f), G.map(compact))
}

/**
 */
export const icompactA: P.WitherWithIndexFn<[HKT.URI<RecordURI>]> = (G) => (f) => (wa) => icompactA_(G)(wa, f)

/**
 */
export const compactA_: P.WitherFn_<[HKT.URI<RecordURI>]> = (G) => (wa, f) => icompactA_(G)(wa, (_, a) => f(a))

/**
 */
export const compactA: P.WitherFn<[HKT.URI<RecordURI>]> = (G) => (f) => (wa) => compactA_(G)(wa, f)

/**
 */
export const iseparateA_: P.WiltWithIndexFn_<[HKT.URI<RecordURI>]> = P.implementWiltWithIndex_<[HKT.URI<RecordURI>]>()(
  () => (G) => {
    const traverseG = itraverse_(G)
    return (wa, f) => pipe(traverseG(wa, f), G.map(separate))
  }
)

/**
 */
export const iseparateA: P.WiltWithIndexFn<[HKT.URI<RecordURI>]> = (G) => (f) => (wa) => iseparateA_(G)(wa, f)

/**
 */
export const separateA_: P.WiltFn_<[HKT.URI<RecordURI>]> = (G) => (wa, f) => iseparateA_(G)(wa, (_, a) => f(a))

/**
 */
export const separateA: P.WiltFn<[HKT.URI<RecordURI>]> = (G) => (f) => (wa) => separateA_(G)(wa, f)

/*
 * -------------------------------------------
 * Utils
 * -------------------------------------------
 */

export function keys<N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> {
  return Object.keys(r) as any
}

export function size(r: ReadonlyRecord<string, unknown>): number {
  return Object.keys(r).length
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function collect_<N extends string, A, B>(r: ReadonlyRecord<N, A>, f: (k: N, a: A) => B): ReadonlyArray<B> {
  const out: Array<B> = []
  const ks            = keys(r)
  for (let i = 0; i < ks.length; i++) {
    const key = ks[i]
    out.push(f(key, r[key]))
  }
  return out
}

export function collect<N extends string, A, B>(f: (k: N, a: A) => B): (r: ReadonlyRecord<N, A>) => ReadonlyArray<B> {
  return (r) => collect_(r, f)
}

export function insertAt_<N extends string, K extends string, A>(
  r: ReadonlyRecord<N, A>,
  k: K,
  a: A
): ReadonlyRecord<N | K, A> {
  if (r[k as any] === a) {
    return r as any
  }
  const mut_out = Object.assign({}, r) as Record<N | K, A>
  mut_out[k]    = a
  return mut_out
}

export function insertAt<K extends string, A>(
  k: K,
  a: A
): <N extends string>(r: ReadonlyRecord<N, A>) => ReadonlyRecord<K | N, A> {
  return (r) => insertAt_(r, k, a)
}

export function deleteAt_<N extends string, A, K extends N>(
  r: ReadonlyRecord<N, A>,
  k: K
): ReadonlyRecord<Exclude<N, K>, A> {
  if (!_hasOwnProperty.call(r, k)) {
    return r
  }
  const mut_out = Object.assign({}, r) as Record<N, A>
  delete mut_out[k as any]
  return mut_out as any
}

export function deleteAt<N extends string, K extends N>(
  k: K
): <A>(r: Readonly<Record<N, A>>) => Readonly<Record<Exclude<N, K>, A>> {
  return (r) => deleteAt_(r, k)
}

export function updateAt_<N extends string, A>(r: ReadonlyRecord<N, A>, k: N, a: A): O.Option<ReadonlyRecord<N, A>> {
  if (!_hasOwnProperty.call(r, k)) {
    return O.None()
  }
  if (r[k] === a) {
    return O.Some(r)
  }
  const mut_out = Object.assign({}, r) as Record<N, A>
  mut_out[k]    = a
  return O.Some(mut_out)
}

export function updateAt<N extends string, A>(k: N, a: A): (r: ReadonlyRecord<N, A>) => O.Option<ReadonlyRecord<N, A>> {
  return (r) => updateAt_(r, k, a)
}

export function modifyAt_<N extends string, A>(
  r: ReadonlyRecord<N, A>,
  k: N,
  f: (a: A) => A
): O.Option<ReadonlyRecord<N, A>> {
  if (!_hasOwnProperty.call(r, k)) {
    return O.None()
  }
  const mut_out = Object.assign({}, r) as Record<N, A>
  mut_out[k]    = f(r[k])
  return O.Some(mut_out)
}

export function modifyAt<N extends string, A>(
  k: N,
  f: (a: A) => A
): (r: ReadonlyRecord<N, A>) => O.Option<ReadonlyRecord<N, A>> {
  return (r) => modifyAt_(r, k, f)
}

export function lookup_<A>(r: ReadonlyRecord<string, A>, k: string): O.Option<A> {
  return _hasOwnProperty.call(r, k) ? O.Some(r[k]) : O.None()
}

export function lookup(k: string): <A>(r: ReadonlyRecord<string, A>) => O.Option<A> {
  return (r) => lookup_(r, k)
}

export function pop_<N extends string, K extends N, A>(
  r: ReadonlyRecord<N, A>,
  k: K
): O.Option<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> {
  const deleteAtk = deleteAt(k)
  const oa        = lookup(k)(r)
  return O.isNone(oa) ? O.None() : O.Some([oa.value, deleteAtk(r)])
}

export function pop<N extends string, K extends N>(
  k: K
): <A>(r: ReadonlyRecord<N, A>) => O.Option<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> {
  return (r) => pop_(r, k)
}

export { RecordURI } from './Modules'
