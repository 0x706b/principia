import type { XSpec } from './Spec'
import type * as TA from './TestArgs'
import type { TestLogger } from './TestLogger'
import type { Has } from '@principia/base/Has'
import type { Clock } from '@principia/io/Clock'
import type { URIO } from '@principia/io/IO'

import * as E from '@principia/base/Either'
import { matchTag } from '@principia/base/util/matchers'
import * as I from '@principia/io/IO'

import { AbstractRunnableSpec } from './AbstractRunnableSpec'
import * as ExSp from './ExecutedSpec'
import * as S from './Spec'

export abstract class RunnableSpec<R, E> extends AbstractRunnableSpec<R, E> {
  private run(spec: XSpec<R, E>): URIO<Has<TestLogger> & Has<Clock>, number> {
    const self = this
    return I.gen(function* (_) {
      const results     = yield* _(self.runSpec(spec))
      const hasFailures = ExSp.exists_(
        results,
        matchTag(
          {
            Test: ({ test }) => E.isLeft(test)
          },
          () => false
        )
      )
      // TODO: Summary
      return hasFailures ? 1 : 0
    })
  }
  main(args: TA.TestArgs): void {
    const filteredSpec = S.filterByArgs_(this.spec, args)
    I.run(I.giveLayer_(this.run(filteredSpec), this.runner.bootstrap), (ex) => {
      console.log(ex)
      ex._tag === 'Success' ? process.exit(ex.value) : process.exit(1)
    })
  }
}
