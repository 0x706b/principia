import type * as Alg from "../../algebra";

import * as E from "@principia/base/data/Either";
import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";
import * as S from "@principia/base/data/Show";

import { implementInterpreter } from "../../HKT";
import { applyShowConfig } from "./HKT";

export const SumShow = implementInterpreter<S.URI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types,
      R.map((f) => f(env)),
      (shows) =>
        applyShowConfig(config?.config)(
          S.named_(S.sum_(tag, shows), config?.name),
          env,
          shows as any
        )
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyShowConfig(config?.config)(S.named_(E.getShow(l, r), config?.name), env, {
          left: l,
          right: r
        })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (show) =>
      applyShowConfig(config?.config)(S.named_(O.getShow(show), config?.name), env, show)
    )
}));
