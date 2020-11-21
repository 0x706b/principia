import type { Has } from "@principia/core/Has";
import * as T from "@principia/core/Task";
import type { Predicate } from "@principia/prelude";
import type { Routes } from "packages/http/build/src";

import { Context } from "../Context";
import { Combine, Route } from "./model";

export function route_<R, E, R1, E1>(
  routes: Routes<R, E>,
  f: (req: Context, next: T.Task<R, E, void>) => T.Task<R1, E1, void>
): Routes<R1, E1> {
  return new Combine(routes, new Route(f as any) as any) as any;
}

export function route<R, E, R1, E1>(
  f: (req: Context, next: T.Task<R, E, void>) => T.Task<R1, E1, void>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) => route_(routes, f);
}

export function addRoute_<R, E, R1, E1>(
  routes: Routes<R, E>,
  path: Predicate<Context>,
  f: (ctx: Context) => T.Task<R1 & Has<Context>, E1, void>
): Routes<R & R1, E | E1> {
  return route_(
    routes,
    (ctx, n): T.Task<R & R1, E | E1, void> =>
      ctx.req.url ? (path(ctx) ? T.giveService(Context)(ctx)(f(ctx)) : n) : n
  );
}

export function addRoute<R1, E1>(
  path: Predicate<Context>,
  f: (ctx: Context) => T.Task<R1 & Has<Context>, E1, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1, E | E1> {
  return (routes) => addRoute_(routes, path, f);
}

export function addRouteM_<R, E, R1, R2, E2>(
  routes: Routes<R, E>,
  path: (ctx: Context) => T.RIO<R1, boolean>,
  f: (ctx: Context) => T.Task<R2 & Has<Context>, E2, void>
): Routes<R & R1 & R2, E | E2> {
  return route_(routes, (ctx, next) =>
    T.chain_(
      path(ctx),
      (b): T.Task<R & R1 & R2, E | E2, void> => (b ? T.giveService(Context)(ctx)(f(ctx)) : next)
    )
  );
}

export function addRouteM<R1, R2, E2>(
  path: (ctx: Context) => T.RIO<R1, boolean>,
  f: (ctx: Context) => T.Task<R2 & Has<Context>, E2, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1 & R2, E | E2> {
  return (routes) => addRouteM_(routes, path, f);
}
