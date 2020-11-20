import type { Refinement } from "@principia/core/Function";

import type { AnyEnv, Config, InterpretedHKT, InterpreterURIS } from "../HKT";
import type { RefineConfig } from "./refinement";

export const PipeableURI = "model/algebra/pipeable";

export type PipeableURI = typeof PipeableURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    [PipeableURI]: PipeableAlgebra<IURI, Env>;
  }
}

export interface PipeableAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly refine: <E, A, B extends A>(
    refinement: Refinement<A, B>,
    name: string,
    config?: Omit<Config<Env, unknown, unknown, E, B, RefineConfig<E, A, B>>, "name">
  ) => <S, R>(
    a: InterpretedHKT<F, Env, S, R, E, A>
  ) => InterpretedHKT<F, Env, unknown, unknown, E, B>;
}
