import type { _A, _E, _R } from "../Utils/infer";
import { map_ } from "./functor";
import type { Async } from "./model";
import { AllInstruction } from "./model";

/*
 * -------------------------------------------
 * Parallel Apply Async
 * -------------------------------------------
 */

export function tuplePar<A extends ReadonlyArray<Async<any, any, any>>>(
  ...asyncs: A & { 0: Async<any, any, any> }
): Async<
  _R<A[number]>,
  _E<A[number]>,
  {
    [K in keyof A]: _A<A[K]>;
  }
> {
  return new AllInstruction(asyncs) as any;
}

export function zipWithPar_<R, E, A, R1, E1, B, C>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): Async<R & R1, E | E1, C> {
  return map_(tuplePar(fa, fb), ([a, b]) => f(a, b));
}

export function zipWithPar<A, R1, E1, B, C>(
  fb: Async<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, C> {
  return (fa) => zipWithPar_(fa, fb, f);
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Async<R1, E1, (a: A) => B>,
  fa: Async<R, E, A>
): Async<R & R1, E | E1, B> {
  return zipWithPar_(fab, fa, (f, a) => f(a));
}

export function apPar<R, E, A>(
  fa: Async<R, E, A>
): <R1, E1, B>(fab: Async<R1, E1, (a: A) => B>) => Async<R & R1, E1 | E, B> {
  return (fab) => apPar_(fab, fa);
}

export function apFirstPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A> {
  return zipWithPar_(fa, fb, (a, _) => a);
}

export function apFirstPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A> {
  return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<R, E, A, R1, E1, A1>(
  fa: Async<R, E, A>,
  fb: Async<R1, E1, A1>
): Async<R & R1, E | E1, A1> {
  return zipWithPar_(fa, fb, (_, b) => b);
}

export function apSecondPar<R1, E1, A1>(
  fb: Async<R1, E1, A1>
): <R, E, A>(fa: Async<R, E, A>) => Async<R & R1, E1 | E, A1> {
  return (fa) => apSecondPar_(fa, fb);
}
