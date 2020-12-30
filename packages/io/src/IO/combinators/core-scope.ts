import type { Exit } from '../../Exit'
import type { Fiber, RuntimeFiber } from '../../Fiber/core'
import type { FiberContext } from '../../FiberContext'
import type { Scope } from '../../Scope'
import type { IO, UIO, URIO } from '../core'
import type { Option } from '@principia/base/data/Option'

import * as O from '@principia/base/data/Option'

import { globalScope } from '../../Scope'
import { ForkInstruction, GetForkScopeInstruction, OverrideForkScopeInstruction, pure, RaceInstruction } from '../core'

export const forkScope: UIO<Scope<Exit<any, any>>> = new GetForkScopeInstruction(pure)

export function forkScopeWith<R, E, A>(f: (_: Scope<Exit<any, any>>) => IO<R, E, A>) {
  return new GetForkScopeInstruction(f)
}

export class ForkScopeRestore {
  constructor(private scope: Scope<Exit<any, any>>) {}

  readonly restore = <R, E, A>(ma: IO<R, E, A>): IO<R, E, A> => new OverrideForkScopeInstruction(ma, O.some(this.scope))
}

export function forkScopeMask(
  newScope: Scope<Exit<any, any>>
): <R, E, A>(f: (restore: ForkScopeRestore) => IO<R, E, A>) => GetForkScopeInstruction<R, E, A> {
  return (f) =>
    forkScopeWith((scope) => new OverrideForkScopeInstruction(f(new ForkScopeRestore(scope)), O.some(newScope)))
}

export function forkIn(scope: Scope<Exit<any, any>>): <R, E, A>(io: IO<R, E, A>) => URIO<R, RuntimeFiber<E, A>> {
  return (io) => new ForkInstruction(io, O.some(scope), O.none())
}

export function raceWith_<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  left: IO<R, E, A>,
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.none()
): IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return new RaceInstruction(left, right, leftWins, rightWins, scope)
}

export function raceWith<E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3>(
  right: IO<R1, E1, A1>,
  leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => IO<R2, E2, A2>,
  rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => IO<R3, E3, A3>,
  scope: Option<Scope<Exit<any, any>>> = O.none()
): <R>(left: IO<R, E, A>) => IO<R & R1 & R2 & R3, E2 | E3, A2 | A3> {
  return (left) => new RaceInstruction(left, right, leftWins, rightWins, scope)
}

export type Grafter = <R, E, A>(effect: IO<R, E, A>) => IO<R, E, A>

export function transplant<R, E, A>(f: (_: Grafter) => IO<R, E, A>): IO<R, E, A> {
  return forkScopeWith((scope) => f((e) => new OverrideForkScopeInstruction(e, O.some(scope))))
}

/**
 * Forks the effect into a new fiber attached to the global scope. Because the
 * new fiber is attached to the global scope, when the fiber executing the
 * returned effect terminates, the forked fiber will continue running.
 */
export function forkDaemon<R, E, A>(ma: IO<R, E, A>): URIO<R, FiberContext<E, A>> {
  return new ForkInstruction(ma, O.some(globalScope), O.none())
}
