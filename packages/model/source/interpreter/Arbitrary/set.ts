import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Set";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { ArbURI } from "./HKT";
import { accessFastCheck, applyArbitraryConfig } from "./HKT";

export const SetArbitrary = implementInterpreter<ArbURI, Alg.SetURI>()((_) => ({
   set: (a, ord, config) => (env) =>
      pipe(a(env), (arb) =>
         applyArbitraryConfig(config?.config)(accessFastCheck(env).set(arb).map(S.fromArray(ord)), env, arb)
      )
}));