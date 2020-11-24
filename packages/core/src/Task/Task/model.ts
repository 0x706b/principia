import type { V as Variance } from "@principia/prelude/HKT";

import type { Option } from "../../Option";
import type { XPure } from "../../XPure";
import type { Cause } from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Executor } from "../Fiber/executor";
import type { FiberId } from "../Fiber/FiberId";
import type { Fiber, FiberDescriptor, InterruptStatus } from "../Fiber/model";
import type { FiberRef } from "../FiberRef/model";
import type { Scope } from "../Scope";
import type { Supervisor } from "../Supervisor";
import { _A, _E, _I, _R, _U, TaskInstructionTag } from "./constants";

export { _A, _E, _I, _R, _U, TaskInstructionTag } from "./constants";

/*
 * -------------------------------------------
 * Task Model
 * -------------------------------------------
 */

export const URI = "Task";

export type URI = typeof URI;

export abstract class Task<R, E, A> {
  readonly [_U]: URI;
  readonly [_E]: () => E;
  readonly [_A]: () => A;
  readonly [_R]: (_: R) => void;

  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  get [_I](): Instruction {
    return this as any;
  }
}

export type Instruction =
  | ChainInstruction<any, any, any, any, any, any>
  | SucceedInstruction<any>
  | PartialInstruction<any, any>
  | TotalInstruction<any>
  | AsyncInstruction<any, any, any>
  | FoldInstruction<any, any, any, any, any, any, any, any, any>
  | ForkInstruction<any, any, any>
  | SetInterruptInstruction<any, any, any>
  | GetInterruptInstruction<any, any, any>
  | FailInstruction<any>
  | CheckDescriptorInstruction<any, any, any>
  | YieldInstruction
  | ReadInstruction<any, any, any, any>
  | GiveInstruction<any, any, any>
  | SuspendInstruction<any, any, any>
  | SuspendPartialInstruction<any, any, any, any>
  | NewFiberRefInstruction<any>
  | ModifyFiberRefInstruction<any, any>
  | RaceInstruction<any, any, any, any, any, any, any, any, any, any, any, any>
  | SuperviseInstruction<any, any, any>
  | GetForkScopeInstruction<any, any, any>
  | OverrideForkScopeInstruction<any, any, any>
  | XPure<unknown, never, any, any, any>
  | Integration<any, any, any>;

export type V = Variance<"E", "+"> & Variance<"R", "-">;

export type IO<A> = Task<unknown, never, A>;
export type RIO<R, A> = Task<R, never, A>;
export type EIO<E, A> = Task<unknown, E, A>;

export type Canceler<R> = RIO<R, void>;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Task<R, E, A>;
  }
}

/*
 * -------------------------------------------
 * Task Instructions
 * -------------------------------------------
 */

export class ChainInstruction<R, R1, E, E1, A, A1> extends Task<R & R1, E | E1, A1> {
  readonly _tag = TaskInstructionTag.Chain;
  constructor(readonly task: Task<R, E, A>, readonly f: (a: A) => Task<R1, E1, A1>) {
    super();
  }
}

export class SucceedInstruction<A> extends Task<unknown, never, A> {
  readonly _tag = TaskInstructionTag.Succeed;
  constructor(readonly value: A) {
    super();
  }
}

export class PartialInstruction<E, A> extends Task<unknown, E, A> {
  readonly _tag = TaskInstructionTag.Partial;
  constructor(readonly thunk: () => A, readonly onThrow: (u: unknown) => E) {
    super();
  }
}

export class TotalInstruction<A> extends Task<unknown, never, A> {
  readonly _tag = TaskInstructionTag.Total;
  constructor(readonly thunk: () => A) {
    super();
  }
}

export class AsyncInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.Async;
  constructor(
    readonly register: (f: (_: Task<R, E, A>) => void) => Option<Task<R, E, A>>,
    readonly blockingOn: ReadonlyArray<FiberId>
  ) {
    super();
  }
}

export class FoldInstruction<R, E, A, R1, E1, B, R2, E2, C> extends Task<
  R & R1 & R2,
  E1 | E2,
  B | C
> {
  readonly _tag = TaskInstructionTag.Fold;

  constructor(
    readonly task: Task<R, E, A>,
    readonly onFailure: (cause: Cause<E>) => Task<R1, E1, B>,
    readonly onSuccess: (a: A) => Task<R2, E2, C>
  ) {
    super();
  }

  apply(v: A): Task<R & R1 & R2, E1 | E2, B | C> {
    return this.onSuccess(v);
  }
}

export class ForkInstruction<R, E, A> extends Task<R, never, Executor<E, A>> {
  readonly _tag = TaskInstructionTag.Fork;

  constructor(readonly task: Task<R, E, A>, readonly scope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export class FailInstruction<E> extends Task<unknown, E, never> {
  readonly _tag = TaskInstructionTag.Fail;

  constructor(readonly cause: Cause<E>) {
    super();
  }
}

export class YieldInstruction extends Task<unknown, never, void> {
  readonly _tag = TaskInstructionTag.Yield;

  constructor() {
    super();
  }
}

export class ReadInstruction<R0, R, E, A> extends Task<R & R0, E, A> {
  readonly _tag = TaskInstructionTag.Read;

  constructor(readonly f: (_: R0) => Task<R, E, A>) {
    super();
  }
}

export class GiveInstruction<R, E, A> extends Task<unknown, E, A> {
  readonly _tag = TaskInstructionTag.Give;

  constructor(readonly task: Task<R, E, A>, readonly env: R) {
    super();
  }
}

export class SuspendInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.Suspend;

  constructor(readonly factory: () => Task<R, E, A>) {
    super();
  }
}

export class RaceInstruction<R, E, A, R1, E1, A1, R2, E2, A2, R3, E3, A3> extends Task<
  R & R1 & R2 & R3,
  E2 | E3,
  A2 | A3
> {
  readonly _tag = "Race";

  constructor(
    readonly left: Task<R, E, A>,
    readonly right: Task<R1, E1, A1>,
    readonly leftWins: (exit: Exit<E, A>, fiber: Fiber<E1, A1>) => Task<R2, E2, A2>,
    readonly rightWins: (exit: Exit<E1, A1>, fiber: Fiber<E, A>) => Task<R3, E3, A3>,
    readonly scope: Option<Scope<Exit<any, any>>>
  ) {
    super();
  }
}

export class SetInterruptInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.SetInterrupt;

  constructor(readonly task: Task<R, E, A>, readonly flag: InterruptStatus) {
    super();
  }
}

export class GetInterruptInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.GetInterrupt;

  constructor(readonly f: (_: InterruptStatus) => Task<R, E, A>) {
    super();
  }
}

export class CheckDescriptorInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.CheckDescriptor;

  constructor(readonly f: (_: FiberDescriptor) => Task<R, E, A>) {
    super();
  }
}

export class SuperviseInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.Supervise;

  constructor(readonly task: Task<R, E, A>, readonly supervisor: Supervisor<any>) {
    super();
  }
}

export class SuspendPartialInstruction<R, E, A, E2> extends Task<R, E | E2, A> {
  readonly _tag = TaskInstructionTag.SuspendPartial;

  constructor(readonly factory: () => Task<R, E, A>, readonly onThrow: (u: unknown) => E2) {
    super();
  }
}

export class NewFiberRefInstruction<A> extends Task<unknown, never, FiberRef<A>> {
  readonly _tag = TaskInstructionTag.NewFiberRef;

  constructor(
    readonly initial: A,
    readonly onFork: (a: A) => A,
    readonly onJoin: (a: A, a2: A) => A
  ) {
    super();
  }
}

export class ModifyFiberRefInstruction<A, B> extends Task<unknown, never, B> {
  readonly _tag = TaskInstructionTag.ModifyFiberRef;

  constructor(readonly fiberRef: FiberRef<A>, readonly f: (a: A) => [B, A]) {
    super();
  }
}

export class GetForkScopeInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.GetForkScope;

  constructor(readonly f: (_: Scope<Exit<any, any>>) => Task<R, E, A>) {
    super();
  }
}

export class OverrideForkScopeInstruction<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.OverrideForkScope;

  constructor(readonly task: Task<R, E, A>, readonly forkScope: Option<Scope<Exit<any, any>>>) {
    super();
  }
}

export const integrationNotImplemented = new FailInstruction({
  _tag: "Die",
  value: new Error("Integration not implemented or unsupported")
});

export abstract class Integration<R, E, A> extends Task<R, E, A> {
  readonly _tag = TaskInstructionTag.Integration;
  readonly _S1!: (_: unknown) => void;
  readonly _S2!: () => never;

  readonly [_U]!: URI;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A;
  readonly [_R]!: (_: R) => void;

  get [_I](): Instruction {
    return integrationNotImplemented;
  }
}
