import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import * as I from "@principia/core/Iterable";
import * as O from "@principia/core/Option";

import type { Exit } from "../../Exit";
import * as Fiber from "../../Fiber";
import * as FiberRef from "../../FiberRef";
import type { Scope } from "../../Scope";
import { chain, chain_, foreach_, fork, map_, unit } from "../core";
import { forkScopeWith } from "../core-scope";
import type { Effect, RIO } from "../Effect";
import { OverrideForkScopeInstruction } from "../Effect";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 */
export const forkAll = <R, E, A>(efs: Iterable<Effect<R, E, A>>): RIO<R, Fiber.Fiber<E, ReadonlyArray<A>>> =>
   map_(
      foreach_(efs, fork),
      A.reduce(Fiber.succeed([]) as Fiber.Fiber<E, ReadonlyArray<A>>, (b, a) =>
         Fiber.mapBoth_(b, a, (_a, _b) => [..._a, _b])
      )
   );

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than [[forkAll]]
 * in cases where the results of the forked fibers are not needed.
 */
export const forkAllUnit = <R, E, A>(efs: Iterable<Effect<R, E, A>>) =>
   I.reduce_(efs, unit as RIO<R, void>, (b, a) => chain_(fork(a), () => b));

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export const _forkAs = <R, E, A>(fa: Effect<R, E, A>, name: string): RIO<R, Fiber.Driver<E, A>> =>
   uninterruptibleMask(({ restore }) =>
      pipe(
         Fiber.fiberName,
         FiberRef.set(O.some(name)),
         chain(() => fork(restore(fa)))
      )
   );

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export const forkAs = (name: string) => <R, E, A>(ef: Effect<R, E, A>): RIO<R, Fiber.Driver<E, A>> => _forkAs(ef, name);

export interface ForkScopeRestore {
   /** @internal */
   readonly scope: Scope<Exit<any, any>>;

   readonly restore: <R, E, A>(fa: Effect<R, E, A>) => Effect<R, E, A>;
}

export const ForkScopeRestore = (scope: Scope<Exit<any, any>>): ForkScopeRestore => ({
   scope,
   restore: (fa) => OverrideForkScopeInstruction(fa, O.some(scope))
});

/*
 * export class ForkScopeRestore {
 *    constructor(private scope: Scope<Exit<any, any>>) {}
 *
 *    readonly restore = <R, E, A>(ef: Effect<R, E, A>): Effect<R, E, A> =>
 *       OverrideForkScopeInstruction(ef, O.some(this.scope));
 * }
 */

/**
 * Captures the fork scope, before overriding it with the specified new
 * scope, passing a function that allows restoring the fork scope to
 * what it was originally.
 */
export const forkScopeMask = (newScope: Scope<Exit<any, any>>) => <R, E, A>(
   f: (restore: ForkScopeRestore) => Effect<R, E, A>
) => forkScopeWith((scope) => OverrideForkScopeInstruction(f(ForkScopeRestore(scope)), O.some(newScope)));
