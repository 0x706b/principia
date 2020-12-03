import "@principia/prelude/Operators";

import { tag } from "@principia/core/Has";
import * as T from "@principia/core/IO";
import * as M from "@principia/core/Managed";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";
import * as S from "@principia/core/Stream";
import * as NFS from "@principia/node/fs";
import { flow } from "@principia/prelude";
import * as path from "path";

import * as H from "../src";
import { withHttpRouteExceptionHandler } from "../src/middleware/HttpRouteExceptionHandler";
import { UrlQuery, withQueryParser } from "../src/middleware/QueryParser";

interface Env {
  id: string;
}
const Env = tag<Env>();

const withEnv = H.addRouteM(H.matchUrl(/\/env/), ({ res }) =>
  T.gen(function* ($) {
    const { id } = yield* $(Env);
    yield* $(res.status(H.Status.OK));
    yield* $(res.write(id));
    yield* $(res.end());
  })
);

const withImage = H.addRouteM(H.matchUrl(/\/(image)(\?.*)?/), ({ req, res }) =>
  T.gen(function* ($) {
    const { query } = yield* $(UrlQuery);
    const name = query["|>"](O.chain(R.lookup("image")))["|>"](O.getOrElse(() => "image"));
    const filePath = path.resolve(process.cwd(), "test", `${name}.jpg`);
    yield* $(
      M.use_(req.eventStream, (s) =>
        T.chain_(
          s,
          S.foreach((event) => T.total(() => console.log(event)))
        )
      )["|>"](T.fork)
    );
    yield* $(
      NFS.stat(filePath)
        ["|>"](
          T.mapError(
            (_) =>
              <H.HttpRouteException>{
                _tag: "HttpRouteException",
                status: 400,
                message: `Bad filename: ${filePath}`
              }
          )
        )
        ["|>"](
          T.chain((stats) =>
            stats.isFile()
              ? T.unit()
              : T.fail<H.HttpRouteException>({
                  _tag: "HttpRouteException",
                  status: 400,
                  message: `Specified path is not a file`
                })
          )
        )
    );
    const stream = NFS.createReadStream(path.resolve(process.cwd(), "test", `${name}.jpg`));

    return yield* $(
      res
        .status(H.Status.OK)
        ["|>"](T.andThen(res.set({ "Content-Type": H.ContentType.IMAGE_JPEG })))
        ["|>"](T.andThen(res.pipeFrom(stream)))
        ["|>"](T.andThen(res.end()))
    );
  })
);

const withHome = H.addRouteM(H.matchUrl(/(\/(?!.))/), ({ res }) =>
  res
    .status(H.Status.OK)
    ["|>"](T.andThen(res.write("Hello, world!")))
    ["|>"](T.andThen(res.end()))
);

const withQuery = H.addRouteM(H.matchUrl(/\/(query)(\?.*)?/), ({ res }) =>
  T.gen(function* ($) {
    const { query } = yield* $(UrlQuery);
    yield* $(res.status(H.Status.OK));
    yield* $(res.write(JSON.stringify(query)));
    yield* $(res.end());
  })
);

const withException = H.addRouteM(H.matchUrl(/\/exception/), () =>
  T.fail<H.HttpRouteException>({
    _tag: "HttpRouteException",
    status: 400,
    message: "an exception was thrown"
  })
);

const withCatchAll = H.addRouteM(H.matchUrl(/(.*)/), ({ res }) =>
  res
    .status(H.Status.NotFound)
    ["|>"](T.andThen(res.write("404")))
    ["|>"](T.andThen(res.end()))
);

const withAll = flow(
  withCatchAll,
  withHome,
  withQuery,
  withException,
  withEnv,
  withImage,
  withQueryParser,
  withHttpRouteExceptionHandler
);

const ServerConfig = H.serverConfig({
  port: 4000,
  hostName: "0.0.0.0"
});

const Server = H.Http["<<<"](ServerConfig);

H.empty["|>"](withAll)
  ["|>"](H.drain)
  ["|>"](T.giveLayer(Server))
  ["|>"](T.giveService(Env)({ id: "this is an actual real user id" }))
  ["|>"](T.runMain);
