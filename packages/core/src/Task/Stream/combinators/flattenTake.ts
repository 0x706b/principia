import { pipe } from "@principia/prelude";

import type * as Take from "../internal/Take";
import type { Stream } from "../model";
import { flattenChunks } from "./flattenChunks";
import { flattenExitOption } from "./flattenExitOption";

export function flattenTake<R, E, E1, O>(
  stream: Stream<R, E, Take.Take<E1, O>>
): Stream<R, E | E1, O> {
  return pipe(stream, flattenExitOption, flattenChunks);
}
