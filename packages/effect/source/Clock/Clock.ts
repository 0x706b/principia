/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import * as T from "../Effect/core";
import { asyncInterrupt } from "../Effect/functions/interrupt";
import { accessService, accessServiceM } from "../Effect/functions/service";
import type { HasTag } from "../Has";
import { has } from "../Has";

//
// Clock Definition
//
export const URI = Symbol();

export abstract class Clock {
   readonly _tag!: typeof URI;

   abstract readonly currentTime: T.UIO<number>;
   abstract readonly sleep: (ms: number) => T.UIO<void>;
}

//
// Has Clock
//
export const HasClock = has(Clock);

export type HasClock = HasTag<typeof HasClock>;

//
// Live Clock Implementation
//
export class LiveClock extends Clock {
   currentTime: T.UIO<number> = T.total(() => new Date().getTime());

   sleep: (ms: number) => T.UIO<void> = (ms) =>
      asyncInterrupt((cb) => {
         const timeout = setTimeout(() => {
            cb(T.unit);
         }, ms);

         return T.total(() => {
            clearTimeout(timeout);
         });
      });
}

//
// Proxy Clock Implementation
//
export class ProxyClock extends Clock {
   constructor(readonly currentTime: T.UIO<number>, readonly sleep: (ms: number) => T.UIO<void>) {
      super();
   }
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime = accessServiceM(HasClock)((_) => _.currentTime);

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => accessServiceM(HasClock)((_) => _.sleep(ms));

/**
 * Access clock from environment
 */
export const withClockM = accessServiceM(HasClock);

/**
 * Access clock from environment
 */
export const withClock = accessService(HasClock);
