import type { Eq } from '@principia/base/Eq'

import { makeEq } from '@principia/base/Eq'

export abstract class Request<E, A> {
  readonly _E!: () => E
  readonly _A!: () => A
  abstract identifier: string
}

export const eqRequest: Eq<Request<any, any>> = makeEq((x, y) => x.identifier === y.identifier)
