import { chainF } from "@principia/prelude/Chain";
import type * as HKT from "@principia/prelude/HKT";
import type { Monad } from "@principia/prelude/Monad";
import { pureF } from "@principia/prelude/Pure";

import { pipe } from "../Function";
import { PrematureGeneratorExit } from "../GlobalExceptions";
import * as L from "../List/_core";

export class GenHKT<T, A> {
  constructor(readonly T: T) {}

  *[Symbol.iterator](): Generator<GenHKT<T, A>, A, any> {
    return yield this;
  }
}

const adapter = (_: any) => {
  return new GenHKT(_);
};

export function genWithHistoryF<
  F extends HKT.URIS,
  TC,
  Adapter = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(
      _: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
    ): GenHKT<HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>, A>;
  }
>(
  M: Monad<F>,
  config?: { adapter?: Adapter }
): <T extends GenHKT<HKT.Kind<F, TC, any, any, any, any, any, any, any, any, any, any>, any>, A0>(
  f: (i: Adapter) => Generator<T, A0, any>
) => HKT.Kind<
  F,
  TC,
  HKT.Infer<F, TC, "N", T["T"]>,
  HKT.Infer<F, TC, "K", T["T"]>,
  HKT.Infer<F, TC, "Q", T["T"]>,
  HKT.Infer<F, TC, "W", T["T"]>,
  HKT.Infer<F, TC, "X", T["T"]>,
  HKT.Infer<F, TC, "I", T["T"]>,
  HKT.Infer<F, TC, "S", T["T"]>,
  HKT.Infer<F, TC, "R", T["T"]>,
  HKT.Infer<F, TC, "E", T["T"]>,
  A0
>;
export function genWithHistoryF<F>(
  F: Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>;
    };
  }
): <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  const chain = chainF(F);
  const pure = pureF(F);

  return <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
    f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
  ): HKT.HKT<F, AEff> => {
    return pipe(
      pure(undefined),
      chain(() => {
        function run(replayStack: L.List<any>): HKT.HKT<F, AEff> {
          const iterator = f((config?.adapter ? config.adapter : adapter) as any);
          let state = iterator.next();
          L.forEach_(replayStack, (a) => {
            if (state.done) {
              throw new PrematureGeneratorExit("GenHKT.genWithHistoryF");
            }
            state = iterator.next(a);
          });
          if (state.done) {
            return pure(state.value);
          }
          return chain((val) => {
            return run(L.append_(replayStack, val));
          })(state.value["T"]);
        }
        return run(L.empty());
      })
    );
  };
}

export function genF<
  F extends HKT.URIS,
  TC,
  Adapter = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(
      _: HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
    ): GenHKT<HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>, A>;
  }
>(
  M: Monad<F, TC>,
  config?: { adapter?: Adapter }
): <T extends GenHKT<HKT.Kind<F, TC, any, any, any, any, any, any, any, any, any, any>, any>, A0>(
  f: (i: Adapter) => Generator<T, A0, any>
) => HKT.Kind<
  F,
  TC,
  HKT.Infer<F, TC, "N", T["T"]>,
  HKT.Infer<F, TC, "K", T["T"]>,
  HKT.Infer<F, TC, "Q", T["T"]>,
  HKT.Infer<F, TC, "W", T["T"]>,
  HKT.Infer<F, TC, "X", T["T"]>,
  HKT.Infer<F, TC, "I", T["T"]>,
  HKT.Infer<F, TC, "S", T["T"]>,
  HKT.Infer<F, TC, "R", T["T"]>,
  HKT.Infer<F, TC, "E", T["T"]>,
  A0
>;
export function genF<F>(
  F: Monad<HKT.UHKT<F>>,
  config?: {
    adapter?: {
      <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A>;
    };
  }
): <Eff extends GenHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  const chain = chainF(F);
  const pure = pureF(F);

  return <T extends GenHKT<HKT.HKT<F, any>, any>, A>(
    f: (i: { <A>(_: HKT.HKT<F, A>): GenHKT<HKT.HKT<F, A>, A> }) => Generator<T, A, any>
  ): HKT.HKT<F, A> => {
    return pipe(
      pure({}),
      chain(() => {
        const iterator = f((config?.adapter ? config.adapter : adapter) as any);
        const state = iterator.next();

        function run(state: IteratorYieldResult<T> | IteratorReturnResult<A>): HKT.HKT<F, A> {
          if (state.done) {
            return pure(state.value);
          }
          return chain((val) => {
            const next = iterator.next(val);
            return run(next);
          })(state.value.T);
        }

        return run(state);
      })
    );
  };
}
