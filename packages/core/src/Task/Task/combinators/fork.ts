import { chain, chain_, foreach_, fork, map_, unit } from "../_core";
import * as A from "../../../Array";
import { pipe } from "../../../Function";
import * as I from "../../../Iterable";
import * as O from "../../../Option";
import * as Fiber from "../../Fiber";
import * as FiberRef from "../../FiberRef";
import type { RIO, Task } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns a task that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export function forkAll<R, E, A>(efs: Iterable<Task<R, E, A>>): RIO<R, Fiber.Fiber<E, ReadonlyArray<A>>> {
   return map_(
      foreach_(efs, fork),
      A.reduce(Fiber.succeed([]) as Fiber.Fiber<E, ReadonlyArray<A>>, (b, a) =>
         Fiber.mapBoth_(b, a, (_a, _b) => [..._a, _b])
      )
   );
}

/**
 * Returns a task that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 */
export function forkAllUnit<R, E, A>(efs: Iterable<Task<R, E, A>>): RIO<R, void> {
   return I.reduce_(efs, unit() as RIO<R, void>, (b, a) => chain_(fork(a), () => b));
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<R, E, A>(fa: Task<R, E, A>, name: string): RIO<R, Fiber.Executor<E, A>> {
   return uninterruptibleMask(({ restore }) =>
      pipe(
         Fiber.fiberName,
         FiberRef.set(O.some(name)),
         chain(() => fork(restore(fa)))
      )
   );
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs(name: string): <R, E, A>(ef: Task<R, E, A>) => RIO<R, Fiber.Executor<E, A>> {
   return (ef) => forkAs_(ef, name);
}
