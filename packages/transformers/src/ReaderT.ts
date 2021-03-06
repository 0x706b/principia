import type * as HKT from '@principia/base/HKT'
import type { ReaderURI } from '@principia/base/Reader'

import * as R from '@principia/base/Reader'
import * as P from '@principia/base/typeclass'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface ReaderT<M extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<ReaderURI>, ...M], V<C>> {}

export function getReaderT<M extends HKT.URIS, C = HKT.Auto>(M: P.Monad<M, C>): ReaderT<M, C>
export function getReaderT<M>(M: P.Monad<HKT.UHKT<M>>): ReaderT<HKT.UHKT<M>> {
  const bind_: ReaderT<HKT.UHKT<M>>['bind_'] = (ma, f) => (r) => M.bind_(ma(r), (a) => f(a)(r))

  return P.MonadEnv({
    ...P.getApplicativeComposition(R.MonadEnv, M),
    bind_,
    giveAll_: R.giveAll_,
    asks: <R, A>(f: (_: R) => A) => (r: R) => M.pure(f(r)),
    pure: <A>(a: A) => () => M.pure(a)
  })
}
