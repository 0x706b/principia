import type { Managed } from '../core'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { _E, _R, EnforceNonEmptyRecord } from '@principia/base/util/types'

import { identity, tuple } from '@principia/base/Function'
import * as R from '@principia/base/Record'

import { parallel, sequential } from '../../ExecutionStrategy'
import * as I from '../_internal/io'
import { map_, mapM_ } from '../core'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/*
 * -------------------------------------------
 * Parallel Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function zipWithPar_<R, E, A, R1, E1, B, C>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): Managed<R & R1, E | E1, C> {
  return mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
    const innerMap = I.gives_(makeManagedReleaseMap(sequential).io, (r: R & R1) => tuple(r, parallelReleaseMap))

    return I.flatMap_(I.product_(innerMap, innerMap), ([[_, l], [__, r]]) =>
      I.map2Par_(
        I.gives_(fa.io, (_: R & R1) => tuple(_, l)),
        I.gives_(fb.io, (_: R & R1) => tuple(_, r)),
        ([_, a], [__, a2]) => f(a, a2)
      )
    )
  })
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function zipWithPar<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => zipWithPar_(fa, fb, f)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Managed<R1, E1, (a: A) => B>,
  fa: Managed<R, E, A>
): Managed<R & R1, E | E1, B> {
  return zipWithPar_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Managed<R, E, A>
): <R1, E1, B>(fab: Managed<R1, E1, (a: A) => B>) => Managed<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function apFirstPar_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, A> {
  return zipWithPar_(fa, fb, (a, _) => a)
}

export function apFirstPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => apFirstPar_(fa, fb)
}

export function apSecondPar_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, B> {
  return zipWithPar_(fa, fb, (_, b) => b)
}

export function apSecondPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => apSecondPar_(fa, fb)
}

export function structPar<MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    foreachPar_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const r = {}
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i]
        r[k]         = v
      }
      return r
    }
  ) as any
}

export function structParN(n: number) {
  return <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
    mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
  ): Managed<
    _R<MR[keyof MR]>,
    _E<MR[keyof MR]>,
    {
      [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
    }
  > =>
    map_(
      foreachParN_(n)(
        R.collect_(mr, (k, v) => [k, v] as const),
        ([k, v]) => map_(v, (a) => [k, a] as const)
      ),
      (kvs) => {
        const r = {}
        for (let i = 0; i < kvs.length; i++) {
          const [k, v] = kvs[i]
          r[k]         = v
        }
        return r
      }
    ) as any
}

export function tupleNPar<T extends ReadonlyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<
  _R<T[number]>,
  _E<T[number]>,
  {
    [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return foreachPar_(t, identity) as any
}

export function tupleNParN(n: number) {
  return <T extends ReadonlyArray<Managed<any, any, any>>>(
    ...t: T & {
      0: Managed<any, any, any>
    }
  ): Managed<
    _R<T[number]>,
    _E<T[number]>,
    {
      [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
    }
  > => foreachParN_(n)(t, identity) as any
}
