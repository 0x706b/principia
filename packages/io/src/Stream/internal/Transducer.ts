// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].

import type { IO } from '../../IO'
import type { Managed } from '../../Managed'
import type { Option } from '@principia/base/Option'

export class Transducer<R, E, I, O> {
  constructor(readonly push: Managed<R, never, (c: Option<ReadonlyArray<I>>) => IO<R, E, ReadonlyArray<O>>>) {}
}
