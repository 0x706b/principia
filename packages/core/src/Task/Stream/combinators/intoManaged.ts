import { flow, pipe } from "@principia/prelude";

import * as O from "../../../Option";
import * as C from "../../Exit/Cause";
import type { Managed } from "../../Managed";
import * as M from "../../Managed";
import * as T from "../../Task";
import type * as XQ from "../../XQueue";
import * as Take from "../internal/Take";
import type { Stream } from "../model";

export function intoManaged_<R, E, O, R1, E1>(
   ma: Stream<R, E, O>,
   queue: XQ.XQueue<R1, never, never, unknown, Take.Take<E | E1, O>, any>
): Managed<R & R1, E | E1, void> {
   return pipe(
      M.do,
      M.bindS("as", () => ma.proc),
      M.letS("pull", ({ as }) => {
         const go: T.Task<R & R1, never, void> = T.foldCauseM_(
            as,
            flow(
               C.sequenceCauseOption,
               O.fold(
                  () => T.asUnit(queue.offer(Take.end)),
                  (c) => T.andThen_(queue.offer(Take.halt(c)), go)
               )
            ),
            (a) => T.andThen_(queue.offer(Take.chunk(a)), go)
         );
         return go;
      }),
      M.chain(({ pull }) => T.toManaged_(pull))
   );
}
