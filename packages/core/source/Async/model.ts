import type * as HKT from "@principia/prelude/HKT";

import { _A, _E, _I, _R, _U } from "../Task/Task/constants";
import type * as T from "../Task/Task/model";
import type * as Ex from "./AsyncExit";
import { asyncIntegrationNotImplemented, asyncTaskIntegration } from "./integration";

export const _AI = "_AI";
export type _AI = typeof _AI;

export abstract class Async<R, E, A> implements T.Integration<R, E, A> {
   readonly _tag = "Integration";
   readonly _S1!: (_: unknown) => void;
   readonly _S2!: () => never;

   readonly [_U]!: T.URI;
   readonly [_R]!: (_: R) => void;
   readonly [_E]!: () => E;
   readonly [_A]!: () => A;

   get [_I](): T.Instruction {
      const ai = asyncTaskIntegration.get;
      if (ai._tag === "Some") {
         return ai.value(this)[_I];
      }
      return asyncIntegrationNotImplemented;
   }

   get [_AI](): AsyncInstruction {
      return this as any;
   }
}

export const URI = "Async";
export type URI = typeof URI;

export type V = HKT.V<"R", "-"> & HKT.V<"E", "+">;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Async<R, E, A>;
   }
}

export enum AsyncInstructionTag {
   Pure = "Pure",
   Suspend = "Suspend",
   Promise = "Promise",
   Chain = "Chain",
   Fold = "Fold",
   Asks = "Asks",
   Done = "Done",
   Give = "Give",
   Finalize = "Finalize",
   All = "All"
}

export type AsyncInstruction =
   | PureInstruction<any>
   | SuspendInstruction<any, any, any>
   | PromiseInstruction<any, any>
   | ChainInstruction<any, any, any, any, any, any>
   | FoldInstruction<any, any, any, any, any, any, any, any, any>
   | AsksInstruction<any, any, any, any>
   | DoneInstruction<any, any>
   | GiveInstruction<any, any, any>
   | FinalizeInstruction<any, any, any, any, any>
   | AllInstruction<any, any, any>;

export class PureInstruction<A> extends Async<unknown, never, A> {
   readonly _asyncTag = AsyncInstructionTag.Pure;

   constructor(readonly value: A) {
      super();
   }
}

export class DoneInstruction<E, A> extends Async<unknown, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Done;

   constructor(readonly exit: Ex.AsyncExit<E, A>) {
      super();
   }
}

export class AsksInstruction<R0, R, E, A> extends Async<R & R0, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Asks;

   constructor(readonly f: (_: R0) => Async<R, E, A>) {
      super();
   }
}

export class GiveInstruction<R, E, A> extends Async<unknown, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Give;

   constructor(readonly async: Async<R, E, A>, readonly env: R) {
      super();
   }
}

export class AllInstruction<R, E, A> extends Async<R, E, readonly A[]> {
   readonly _asyncTag = AsyncInstructionTag.All;

   constructor(readonly asyncs: readonly Async<R, E, A>[]) {
      super();
   }
}

export class SuspendInstruction<R, E, A> extends Async<R, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Suspend;

   constructor(readonly async: () => Async<R, E, A>) {
      super();
   }
}

export class PromiseInstruction<E, A> extends Async<unknown, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Promise;

   constructor(
      readonly promise: (onInterrupt: (f: () => void) => void) => Promise<A>,
      readonly onError: (u: unknown) => E
   ) {
      super();
   }
}

export class ChainInstruction<R, E, A, Q, D, B> extends Async<Q & R, D | E, B> {
   readonly _asyncTag = AsyncInstructionTag.Chain;

   constructor(readonly async: Async<R, E, A>, readonly f: (a: A) => Async<Q, D, B>) {
      super();
   }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends Async<R & R1 & R2, E1 | E2, B | C> {
   readonly _asyncTag = AsyncInstructionTag.Fold;

   constructor(
      readonly async: Async<R, E, A>,
      readonly f: (e: E) => Async<R1, E1, B>,
      readonly g: (a: A) => Async<R2, E2, C>
   ) {
      super();
   }
}

export class FinalizeInstruction<R, E, A, R1, B> extends Async<R & R1, E, A> {
   readonly _asyncTag = AsyncInstructionTag.Finalize;

   constructor(readonly async: Async<R, E, A>, readonly f: () => Async<R1, never, B>) {
      super();
   }
}
