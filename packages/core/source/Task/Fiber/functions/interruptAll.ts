import * as T from "../../Task/core";
import { checkFiberId } from "../../Task/functions/checkFiberId";
import type { Fiber } from "../model";
import { interruptAllAs_ } from "./interrupt";

/**
 * Interrupts all fibers and awaits their interruption
 */
export const interruptAll = (fs: Iterable<Fiber<any, any>>) =>
   T.chain_(checkFiberId(), (id) => interruptAllAs_(fs, id));
