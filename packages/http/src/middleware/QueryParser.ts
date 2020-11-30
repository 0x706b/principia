import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as I from "@principia/core/IO";
import * as O from "@principia/core/Option";
import { pipe } from "@principia/prelude";
import type { Erase } from "@principia/prelude/Utils";
import * as qs from "querystring";

import type { HttpRouteException } from "../exceptions";
import * as Http from "../Router";

export interface UrlQuery {
  query: O.Option<qs.ParsedUrlQuery>;
}

export const UrlQuery = tag<UrlQuery>();

export function withQueryParser<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<Erase<R, Has<UrlQuery>>, E | HttpRouteException> {
  return Http.addMiddleware_(routes, (cont) => ({ req, res }, next) => {
    return I.gen(function* ($) {
      const url = yield* $(req.url);
      const query = pipe(
        O.fromNullable(url.query),
        O.map((q) => (typeof q === "string" ? qs.parse(q) : q))
      );
      yield* $(I.giveService(UrlQuery)({ query })(cont({ req, res }, next)));
    });
  });
}
