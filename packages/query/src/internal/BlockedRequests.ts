import type { Cache } from '../Cache'
import type { DataSource } from '../DataSource'
import type { DataSourceAspect } from '../DataSourceAspect'
import type { Described } from '../Described'
import type { BlockedRequest } from './BlockedRequest'
import type { Sequential } from './Sequential'
import type { List } from '@principia/base/List'

import * as A from '@principia/base/Array'
import * as Ev from '@principia/base/Eval'
import { pipe } from '@principia/base/Function'
import * as L from '@principia/base/List'
import * as Set from '@principia/base/Set'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'

import * as DS from '../DataSource'
import { eqRequest } from '../Request'
import * as Par from './Parallel'

export interface Empty {
  readonly _tag: 'Empty'
}

export const empty: BlockedRequests<unknown> = {
  _tag: 'Empty'
}

export interface Both<R> {
  readonly _tag: 'Both'
  readonly left: BlockedRequests<R>
  readonly right: BlockedRequests<R>
}

export function both<R, R1>(left: BlockedRequests<R>, right: BlockedRequests<R1>): BlockedRequests<R & R1> {
  return {
    _tag: 'Both',
    left,
    right
  }
}

export interface Single<R, A> {
  readonly _tag: 'Single'
  readonly dataSource: DataSource<R, A>
  readonly blockedRequest: BlockedRequest<A>
}

export function single<R, A>(dataSource: DataSource<R, A>, blockedRequest: BlockedRequest<A>): BlockedRequests<R> {
  return {
    _tag: 'Single',
    dataSource,
    blockedRequest
  }
}

export interface Then<R> {
  readonly _tag: 'Then'
  readonly left: BlockedRequests<R>
  readonly right: BlockedRequests<R>
}

export function then<R, R1>(left: BlockedRequests<R>, right: BlockedRequests<R1>): BlockedRequests<R & R1> {
  return {
    _tag: 'Then',
    left,
    right
  }
}

export type BlockedRequests<R> = Empty | Both<R> | Then<R> | Single<R, any>

export function mapDataSources<R, R1>(br: BlockedRequests<R>, f: DataSourceAspect<R1>): BlockedRequests<R & R1> {
  const go = (br: BlockedRequests<R>, f: DataSourceAspect<R1>): Ev.Eval<BlockedRequests<R & R1>> =>
    Ev.gen(function* (_) {
      switch (br._tag) {
        case 'Empty': {
          return empty
        }
        case 'Both': {
          return both(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Then': {
          return then(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Single': {
          return single(f.apply(br.dataSource), br.blockedRequest)
        }
      }
    })

  return Ev.evaluate(go(br, f))
}

export function gives_<R, R0>(br: BlockedRequests<R>, f: Described<(r0: R0) => R>): BlockedRequests<R0> {
  const go = (br: BlockedRequests<R>, f: Described<(r0: R0) => R>): Ev.Eval<BlockedRequests<R0>> =>
    Ev.gen(function* (_) {
      switch (br._tag) {
        case 'Empty': {
          return empty
        }
        case 'Both': {
          return both(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Then': {
          return then(yield* _(go(br.left, f)), yield* _(go(br.right, f)))
        }
        case 'Single': {
          return single(DS.gives_(br.dataSource, f), br.blockedRequest)
        }
      }
    })

  return Ev.evaluate(go(br, f))
}

export function run_<R>(br: BlockedRequests<R>, cache: Cache): I.IO<R, never, void> {
  return I.deferTotal(() =>
    pipe(
      flatten(br),
      I.foreachUnit((requestsByDataSource) =>
        I.foreachUnitPar_(requestsByDataSource.toIterable, ([dataSource, sequential]) =>
          I.gen(function* (_) {
            const completedRequests = yield* _(
              dataSource.runAll(
                A.map_(
                  sequential,
                  A.map((r) => r.request)
                )
              )
            )

            const blockedRequests = pipe(sequential, A.flatten)

            let leftovers = completedRequests.requests
            for (const r of A.map_(blockedRequests, (br) => br.request)) {
              leftovers = Set.remove_(eqRequest)(leftovers, r)
            }

            yield* _(I.foreachUnit_(blockedRequests, (br) => br.result.set(completedRequests.lookup(br.request))))

            yield* _(
              I.foreachUnit_(leftovers, (r) =>
                pipe(
                  Ref.make(completedRequests.lookup(r)),
                  I.bind((ref) => cache.put(r, ref))
                )
              )
            )
          })
        )
      )
    )
  )
}

function flatten<R>(blockedRequests: BlockedRequests<R>): List<Sequential<R>> {
  const go = <R>(brs: List<BlockedRequests<R>>, flattened: List<Sequential<R>>): Ev.Eval<List<Sequential<R>>> =>
    Ev.gen(function* (_) {
      const [parallel, sequential] = L.foldl_(
        brs,
        [Par.empty<R>(), L.empty<BlockedRequests<R>>()] as const,
        ([parallel, sequential], blockedRequest) => {
          const [par, seq] = step(blockedRequest)
          return [parallel['++'](par), L.concat_(sequential, seq)] as const
        }
      )

      const updated = merge(flattened, parallel)
      if (L.isEmpty(sequential)) {
        return L.reverse(updated)
      } else {
        return yield* _(go(sequential, updated))
      }
    })

  return Ev.evaluate(go(L.list(blockedRequests), L.empty()))
}

function step<R>(c: BlockedRequests<R>): readonly [Par.Parallel<R>, List<BlockedRequests<R>>] {
  const go = <R>(
    blockedRequests: BlockedRequests<R>,
    stack: List<BlockedRequests<R>>,
    parallel: Par.Parallel<R>,
    sequential: List<BlockedRequests<R>>
  ): Ev.Eval<readonly [Par.Parallel<R>, List<BlockedRequests<R>>]> =>
    Ev.gen(function* (_) {
      switch (blockedRequests._tag) {
        case 'Empty': {
          if (L.isEmpty(stack)) {
            return [parallel, sequential]
          } else {
            return yield* _(go(L.unsafeFirst(stack) as BlockedRequests<R>, L.tail(stack), parallel, sequential))
          }
        }
        case 'Then': {
          switch (blockedRequests.left._tag) {
            case 'Empty': {
              return yield* _(go(blockedRequests.left, stack, parallel, sequential))
            }
            case 'Then': {
              return yield* _(
                go(
                  then(blockedRequests.left.left, then(blockedRequests.left.right, blockedRequests.right)),
                  stack,
                  parallel,
                  sequential
                )
              )
            }
            case 'Both': {
              return yield* _(
                go(
                  both(
                    then(blockedRequests.left.left, blockedRequests.right),
                    then(blockedRequests.left.right, blockedRequests.right)
                  ),
                  stack,
                  parallel,
                  sequential
                )
              )
            }
            case 'Single': {
              return yield* _(go(blockedRequests.left, stack, parallel, L.append(blockedRequests.right)(sequential)))
            }
          }
        }
        // eslint-disable-next-line no-fallthrough
        case 'Both': {
          return yield* _(go(blockedRequests.left, L.append(blockedRequests.right)(stack), parallel, sequential))
        }
        case 'Single': {
          if (L.isEmpty(stack)) {
            return [parallel['++'](Par.from(blockedRequests.dataSource, blockedRequests.blockedRequest)), sequential]
          } else {
            return yield* _(
              go(
                L.unsafeFirst(stack) as BlockedRequests<R>,
                L.tail(stack),
                parallel['++'](Par.from(blockedRequests.dataSource, blockedRequests.blockedRequest)),
                sequential
              )
            )
          }
        }
      }
    })

  return Ev.evaluate(go(c, L.empty(), Par.empty(), L.empty()))
}

const getIterableSize = (it: Iterable<any> | undefined): number => (it ? Array.from(it).length : 0)

function merge<R>(sequential: List<Sequential<R>>, parallel: Par.Parallel<R>): List<Sequential<R>> {
  if (L.isEmpty(sequential)) {
    return L.list(parallel.sequential)
  } else if (parallel.isEmpty) {
    return sequential
  } else if (getIterableSize(L.unsafeFirst(sequential)?.keys) === 1 && getIterableSize(parallel.keys) === 1) {
    return pipe(
      L.unsafeFirst(sequential) as Sequential<R>,
      (s) => s['++'](parallel.sequential),
      (s) => L.append(s)(L.tail(sequential))
    )
  } else {
    return L.append(parallel.sequential)(sequential)
  }
}
