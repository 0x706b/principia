import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import type { ArbURI } from "./HKT";
import { applyArbitraryConfig } from "./HKT";

export const RefinementArbitrary = implementInterpreter<ArbURI, Alg.RefinementURI>()((_) => ({
   refine: (a, refinement, name, config) => (env) =>
      pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(refinement), env, {})),
   constrain: (a, predicate, name, config) => (env) =>
      pipe(a(env), (arb) => applyArbitraryConfig(config?.config)(arb.filter(predicate), env, {}))
}));
