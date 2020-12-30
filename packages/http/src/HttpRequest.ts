import type { HttpRouteException } from './exceptions'
import type { Method, ParsedContentType } from './utils'
import type { Byte } from '@principia/base/data/Byte'
import type { Chunk } from '@principia/io/Chunk'
import type { FIO, IO, UIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'
import type * as http from 'http'
import type { Socket } from 'net'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'
import * as Str from '@principia/base/data/String'
import * as C from '@principia/io/Chunk'
import * as T from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as S from '@principia/io/Stream'
import * as Pull from '@principia/io/Stream/Pull'
import * as Sy from '@principia/io/Sync'
import * as NS from '@principia/node/stream'
import { TLSSocket } from 'tls'
import * as Url from 'url'

import { decodeCharset, MEDIA_TYPE_REGEXP, PARAM_REGEXP, QESC_REGEXP, SyncDecoderM } from './utils'

interface CloseEvent {
  readonly _tag: 'Close'
}

interface DataEvent {
  readonly _tag: 'Data'
  readonly chunk: Buffer
}

interface EndEvent {
  readonly _tag: 'End'
}

interface ErrorEvent {
  readonly _tag: 'Error'
  readonly error: Error
}

interface PauseEvent {
  readonly _tag: 'Pause'
}

interface ReadableEvent {
  readonly _tag: 'Readble'
}

interface ResumeEvent {
  readonly _tag: 'Resume'
}

export type RequestEvent = CloseEvent | DataEvent | EndEvent | ErrorEvent | PauseEvent | ReadableEvent | ResumeEvent

export class Request {
  readonly _req: URef<http.IncomingMessage>

  private memoizedUrl: URef<E.Either<HttpRouteException, O.Option<Url.Url>>> = Ref.unsafeMake(E.right(O.none()))

  private memoizedParsedContentType: URef<O.Option<ParsedContentType>> = Ref.unsafeMake(O.none())

  eventStream: M.Managed<unknown, never, T.UIO<S.Stream<unknown, never, RequestEvent>>>

  constructor(req: http.IncomingMessage) {
    this._req = Ref.unsafeMake(req)

    this.eventStream = S.broadcastDynamic_(
      new S.Stream(
        M.gen(function* ($) {
          const queue = yield* $(Q.makeUnbounded<RequestEvent>())
          const done  = yield* $(Ref.make(false))
          yield* $(
            T.total(() => {
              req.on('close', () => {
                T.run(queue.offer({ _tag: 'Close' }))
              })
              req.on('data', (chunk) => {
                T.run(queue.offer({ _tag: 'Data', chunk }))
              })
              req.on('end', () => {
                T.run(queue.offer({ _tag: 'End' }))
              })
              req.on('pause', () => {
                T.run(queue.offer({ _tag: 'Pause' }))
              })
              req.on('error', (error) => {
                T.run(queue.offer({ _tag: 'Error', error }))
              })
              req.on('readable', () => {
                T.run(queue.offer({ _tag: 'Readble' }))
              })
              req.on('resume', () => {
                T.run(queue.offer({ _tag: 'Resume' }))
              })
            })
          )
          return T.flatMap_(done.get, (b) =>
            b
              ? Pull.end
              : T.flatMap_(
                queue.take,
                (event): T.UIO<Chunk<RequestEvent>> => {
                  if (event._tag === 'Close') {
                    return T.andThen_(done.set(true), Pull.emit(event))
                  }
                  return Pull.emit(event)
                }
              )
          )
        })
      ),
      1
    )
  }

  access<R, E, A>(f: (req: http.IncomingMessage) => IO<R, E, A>): IO<R, E, A> {
    return T.flatMap_(this._req.get, f)
  }

  get headers(): UIO<http.IncomingHttpHeaders> {
    return T.map_(this._req.get, (req) => req.headers)
  }

  get method(): UIO<Method> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.method!.toUpperCase() as any)
  }

  get urlString(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.url!)
  }

  get url(): FIO<HttpRouteException, Url.Url> {
    return T.flatMap_(
      this.memoizedUrl.get,
      E.fold(
        T.fail,
        O.fold(
          () =>
            T.flatMap_(this._req.get, (req) =>
              T.suspend(() => {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const parsedUrl = Url.parse(req.url!)
                  return T.andThen_(this.memoizedUrl.set(E.right(O.some(parsedUrl))), T.succeed(parsedUrl))
                } catch (err) {
                  const exception: HttpRouteException = {
                    _tag: 'HttpRouteException',
                    status: 400,
                    message: `Error while parsing URL\n\t${JSON.stringify(err)}`
                  }
                  return T.andThen_(this.memoizedUrl.set(E.left(exception)), T.fail(exception))
                }
              })
            ),
          T.succeed
        )
      )
    )
  }

  getHeader(name: Exclude<keyof http.IncomingHttpHeaders, 'set-cookie'>): UIO<O.Option<string>>
  getHeader(name: keyof http.IncomingHttpHeaders): UIO<O.Option<string | string[]>> {
    return T.map_(this._req.get, (req) => O.fromNullable(req.headers[name]))
  }

  get socket(): UIO<Socket | TLSSocket> {
    return T.map_(this._req.get, (req) => req.socket)
  }

  get protocol(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const previousThis = this
    return T.gen(function* ($) {
      const socket = yield* $(previousThis.socket)
      if (socket instanceof TLSSocket && socket.encrypted) {
        return 'https'
      } else {
        return 'http'
      }
    })
  }

  get secure(): UIO<boolean> {
    return T.map_(this.protocol, (p) => p === 'https')
  }

  get ip(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this.socket, (s) => s.remoteAddress!)
  }

  get stream(): S.Stream<unknown, NS.ReadableError, Byte> {
    return S.chain_(S.fromEffect(this._req.get), (req) => NS.streamFromReadable(() => req))
  }

  get parsedContentType(): UIO<O.Option<ParsedContentType>> {
    return pipe(
      this.memoizedParsedContentType.get,
      T.flatMap(
        O.fold(
          () =>
            pipe(
              this.access((req) => T.succeed(O.fromNullable(req.headers['content-type']))),
              T.IOOption.flatMap((raw) =>
                T.total(() => {
                  /*
                   * The following code is adapted from
                   * https://github.com/jshttp/content-type/blob/master/index.js
                   */
                  let index  = raw.indexOf(';')
                  const type = index !== -1 ? raw.substr(0, index).trim() : raw.trim()
                  if (!MEDIA_TYPE_REGEXP.test(type)) {
                    return O.none()
                  }
                  const obj: ParsedContentType = {
                    type: type.toLowerCase(),
                    parameters: {}
                  }
                  if (index !== -1) {
                    let key: string
                    let match: RegExpExecArray | null
                    let value: string

                    PARAM_REGEXP.lastIndex = index

                    while ((match = PARAM_REGEXP.exec(raw))) {
                      if (match.index !== index) {
                        return O.none()
                      }

                      index += match[0].length
                      key    = match[1].toLowerCase()
                      value  = match[2]

                      if (value[0] === '"') {
                        value = value.substr(1, value.length - 2).replace(QESC_REGEXP, '$1')
                      }

                      obj.parameters[key] = value
                    }
                    if (index !== raw.length) {
                      return O.none()
                    }
                  }

                  return O.some(obj)
                  /*
                   * End of adaptation
                   */
                })
              )
            ),
          (pct) => T.succeed(O.some(pct))
        )
      )
    )
  }

  get rawBody(): FIO<HttpRouteException, string> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const prevThis = this
    return T.gen(function* ($) {
      const contentType = yield* $(prevThis.parsedContentType)
      const charset     = yield* $(
        pipe(
          contentType,
          O.flatMap((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          decodeCharset(SyncDecoderM).decode,
          Sy.catchAll((_) =>
            Sy.fail<HttpRouteException>({
              _tag: 'HttpRouteException',
              status: 415,
              message: 'Invalid charset'
            })
          )
        )
      )

      return yield* $(
        pipe(
          prevThis.stream,
          S.runCollect,
          T.map(flow(C.asBuffer, (b) => b.toString(charset))),
          T.catchAll((_) =>
            T.fail<HttpRouteException>({
              _tag: 'HttpRouteException',
              status: 500,
              message: 'Failed to read body stream'
            })
          )
        )
      )
    })
  }

  get bodyJson(): FIO<HttpRouteException, Record<string, any>> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const prevThis = this
    return T.gen(function* ($) {
      const contentType = yield* $(prevThis.parsedContentType)
      const charset     = yield* $(
        pipe(
          contentType,
          O.flatMap((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset(SyncDecoderM).decode,
          Sy.catchAll((_) =>
            Sy.fail<HttpRouteException>({
              _tag: 'HttpRouteException',
              status: 415,
              message: 'Invalid charset'
            })
          )
        )
      )

      if (!Str.startsWith_(charset, 'utf-')) {
        return yield* $(
          T.fail<HttpRouteException>({
            _tag: 'HttpRouteException',
            status: 415,
            message: `Unsupported charset: ${charset.toUpperCase()}`
          })
        )
      }

      return yield* $(
        pipe(
          prevThis.stream,
          S.runCollect,
          T.map(flow(C.asBuffer, (b) => b.toString(charset))),
          T.catchAll((_) =>
            T.fail<HttpRouteException>({
              _tag: 'HttpRouteException',
              status: 500,
              message: 'Failed to read body stream'
            })
          ),
          T.flatMap((raw) =>
            T.partial_(
              () => JSON.parse(raw),
              (_) =>
                <HttpRouteException>{
                  _tag: 'HttpRouteException',
                  status: 500,
                  message: 'Failed to parse body JSON'
                }
            )
          )
        )
      )
    })
  }
}
