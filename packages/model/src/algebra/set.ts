import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Ord } from '@principia/base/Ord'

export const SetURI = 'model/algebra/set'

export type SetURI = typeof SetURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [SetURI]: SetAlgebra<IURI, Env>
  }
}

export interface SetConfig<E, A> {}

export interface SetAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly set: <E, A>(
    a: InterpretedKind<F, Env, E, A>,
    ord: Ord<A>,
    config?: Config<Env, ReadonlyArray<E>, ReadonlySet<A>, SetConfig<E, A>>
  ) => InterpretedKind<F, Env, ReadonlyArray<E>, ReadonlySet<A>>
}
