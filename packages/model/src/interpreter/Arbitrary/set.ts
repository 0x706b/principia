import type * as Alg from '../../algebra'
import type { ArbURI } from './HKT'

import { pipe } from '@principia/base/data/Function'
import * as S from '@principia/base/data/Set'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const SetArbitrary = implementInterpreter<ArbURI, Alg.SetURI>()((_) => ({
  set: (a, ord, config) => (env) =>
    pipe(a(env), (arb) =>
      applyArbitraryConfig(config?.config)(accessFastCheck(env).set(arb).map(S.fromArray(ord)), env, arb)
    )
}))
