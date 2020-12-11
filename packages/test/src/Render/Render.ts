import type { List } from "@principia/core/List";
import * as L from "@principia/core/List";
import { flow, pipe } from "@principia/prelude";

import type { RenderParam } from "./RenderParam";

export interface RenderFunction {
  readonly _tag: "RenderFunction";
  readonly name: string;
  readonly paramLists: List<List<RenderParam>>;
  readonly toString: () => string;
}

export function fn<A>(name: string, paramLists: List<List<RenderParam>>): Render<A> {
  return {
    _tag: "RenderFunction",
    name,
    paramLists,
    toString() {
      return `${name}(${pipe(
        this.paramLists,
        L.map(
          flow(
            L.map((p) => p.toString()),
            L.join(", ")
          )
        ),
        L.join("")
      )})`;
    }
  };
}

export interface RenderInfix {
  readonly _tag: "RenderInfix";
  readonly left: RenderParam;
  readonly op: string;
  readonly right: RenderParam;
  readonly toString: () => string;
}

export function infix<A>(left: RenderParam, op: string, right: RenderParam): Render<A> {
  return {
    _tag: "RenderInfix",
    left,
    op,
    right,
    toString() {
      return `(${this.left.toString()} ${this.op} ${this.right.toString()})`;
    }
  };
}

export type Render<A> = RenderFunction | RenderInfix;
