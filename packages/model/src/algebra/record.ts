import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { ReadonlyRecord } from '@principia/base/Record'

export const RecordURI = 'model/algebra/record'

export type RecordURI = typeof RecordURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RecordURI]: RecordAlgebra<IURI, Env>
  }
}

export interface RecordConfig<E, A> {}

export interface RecordAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly record: <E, A>(
    codomain: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, ReadonlyRecord<string, E>, ReadonlyRecord<string, A>, RecordConfig<E, A>>
  ) => InterpretedKind<F, Env, ReadonlyRecord<string, E>, ReadonlyRecord<string, A>>
}
