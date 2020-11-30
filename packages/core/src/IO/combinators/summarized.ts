import { pipe } from "../../Function";
import * as _ from "../_core";
import type { IO } from "../model";

export function summarized_<R, E, A, R1, E1, B, C>(
  self: IO<R, E, A>,
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): IO<R & R1, E | E1, [C, A]> {
  return pipe(
    _.do,
    _.bindS("start", () => summary),
    _.bindS("value", () => self),
    _.bindS("end", () => summary),
    _.map((s) => [f(s.start, s.end), s.value])
  );
}

export function summarized<R1, E1, B, C>(
  summary: IO<R1, E1, B>,
  f: (start: B, end: B) => C
): <R, E, A>(self: _.IO<R, E, A>) => _.IO<R & R1, E1 | E, [C, A]> {
  return (self) => summarized_(self, summary, f);
}
