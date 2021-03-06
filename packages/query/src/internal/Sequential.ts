import type { DataSource } from '../DataSource'
import type { BlockedRequest } from './BlockedRequest'

import * as A from '@principia/base/Array'
import * as It from '@principia/base/Iterable'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'

import { eqDataSource } from '../DataSource'

export class Sequential<R> {
  readonly _tag = 'Sequential'

  constructor(private map: ReadonlyMap<DataSource<any, any>, ReadonlyArray<ReadonlyArray<BlockedRequest<any>>>>) {}

  ['++']<R1>(that: Sequential<R1>): Sequential<R & R1> {
    return new Sequential(
      It.foldl_(that.map.entries(), this.map, (map, [k, v]) =>
        Map.insertAt_(eqDataSource)(
          map,
          k,
          O.match_(Map.lookupAt_(eqDataSource)(map, k), () => A.empty(), A.concat(v))
        )
      )
    )
  }

  get isEmpty() {
    return this.map.size === 0
  }

  get keys(): Iterable<DataSource<R, any>> {
    return this.map.keys()
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, ReadonlyArray<ReadonlyArray<BlockedRequest<any>>>]> {
    return this.map.entries()
  }
}
