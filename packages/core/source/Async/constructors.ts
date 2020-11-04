import type { AsyncExit } from "./AsyncExit";
import type { Async } from "./model";
import {
   DoneInstruction,
   FailInstruction,
   PartialInstruction,
   PromiseInstruction,
   SucceedInstruction,
   SuspendInstruction,
   TotalInstruction
} from "./model";

/*
 * -------------------------------------------
 * Async Constructors
 * -------------------------------------------
 */

export const succeed = <A>(a: A): Async<unknown, never, A> => new SucceedInstruction(a);

export const fail = <E>(e: E): Async<unknown, E, never> => new FailInstruction(e);

export const done = <E, A>(exit: AsyncExit<E, A>): Async<unknown, E, A> => new DoneInstruction(exit);

export const suspend = <R, E, A>(factory: () => Async<R, E, A>): Async<R, E, A> => new SuspendInstruction(factory);

export const unfailable = <A>(
   promise: (onInterrupt: (f: () => void) => void) => Promise<A>
): Async<unknown, never, A> => new PromiseInstruction(promise, () => undefined as never);

export const promise_ = <E, A>(
   promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
   onError: (u: unknown) => E
): Async<unknown, E, A> => new PromiseInstruction(promise, onError);

export const promise = <E>(onError: (u: unknown) => E) => <A>(
   promise: (onInterrupt: (f: () => void) => void) => Promise<A>
) => new PromiseInstruction(promise, onError);

export const total = <A>(thunk: () => A): Async<unknown, never, A> => new TotalInstruction(thunk);

export const partial_ = <E, A>(thunk: () => A, onThrow: (error: unknown) => E): Async<unknown, E, A> =>
   new PartialInstruction(thunk, onThrow);

export const partial = <E>(onThrow: (error: unknown) => E) => <A>(thunk: () => A): Async<unknown, E, A> =>
   partial_(thunk, onThrow);
