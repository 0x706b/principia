import type { HttpException } from '../src/HttpException'
import type { Has } from '@principia/base/Has'
import type { Clock } from '@principia/io/Clock'

import '@principia/base/unsafe/Operators'

import { Console, NodeConsole, putStrLn } from '@principia/io/Console'
import * as I from '@principia/io/IO'

import * as Http from '../src/HttpServer'
import * as Routes from '../src/Route'
import * as Status from '../src/StatusCode'
import { ContentType } from '../src/utils'

import { pathToRegexp } from 'path-to-regexp'

const r1 = Routes.route('GET', '/home', ({ response }) =>
  I.gen(function* (_) {
    yield* _(response.status(Status.Ok))
    yield* _(response.set({ 'content-type': ContentType.TEXT_PLAIN }))
    yield* _(response.write('Hello World!'))
    return yield* _(response.end())
  })
)

const server = Http.HttpServer({ host: 'localhost', port: 4000 })

function RequestTimer<R, E>(routes: Routes.Routes<R, E>) {
  return Routes.middleware_(routes, (cont) => (conn, next) =>
    I.timed(cont(conn, next))['|>'](
      I.flatMap(([n, r]) => putStrLn(`Request took ${n}ms to execute`)['|>'](I.as(() => r)))
    )
  )
}

function RequestURLLogger<R, E>(routes: Routes.Routes<R, E>) {
  return Routes.middleware_(routes, (cont) => (conn, next) =>
    conn.request.url['|>'](I.flatMap((url) => putStrLn(url.toJSON())['|>'](I.andThen(cont(conn, next)))))
  )
}

const routes = Routes.empty['|>'](r1)['|>'](RequestTimer)['|>'](RequestURLLogger)['|>'](Routes.HttpExceptionHandler)

Routes.drain(routes)['|>'](I.giveLayer(server))['|>'](I.giveLayer(NodeConsole.live))['|>'](I.run)
