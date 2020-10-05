import { bind_, bindTo_, flow, pipe } from "../Function";
import type * as TC from "../typeclass-index";
import { right } from "./constructors";
import type { InferRight, URI, V } from "./Either";
import { _map, ap, chain, map } from "./methods";

/*
 * -------------------------------------------
 * Do notation
 * -------------------------------------------
 */

export const bindToS: TC.BindToSF<[URI], V> = (name) => (fa) => _map(fa, bindTo_(name));

export const bindS: TC.BindSF<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         map((b) => bind_(a, name, b))
      )
   );

export const apS: TC.ApSF<[URI], V> = (name, fb) =>
   flow(
      map((a) => (b: InferRight<typeof fb>) => bind_(a, name, b)),
      ap(fb)
   );

export const letS: TC.LetSF<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         right,
         map((b) => bind_(a, name, b))
      )
   );
