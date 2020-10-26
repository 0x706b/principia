import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { flow } from "../../../Function";
import { chain_, pure, total } from "../core";
import type { UIO } from "../model";

/**
 *  Returns a task with the value on the left part.
 */
export const left = <A>(a: () => A): UIO<Either<A, never>> => chain_(total(a), flow(E.left, pure));
