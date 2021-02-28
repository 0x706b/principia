import type { MReaderURI } from './Modules'
import type * as P from '@principia/base/typeclass'

import { flow, identity, pipe, tuple } from '@principia/base/Function'
import * as HKT from '@principia/base/HKT'
import * as Mu from '@principia/io/Multi'

export type V<C> = HKT.CleanParam<C, 'R'> & HKT.V<'R', '-'>

export interface MReaderT<F extends HKT.URIS, C = HKT.Auto> extends P.MonadEnv<[HKT.URI<MReaderURI>, ...F], V<C>> {}

export function getMReaderT<F extends HKT.URIS, C = HKT.Auto>(M: P.Monad<F, C>): MReaderT<F, C>
export function getMReaderT<F>(M: P.Monad<HKT.UHKT<F>>): MReaderT<HKT.UHKT<F>> {
  const map_: MReaderT<HKT.UHKT<F>>['map_'] = (fa, f) => Mu.map_(fa, M.map(f))

  const crossWith_: MReaderT<HKT.UHKT<F>>['crossWith_'] = (rfa, rfb, f) =>
    Mu.bind_(rfa, (fa) => Mu.map_(rfb, (fb) => M.crossWith_(fa, fb, f)))

  const bind_: MReaderT<HKT.UHKT<F>>['bind_'] = (rma, f) =>
    Mu.asks((r) => pipe(rma, Mu.giveAll(r), Mu.runResult, M.bind(flow(f, Mu.giveAll(r), Mu.runResult))))
  return HKT.instance<MReaderT<HKT.UHKT<F>>>({
    map_,
    map: (f) => (fa) => map_(fa, f),
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: (fb) => (fa) => crossWith_(fa, fb, tuple),
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    ap: (fa) => (fab) => crossWith_(fab, fa, (f, a) => f(a)),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: (mma) => bind_(mma, identity),
    giveAll_: Mu.giveAll_,
    giveAll: Mu.giveAll,
    asks: (f) => Mu.asks(flow(f, M.pure)),
    pure: flow(M.pure, Mu.pure),
    unit: () => Mu.pure(M.pure(undefined))
  })
}
