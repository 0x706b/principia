import { chain_ } from "../../Task/_core";
import { fiberId } from "../../Task/combinators/fiberId";
import { makeAs } from "./makeAs";

/**
 * Makes a new promise to be completed by the fiber creating the promise.
 */
export function make<E, A>() {
  return chain_(fiberId(), (id) => makeAs<E, A>(id));
}
