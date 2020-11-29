import type { Either } from "../Either";
import * as E from "../Either";
import type { FunctionN, Lazy } from "../Function";
import type { IO } from "../IO";
import * as X from "../SIO";
import type { EIO } from "./model";

/*
 * -------------------------------------------
 * EIO Constructors
 * -------------------------------------------
 */

export const fail: <E = never, A = never>(e: E) => EIO<E, A> = X.fail;

export const succeed: <E = never, A = never>(a: A) => EIO<E, A> = X.succeed;

export const total: <E = never, A = never>(thunk: () => A) => EIO<E, A> = X.total;

export const leftIO: <E = never, A = never>(io: IO<E>) => EIO<E, A> = X.chain(fail);

export const rightIO: <E = never, A = never>(io: IO<A>) => EIO<E, A> = X.chain(succeed);

export const fromEither: <E, A>(pab: Either<E, A>) => EIO<E, A> = E.fold(fail, succeed);

export const _partial: <E, A>(thunk: Lazy<A>, onThrow: (reason: unknown) => E) => EIO<E, A> =
  X.partial_;

export const partial = <E>(onThrow: (reason: unknown) => E) => <A>(thunk: Lazy<A>) =>
  _partial(thunk, onThrow);

export function _partialK<A extends ReadonlyArray<unknown>, B, E>(
  f: FunctionN<A, B>,
  onThrow: (reason: unknown) => E
): (...args: A) => EIO<E, B> {
  return (...a) => _partial(() => f(...a), onThrow);
}

export function partialK<E>(
  onThrow: (reason: unknown) => E
): <A extends readonly unknown[], B>(f: FunctionN<A, B>) => (...args: A) => EIO<E, B> {
  return (f) => _partialK(f, onThrow);
}
