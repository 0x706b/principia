import type { FreeBooleanAlgebra } from "@principia/core/FreeBooleanAlgebra";
import * as BA from "@principia/core/FreeBooleanAlgebra";

import type { Assertion } from "./Assertion";
import { AssertionValue } from "./AssertionValue";

export interface AssertionData<A> {
  readonly _tag: "AssertionData";
  readonly value: A;
  readonly assertion: Assertion<A>;
}

export function AssertionData<A>(assertion: Assertion<A>, value: A): AssertionData<A> {
  return {
    _tag: "AssertionData",
    assertion,
    value
  };
}

export function asSuccess<A>(_: AssertionData<A>): FreeBooleanAlgebra<AssertionValue<A>> {
  return BA.success(
    AssertionValue(
      () => _.assertion,
      _.value,
      () => asSuccess(_)
    )
  );
}

export function asFailure<A>(_: AssertionData<A>): FreeBooleanAlgebra<AssertionValue<A>> {
  return BA.failure(
    AssertionValue(
      () => _.assertion,
      _.value,
      () => asFailure(_)
    )
  );
}
