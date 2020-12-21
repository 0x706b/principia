import type { FiberId } from "../Fiber/FiberId";
import type { IO } from "../IO/core";
import type * as HKT from "@principia/base/HKT";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { identity, pipe, tuple } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../Cause";

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Exit<E, A> = Success<A> | Failure<E>;

export interface Success<A> {
  readonly _tag: "Success";
  readonly value: A;
}

export interface Failure<E> {
  readonly _tag: "Failure";
  readonly cause: C.Cause<E>;
}

export const URI = "Exit";
export type URI = typeof URI;

export type V = HKT.V<"E", "+">;

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function succeed<E = never, A = never>(value: A): Exit<E, A> {
  return {
    _tag: "Success",
    value
  };
}

export function failure<E = never, A = never>(cause: C.Cause<E>): Exit<E, A> {
  return {
    _tag: "Failure",
    cause
  };
}

export function fail<E = never, A = never>(e: E): Exit<E, A> {
  return failure(C.fail(e));
}

export function interrupt(id: FiberId) {
  return failure(C.interrupt(id));
}

export function die(error: unknown): Exit<unknown, never> {
  return failure(C.die(error));
}

export function fromEither<E, A>(e: E.Either<E, A>): Exit<E, A> {
  return e._tag === "Left" ? fail(e.left) : succeed(e.right);
}

export function fromOption_<E, A>(fa: O.Option<A>, onNone: () => E): Exit<E, A> {
  return fa._tag === "None" ? fail(onNone()) : succeed(fa.value);
}

export function fromOption<E>(onNone: () => E): <A>(fa: O.Option<A>) => Exit<E, A> {
  return (fa) => fromOption_(fa, onNone);
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export function isSuccess<E, A>(exit: Exit<E, A>): exit is Success<A> {
  return exit._tag === "Success";
}

export function isFailure<E, A>(exit: Exit<E, A>): exit is Failure<E> {
  return exit._tag === "Failure";
}

export function isInterrupt<E, A>(exit: Exit<E, A>): exit is Failure<E> {
  return isFailure(exit) ? C.interrupted(exit.cause) : false;
}

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

export function fold_<E, A, B>(
  exit: Exit<E, A>,
  onFailure: (e: C.Cause<E>) => B,
  onSuccess: (a: A) => B
): B {
  switch (exit._tag) {
    case "Success": {
      return onSuccess(exit.value);
    }
    case "Failure": {
      return onFailure(exit.cause);
    }
  }
}

export function fold<E, A, B>(
  onFailure: (e: C.Cause<E>) => B,
  onSuccess: (a: A) => B
): (exit: Exit<E, A>) => B {
  return (exit) => fold_(exit, onFailure, onSuccess);
}

/**
 * Folds over the value or cause.
 */
export function foldM_<E, A, R1, E1, A1, R2, E2, A2>(
  exit: Exit<E, A>,
  onFailure: (e: C.Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): IO<R1 & R2, E1 | E2, A1 | A2> {
  switch (exit._tag) {
    case "Success": {
      return onSuccess(exit.value);
    }
    case "Failure": {
      return onFailure(exit.cause);
    }
  }
}

export function foldM<E, A, R1, E1, A1, R2, E2, A2>(
  onFailure: (e: C.Cause<E>) => IO<R1, E1, A1>,
  onSuccess: (a: A) => IO<R2, E2, A2>
): (exit: Exit<E, A>) => IO<R1 & R2, E1 | E2, A1 | A2> {
  return (exit) => foldM_(exit, onFailure, onSuccess);
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): Exit<never, A> {
  return succeed(a);
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function product_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, readonly [A, B]> {
  return map2Cause_(fa, fb, tuple, C.then);
}

export function product<G, B>(
  fb: Exit<G, B>
): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => product_(fa, fb);
}

export function productPar_<E, G, A, B>(
  fa: Exit<E, A>,
  fb: Exit<G, B>
): Exit<E | G, readonly [A, B]> {
  return map2Cause_(fa, fb, tuple, C.both);
}

export function productPar<G, B>(
  fb: Exit<G, B>
): <E, A>(fa: Exit<E, A>) => Exit<G | E, readonly [A, B]> {
  return (fa) => productPar_(fa, fb);
}

export function ap_<E, A, G, B>(fab: Exit<G, (a: A) => B>, fa: Exit<E, A>): Exit<E | G, B> {
  return flatMap_(fab, (f) => map_(fa, (a) => f(a)));
}

export function ap<E, A>(fa: Exit<E, A>): <G, B>(fab: Exit<G, (a: A) => B>) => Exit<E | G, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<E, G, A, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return map2Cause_(fa, fb, (a, _) => a, C.then);
}

export function apFirst<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => apFirst_(fa, fb);
}

export function apSecond_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return map2Cause_(fa, fb, (_, b) => b, C.then);
}

export function apSecond<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export function map2Cause_<E, A, G, B, C>(
  fa: Exit<E, A>,
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): Exit<E | G, C> {
  switch (fa._tag) {
    case "Failure": {
      switch (fb._tag) {
        case "Success": {
          return fa;
        }
        case "Failure": {
          return failure(g(fa.cause, fb.cause));
        }
      }
    }
    // eslint-disable-next-line no-fallthrough
    case "Success": {
      switch (fb._tag) {
        case "Success": {
          return succeed(f(fa.value, fb.value));
        }
        case "Failure": {
          return fb;
        }
      }
    }
  }
}

export function map2Cause<E, A, G, B, C>(
  fb: Exit<G, B>,
  f: (a: A, b: B) => C,
  g: (ea: C.Cause<E>, eb: C.Cause<G>) => C.Cause<E | G>
): (fa: Exit<E, A>) => Exit<E | G, C> {
  return (fa) => map2Cause_(fa, fb, f, g);
}

export function map2_<EA, A, EB, B, C>(
  fa: Exit<EA, A>,
  fb: Exit<EB, B>,
  f: (a: A, b: B) => C
): Exit<EA | EB, C> {
  return map2Cause_(fa, fb, f, C.then);
}

export function map2<A, G, B, C>(
  fb: Exit<G, B>,
  f: (a: A, b: B) => C
): <E>(fa: Exit<E, A>) => Exit<G | E, C> {
  return (fa) => map2_(fa, fb, f);
}

export function apFirstPar_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, A> {
  return map2Cause_(fa, fb, (a, _) => a, C.both);
}

export function apFirstPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, A> {
  return (fa) => apFirstPar_(fa, fb);
}

export function apSecondPar_<E, A, G, B>(fa: Exit<E, A>, fb: Exit<G, B>): Exit<E | G, B> {
  return map2Cause_(fa, fb, (_, b) => b, C.both);
}

export function apSecondPar<G, B>(fb: Exit<G, B>): <E, A>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => apSecondPar_(fa, fb);
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function mapError_<E, A, G>(pab: Exit<E, A>, f: (e: E) => G): Exit<G, A> {
  return isFailure(pab) ? failure(C.map_(pab.cause, f)) : pab;
}

export function mapError<E, G>(f: (e: E) => G): <A>(pab: Exit<E, A>) => Exit<G, A> {
  return (pab) => mapError_(pab, f);
}

export function bimap_<E, A, G, B>(pab: Exit<E, A>, f: (e: E) => G, g: (a: A) => B): Exit<G, B> {
  return isFailure(pab) ? mapError_(pab, f) : map_(pab, g);
}

export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: Exit<E, A>) => Exit<G, B> {
  return (pab) => bimap_(pab, f, g);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: Exit<E, A>, f: (a: A) => B): Exit<E, B> {
  return isFailure(fa) ? fa : succeed(f(fa.value));
}

export function map<A, B>(f: (a: A) => B): <E>(fa: Exit<E, A>) => Exit<E, B> {
  return (fa) => map_(fa, f);
}

export function as_<E, A, B>(fa: Exit<E, A>, b: B): Exit<E, B> {
  return map_(fa, () => b);
}

export function as<B>(b: B): <E, A>(fa: Exit<E, A>) => Exit<E, B> {
  return map(() => b);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMap_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, B> {
  return isFailure(ma) ? ma : f(ma.value);
}

export function flatMap<A, G, B>(f: (a: A) => Exit<G, B>): <E>(fa: Exit<E, A>) => Exit<G | E, B> {
  return (fa) => flatMap_(fa, f);
}

export function flatten<E, G, A>(mma: Exit<E, Exit<G, A>>): Exit<E | G, A> {
  return flatMap_(mma, identity);
}

export function tap_<E, A, G, B>(ma: Exit<E, A>, f: (a: A) => Exit<G, B>): Exit<E | G, A> {
  return flatMap_(ma, (a) =>
    pipe(
      f(a),
      map(() => a)
    )
  );
}

export function tap<A, G, B>(f: (a: A) => Exit<G, B>): <E>(ma: Exit<E, A>) => Exit<G | E, A> {
  return (ma) => tap_(ma, f);
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Exit<never, void> {
  return succeed(undefined);
}

/*
 * -------------------------------------------
 * Combiniators
 * -------------------------------------------
 */

export function collectAll<E, A>(
  ...exits: ReadonlyArray<Exit<E, A>>
): O.Option<Exit<E, ReadonlyArray<A>>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.foldLeft(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) => map2Cause_(acc, el, (acc, el) => [el, ...acc], C.then)
        ),
        map(A.reverse)
      )
    )
  );
}

export function collectAllPar<E, A>(
  ...exits: ReadonlyArray<Exit<E, A>>
): O.Option<Exit<E, readonly A[]>> {
  return pipe(
    A.head(exits),
    O.map((head) =>
      pipe(
        A.drop_(exits, 1),
        A.foldLeft(
          pipe(
            head,
            map((x): ReadonlyArray<A> => [x])
          ),
          (acc, el) => map2Cause_(acc, el, (acc, el) => [el, ...acc], C.both)
        ),
        map(A.reverse)
      )
    )
  );
}

export function orElseFail_<E, A, G>(exit: Exit<E, A>, orElse: G) {
  return mapError_(exit, () => orElse);
}

export function orElseFail<G>(orElse: G): <E, A>(exit: Exit<E, A>) => Exit<G, A> {
  return (exit) => orElseFail_(exit, orElse);
}

export function untraced<E, A>(exit: Exit<E, A>): Exit<E, A> {
  return exit._tag === "Success" ? exit : failure(C.untraced(exit.cause));
}
