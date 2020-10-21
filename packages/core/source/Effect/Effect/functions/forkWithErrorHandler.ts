import * as E from "../../../Either";
import { flow } from "../../../Function";
import * as C from "../../Cause";
import { fork, halt } from "../core";
import type { Effect, RIO } from "../model";
import { onError_ } from "./onError";

export const forkWithErrorHandler_ = <R, E, A, R1>(ma: Effect<R, E, A>, handler: (e: E) => RIO<R1, void>) =>
   fork(onError_(ma, flow(C.failureOrCause, E.fold(handler, halt))));

export const forkWithErrorHandler = <E, R1>(handler: (e: E) => RIO<R1, void>) => <R, A>(ma: Effect<R, E, A>) =>
   forkWithErrorHandler_(ma, handler);
