import { identity } from "../../Function";
import type * as I from "../model";
import { NewFiberRefInstruction } from "../model";
import type { FiberRef } from "./model";

export function make<A>(
  initial: A,
  onFork: (a: A) => A = identity,
  onJoin: (a: A, a1: A) => A = (_, a) => a
): I.UIO<FiberRef<A>> {
  return new NewFiberRefInstruction(initial, onFork, onJoin);
}