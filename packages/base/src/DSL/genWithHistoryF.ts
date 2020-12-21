import type * as HKT from "../HKT";
import type { Monad } from "../Monad";

import * as L from "../data/List";
import { PrematureGeneratorExit } from "../util/GlobalExceptions";

export class GenLazyHKT<T, A> {
  constructor(readonly T: () => T) {}

  *[Symbol.iterator](): Generator<GenLazyHKT<T, A>, A, any> {
    return yield this;
  }
}

const lazyAdapter = (_: () => any) => {
  return new GenLazyHKT(_);
};

export function genWithHistoryF<
  F extends HKT.URIS,
  TC,
  Adapter = {
    <N extends string, K, Q, W, X, I, S, R, E, A>(
      _: () => HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>
    ): GenLazyHKT<HKT.Kind<F, TC, N, K, Q, W, X, I, S, R, E, A>, A>;
  }
>(
  M: Monad<F>,
  config?: { adapter?: Adapter }
): <
  T extends GenLazyHKT<HKT.Kind<F, TC, any, any, any, any, any, any, any, any, any, any>, any>,
  A0
>(
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
      <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>;
    };
  }
): <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
  f: (i: { <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A> }) => Generator<Eff, AEff, any>
) => HKT.HKT<F, AEff> {
  return <Eff extends GenLazyHKT<HKT.HKT<F, any>, any>, AEff>(
    f: (i: {
      <A>(_: () => HKT.HKT<F, A>): GenLazyHKT<HKT.HKT<F, A>, A>;
    }) => Generator<Eff, AEff, any>
  ): HKT.HKT<F, AEff> => {
    return F.flatMap_(F.unit(), () => {
      function run(replayStack: L.List<any>): HKT.HKT<F, AEff> {
        const iterator = f((config?.adapter ? config.adapter : lazyAdapter) as any);
        let state = iterator.next();
        L.forEach_(replayStack, (a) => {
          if (state.done) {
            throw new PrematureGeneratorExit("GenHKT.genWithHistoryF");
          }
          state = iterator.next(a);
        });
        if (state.done) {
          return F.pure(state.value);
        }
        return F.flatMap_(state.value.T(), (val) => {
          return run(L.append_(replayStack, val));
        });
      }
      return run(L.empty());
    });
  };
}
