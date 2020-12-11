import { identity } from "../../Function";
import type { Cause } from "../../IO/Cause";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { halt } from "../constructors";
import type { Stream } from "../model";
import { catchAllCause_ } from "./catchAllCause";

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (cause: Cause<E>) => Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAllCause_(ma, (cause) =>
    O.fold_(f(cause), (): Stream<R & R1, E | E1, O | O1> => halt(cause), identity)
  );
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<E, R1, E1, O1>(
  f: (cause: Cause<E>) => Option<Stream<R1, E1, O1>>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O | O1> {
  return (ma) => catchSomeCause_(ma, f);
}
