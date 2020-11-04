import * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type * as Alg from "../../algebra";
import { implementInterpreter } from "../../HKT";
import { applyEncoderConfig } from "./HKT";

export const NewtypeEncoder = implementInterpreter<E.URI, Alg.NewtypeURI>()((_) => ({
   newtypeIso: (iso, a, config) => (env) =>
      pipe(a(env), (encoder) =>
         applyEncoderConfig(config?.config)(E.contramap_(encoder, iso.reverseGet), env, encoder)
      ),
   newtypePrism: (prism, a, config) => (env) =>
      pipe(a(env), (encoder) =>
         applyEncoderConfig(config?.config)(E.contramap_(encoder, prism.reverseGet), env, encoder)
      )
}));