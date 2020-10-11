import * as C from "../../Cause";
import { HasClock, LiveClock } from "../../Clock";
import type { Exit } from "../../Exit";
import * as F from "../../Fiber";
import { FiberContext } from "../../Fiber/FiberContext";
import { fiberId } from "../../Fiber/FiberId";
import type { Callback } from "../../Fiber/state";
import type { Layer } from "../../Layer/Layer";
import { HasMemoMap, MemoMap } from "../../Layer/MemoMap";
import type { Finalizer } from "../../Managed/ReleaseMap";
import { defaultRandom, HasRandom } from "../../Random";
import * as Scope from "../../Scope";
import * as Super from "../../Supervisor";
import * as XRM from "../../XRefM";
import * as T from "../core";
import { _I } from "../Effect";

export const empty = () => {
   return;
};

export type DefaultEnv = HasClock & HasRandom & HasMemoMap;

export const memoMap = new MemoMap(
   XRM.unsafeMakeRefM<ReadonlyMap<Layer<any, any, any>, readonly [T.IO<any, any>, Finalizer]>>(new Map())
);

export const defaultEnv = () => ({
   [HasClock.key]: LiveClock(),
   [HasRandom.key]: defaultRandom,
   [HasMemoMap.key]: memoMap
});

export const fiberContext = <E, A>() =>
   new FiberContext<E, A>(
      fiberId(),
      defaultEnv(),
      F.interruptible,
      new Map(),
      Super.none,
      Scope.unsafeMakeScope<Exit<E, A>>(),
      10_000
   );

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export const run = <E, A>(_: T.Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) => {
   const context = fiberContext<E, A>();

   context.evaluateLater(_[_I]);
   context.runAsync(cb || empty);
};

/**
 * Runs effect until completion, calling cb with the eventual exit state
 */
export const runAsap = <E, A>(_: T.Effect<DefaultEnv, E, A>, cb?: Callback<E, A>) => {
   const context = fiberContext<E, A>();

   context.evaluateNow(_[_I]);
   context.runAsync(cb || empty);
};

export interface CancelMain {
   (): void;
}

/**
 * Runs effect until completion returing a cancel function that when invoked
 * triggers cancellation of the process, in case errors are found process will
 * exit with a status of 2 and cause will be pretty printed, if interruption
 * is found without errors the cause is pretty printed and process exits with
 * status 0. In the success scenario process exits with status 0 witout any log.
 *
 * Note: this should be used only in node.js as it depends on process.exit
 */
export const runMain = <E>(effect: T.Effect<DefaultEnv, E, void>): CancelMain => {
   const context = fiberContext<E, void>();

   context.evaluateLater(effect[_I]);
   context.runAsync((exit) => {
      switch (exit._tag) {
         case "Failure": {
            if (C.isDie(exit.cause) || C.didFail(exit.cause)) {
               console.error(C.prettyPrint(exit.cause));
               process.exit(2);
            } else {
               console.log(C.prettyPrint(exit.cause));
               process.exit(0);
            }
         }
         // eslint-disable-next-line no-fallthrough
         case "Success": {
            process.exit(0);
         }
      }
   });

   return () => {
      run(context.interruptAs(context.id));
   };
};

/**
 * Effect Canceler
 */
export type AsyncCancel<E, A> = T.UIO<Exit<E, A>>;

/**
 * Run effect as a Promise of the Exit state
 * in case of error.
 */
export const runPromiseExit = <E, A>(_: T.Effect<DefaultEnv, E, A>): Promise<Exit<E, A>> => {
   const context = fiberContext<E, A>();

   context.evaluateLater(_[_I]);

   return new Promise((res) => {
      context.runAsync((exit) => {
         res(exit);
      });
   });
};

/**
 * Runs effect until completion returing a cancel effecr that when executed
 * triggers cancellation of the process
 */
export const runCancel = <E, A>(_: T.Effect<DefaultEnv, E, A>, cb?: Callback<E, A>): AsyncCancel<E, A> => {
   const context = fiberContext<E, A>();

   context.evaluateLater(_[_I]);
   context.runAsync(cb || empty);

   return context.interruptAs(context.id);
};

/**
 * Run effect as a Promise, throwing a FiberFailure containing the cause of exit
 * in case of error.
 */
export const runPromise = <E, A>(_: T.Effect<DefaultEnv, E, A>): Promise<A> => {
   const context = fiberContext<E, A>();

   context.evaluateLater(_[_I]);

   return new Promise((res, rej) => {
      context.runAsync((exit) => {
         switch (exit._tag) {
            case "Success": {
               res(exit.value);
               break;
            }
            case "Failure": {
               rej(new C.FiberFailure(exit.cause));
               break;
            }
         }
      });
   });
};

/**
 * Represent an environment providing function
 */
export interface Runtime<R0> {
   in: <R, E, A>(effect: T.Effect<R & R0, E, A>) => T.Effect<R, E, A>;
   run: <E, A>(_: T.Effect<DefaultEnv & R0, E, A>, cb?: Callback<E, A> | undefined) => void;
   runCancel: <E, A>(_: T.Effect<DefaultEnv & R0, E, A>, cb?: Callback<E, A> | undefined) => T.UIO<Exit<E, A>>;
   runPromise: <E, A>(_: T.Effect<DefaultEnv & R0, E, A>) => Promise<A>;
   runPromiseExit: <E, A>(_: T.Effect<DefaultEnv & R0, E, A>) => Promise<Exit<E, A>>;
}

export const makeRuntime = <R0>(r0: R0): Runtime<R0> => ({
   in: <R, E, A>(effect: T.Effect<R & R0, E, A>) => T.local_(effect, (r: R) => ({ ...r0, ...r })),
   run: (_, cb) =>
      run(
         T.local_(_, (r) => ({ ...r0, ...r })),
         cb
      ),
   runCancel: (_, cb) =>
      runCancel(
         T.local_(_, (r) => ({ ...r0, ...r })),
         cb
      ),
   runPromise: (_) => runPromise(T.local_(_, (r) => ({ ...r0, ...r }))),
   runPromiseExit: (_) => runPromiseExit(T.local_(_, (r) => ({ ...r0, ...r })))
});

/**
 * Use current environment to build a runtime that is capable of
 * providing its content to other effects.
 *
 * NOTE: in should be used in a region where current environment
 * is valid (i.e. keep attention to closed resources)
 */
export const runtime = <R0>() =>
   T.asksM((r0: R0) =>
      T.total(
         (): Runtime<R0> => {
            return makeRuntime<R0>(r0);
         }
      )
   );

export const withRuntimeM = <R0, R, E, A>(f: (r: Runtime<R0>) => T.Effect<R, E, A>) => T.chain_(runtime<R0>(), f);

export const withRuntime = <R0, A>(f: (r: Runtime<R0>) => A) => T.chain_(runtime<R0>(), (r) => T.pure(f(r)));
