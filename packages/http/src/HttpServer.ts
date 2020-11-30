import { pipe } from "@principia/core/Function";
import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as I from "@principia/core/IO";
import * as Exit from "@principia/core/IO/Exit";
import * as L from "@principia/core/Layer";
import * as M from "@principia/core/Managed";
import * as Q from "@principia/core/Queue";
import { intersect } from "@principia/core/Utils";
import * as http from "http";

import type { Context } from "./Context";
import { Request, Response } from "./Context";

export interface ServerConfig {
  port: number;
  hostName: string;
}

export const ServerConfig = tag<ServerConfig>();

export function serverConfig(config: ServerConfig): L.Layer<unknown, never, Has<ServerConfig>> {
  return L.create(ServerConfig).pure(config);
}

export interface Server {
  server: http.Server;
}

export const Server = tag<Server>();

export interface RequestQueue {
  queue: Q.Queue<Context>;
}

export const RequestQueue = tag<RequestQueue>();

export const Http = L.fromRawManaged(
  M.gen(function* ($) {
    const queue = yield* $(Q.makeUnbounded<Context>());
    const server = yield* $(
      I.total(() =>
        http.createServer((req, res) => {
          I.run(queue.offer({ req: new Request(req), res: new Response(res) }));
        })
      )
    );
    const config = yield* $(ServerConfig);

    const startServer = I.async<unknown, never, void>((resolve) => {
      function clean() {
        server.removeListener("error", onError);
        server.removeListener("listening", onDone);
      }

      function onError(error: Error) {
        clean();
        resolve(I.die(error));
      }

      function onDone() {
        clean();
        resolve(I.unit());
      }

      server.listen(config.port, config.hostName);

      server.once("error", onError);
      server.once("listening", onDone);
    });

    const managedServer = pipe(
      M.make_(startServer, () =>
        pipe(
          I.async<unknown, never, void>((resolve) => {
            server.close((err) => (err ? resolve(I.die(err)) : resolve(I.unit())));
          }),
          I.result,
          I.zip(I.result(queue.shutdown)),
          I.chain(([ea, eb]) => I.done(Exit.zip_(ea, eb)))
        )
      ),
      M.map(() => intersect(Server.of({ server }), RequestQueue.of({ queue })))
    );

    return yield* $(managedServer);
  })
);
