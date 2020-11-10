import { pipe } from "@principia/core/Function";
import * as S from "@principia/core/Show";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const RefinementShow = implementInterpreter<S.URI, Alg.RefinementURI>()((_) => ({
   refine: (a, refinement, name, config) => (env) =>
      pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(show, name), env, {})),
   constrain: (a, predicate, name, config) => (env) =>
      pipe(a(env), (show) => applyShowConfig(config?.config)(S.named_(show, name), env, {}))
}));
