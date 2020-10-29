import { chain_ } from "../../Task/_core";
import { checkFiberId } from "../../Task/combinators/checkFiberId";
import { makeAs } from "./makeAs";

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export const make = <E, A>() => chain_(checkFiberId(), (id) => makeAs<E, A>(id));
