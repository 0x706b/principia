import type * as E from '@principia/base/Either'

import '@principia/base/unsafe/Operators'

import * as Ev from '@principia/base/Eval'
import { none, some } from '@principia/base/Option'
import Bench from 'benchmark'

import * as As from '../src/Async'
import * as I from '../src/IO'
import * as Ref from '../src/IORef'
import * as M from '../src/Managed'
import * as P from '../src/Promise'
import * as Sc from '../src/Schedule'
import * as S from '../src/Stream'
import * as Sy from '../src/Sync'

I.effectAsync((k) => {
  setTimeout(() => k(I.succeed(10)), 100)
})
  ['&>'](
    I.effectAsync<unknown, never, number>((k) => {
      setTimeout(() => k(I.succeed(10)), 100)
    })
  )
  ['|>'](I.timed)
  ['>>=']((n) => I.effectTotal(() => console.log(n)))
  ['|>'](I.run)
