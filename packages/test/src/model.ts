import type { Assertion, AssertionM, AssertResult } from './Assertion'
import type { ExecutedSpec } from './ExecutedSpec'
import type { Gen } from './Gen'
import type { TestResult } from './Render'
import type { Sample } from './Sample'
import type { TestLogger, TestLoggerTag } from './TestLogger'
import type { WidenLiteral } from './util'
import type { Either } from '@principia/base/Either'
import type { Has } from '@principia/base/Has'
import type { Show } from '@principia/base/Show'
import type { BooleanAlgebra } from '@principia/base/typeclass'
import type { UnionToIntersection } from '@principia/base/util/types'
import type { IO, URIO } from '@principia/io/IO'
import type { Stream } from '@principia/io/Stream'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/Function'
import * as NA from '@principia/base/NonEmptyArray'
import * as O from '@principia/base/Option'
import { none } from '@principia/base/Option'
import * as C from '@principia/io/Chunk'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'
import * as S from '@principia/io/Stream'

import { TestAnnotationMap } from './Annotation'
import { anything, AssertionValue } from './Assertion'
import * as BA from './FreeBooleanAlgebra'
import { GenFailureDetails } from './GenFailureDetails'
import { FailureDetails } from './Render'
import * as Sa from './Sample'
import * as Spec from './Spec'
import { TestConfig } from './TestConfig'
import * as TF from './TestFailure'
import * as TS from './TestSuccess'

export type TestReporter<E> = (duration: number, spec: ExecutedSpec<E>) => URIO<Has<TestLogger>, void>

function traverseResultLoop<A>(whole: AssertionValue<A>, failureDetails: FailureDetails): TestResult {
  if (whole.isSameAssertionAs(NA.head(failureDetails.assertion))) {
    return BA.success(failureDetails)
  } else {
    const fragment = whole.result()
    const result   = BA.isTrue(fragment) ? fragment : BA.not(fragment)
    return BA.bind_(result, (fragment) =>
      traverseResultLoop(fragment, FailureDetails([whole, ...failureDetails.assertion], failureDetails.gen))
    )
  }
}

export function traverseResult<A>(
  value: A,
  assertResult: () => AssertResult<A>,
  assertion: () => AssertionM<A>,
  showA?: Show<A>
): TestResult {
  return BA.bind_(assertResult(), (fragment) =>
    traverseResultLoop(fragment, FailureDetails([new AssertionValue(value, assertion, assertResult, showA)]))
  )
}

export function assert<A>(
  value: WidenLiteral<A>,
  assertion: Assertion<WidenLiteral<A>>,
  showA?: Show<WidenLiteral<A>>
): TestResult {
  return traverseResult(
    value,
    () => assertion.run(value),
    () => assertion,
    showA
  )
}

export function assertM<R, E, A>(io: IO<R, E, A>, assertion: AssertionM<A>, showA?: Show<A>): IO<R, E, TestResult> {
  return I.gen(function* (_) {
    const value        = yield* _(io)
    const assertResult = yield* _(assertion.runM(value))
    return traverseResult(
      value,
      () => assertResult,
      () => assertion,
      showA
    )
  })
}

type MergeR<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = UnionToIntersection<
  {
    [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<infer R, any>] ? (unknown extends R ? never : R) : never
  }[number]
>

type MergeE<Specs extends ReadonlyArray<Spec.XSpec<any, any>>> = {
  [K in keyof Specs]: [Specs[K]] extends [Spec.XSpec<any, infer E>] ? E : never
}[number]

export function suite(
  label: string
): <Specs extends ReadonlyArray<Spec.XSpec<any, any>>>(...specs: Specs) => Spec.XSpec<MergeR<Specs>, MergeE<Specs>> {
  return (...specs) => Spec.suite(label, M.succeed(specs), none())
}

export function testM<R, E>(label: string, assertion: () => IO<R, E, TestResult>): Spec.XSpec<R, E> {
  return Spec.test(
    label,
    I.foldCauseM_(
      I.deferTotal(assertion),
      flow(TF.halt, I.fail),
      flow(
        BA.failures,
        O.fold(
          () => I.succeed(new TS.Succeeded(BA.success(undefined))),
          (failures) => I.fail(TF.assertion(failures))
        )
      )
    ),
    TestAnnotationMap.empty
  )
}

export function test(label: string, assertion: () => TestResult): Spec.XSpec<unknown, never> {
  return testM(label, () => I.effectTotal(assertion))
}

export function check<R, A>(rv: Gen<R, A>): (test: (a: A) => TestResult) => URIO<R & Has<TestConfig>, TestResult> {
  return (test) => checkM(rv)(flow(test, I.succeed))
}

export function checkM<R, A>(
  rv: Gen<R, A>
): <R1, E>(test: (a: A) => IO<R1, E, TestResult>) => IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return (test) =>
    pipe(
      TestConfig.samples,
      I.bind((n) => checkStream(pipe(rv.sample, S.forever, S.take(n)), test))
    )
}

function checkStream<R, A, R1, E>(
  stream: Stream<R, never, Sample<R, A>>,
  test: (a: A) => IO<R1, E, TestResult>
): IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return pipe(
    TestConfig.shrinks,
    I.bind(
      shrinkStream(
        pipe(
          stream,
          S.zipWithIndex,
          S.mapM(([initial, index]) =>
            pipe(
              initial,
              Sa.foreach((input) =>
                pipe(
                  test(input),
                  I.map(
                    BA.map((fd) => FailureDetails(fd.assertion, O.some(GenFailureDetails(initial.value, input, index))))
                  ),
                  I.attempt
                )
              )
            )
          )
        )
      )
    )
  )
}

function shrinkStream<R, R1, E, A>(
  stream: Stream<R1, never, Sample<R1, Either<E, BA.FreeBooleanAlgebra<FailureDetails>>>>
): (maxShrinks: number) => IO<R & R1 & Has<TestConfig>, E, TestResult> {
  return (maxShrinks) =>
    pipe(
      stream,
      S.dropWhile((_) => !E.fold_(_.value, (_) => true, BA.isFalse)),
      S.take(1),
      S.bind(flow(Sa.shrinkSearch(E.fold(() => true, BA.isFalse)), S.take(maxShrinks + 1))),
      S.runCollect,
      I.bind(
        flow(
          C.filter(E.fold(() => true, BA.isFalse)),
          C.last,
          O.fold(
            () =>
              I.succeed(
                BA.success(
                  FailureDetails([
                    new AssertionValue(
                      undefined,
                      () => anything,
                      () => anything.run(undefined)
                    )
                  ])
                )
              ),
            (_) => I.fromEither(() => _)
          )
        )
      )
    )
}
