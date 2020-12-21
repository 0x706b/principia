import type { Stream } from "../core";
import type * as Take from "../Take";

import { pipe } from "@principia/base/data/Function";

import { flattenChunks } from "./flattenChunks";
import { flattenExitOption } from "./flattenExitOption";

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, O>(
  stream: Stream<R, E, Take.Take<E1, O>>
): Stream<R, E | E1, O> {
  return pipe(stream, flattenExitOption, flattenChunks);
}
