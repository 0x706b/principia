import type { Has } from '@principia/base/Has'
import type ChalkType from 'chalk'

import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import { Clock } from '@principia/io/Clock'
import { Console, ConsoleTag } from '@principia/io/Console'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'
import * as fs from '@principia/node/fs'
import { formatISO9075, getMilliseconds } from 'date-fns'
import stripAnsi from 'strip-ansi'

export type ChalkFn = (c: typeof ChalkType) => string

export type LogFn = (m: ChalkFn) => I.URIO<Has<Clock>, void>

export type ColorMap = Record<LogLevel, ChalkType.Chalk>

export interface Logger {
  readonly debug: LogFn
  readonly error: LogFn
  readonly info: LogFn
  readonly warning: LogFn
}
export const Logger = tag<Logger>()

export interface Chalk {
  chalk: typeof ChalkType
}
export const ChalkTag = tag<Chalk>()

export type LogLevel = keyof Logger

const severity: Record<LogLevel, number> = {
  debug: 3,
  info: 2,
  warning: 1,
  error: 0
}

export interface LoggerOptions {
  path: string
  level?: LogLevel
  theme?: I.URIO<Has<Chalk>, ColorMap>
}

export type LoggerConfig = {
  [K in keyof LoggerOptions]-?: NonNullable<LoggerOptions[K]>
}
export const LoggerConfigTag = tag<LoggerConfig>()

export function loggerConfig(config: LoggerOptions) {
  return L.succeed(LoggerConfigTag)({
    path: config.path,
    level: config.level ?? 'error',
    theme:
      config.theme ??
      I.asksService(ChalkTag)(({ chalk }) => ({
        debug: chalk.gray,
        info: chalk.blue,
        warning: chalk.yellow,
        error: chalk.red
      }))
  })
}

export interface LogEntry {
  level: LogLevel
  message: string
}
const LogEntryTag = tag<LogEntry>()

const timestamp = I.map_(
  Clock.currentTime,
  (ms) => `${formatISO9075(ms)}.${getMilliseconds(ms).toString().padStart(3, '0')}`
)

const showConsoleLogEntry = I.gen(function* (_) {
  const config    = yield* _(LoggerConfigTag)
  const { chalk } = yield* _(ChalkTag)
  const time      = yield* _(timestamp)
  const entry     = yield* _(LogEntryTag)
  const theme     = yield* _(config.theme)
  return `[${theme[entry.level](entry.level.toUpperCase())}] ${entry.message} ${chalk.gray.dim(time)}`
})

const showFileLogEntry = I.gen(function* (_) {
  const time  = yield* _(timestamp)
  const entry = yield* _(LogEntryTag)
  return `${time} [${entry.level.toUpperCase()}] ${stripAnsi(entry.message)}\n`
})

const logToConsole = I.gen(function* (_) {
  const entry = yield* _(showConsoleLogEntry)
  return yield* _(Console.putStrLn(entry))
})

const logToFile = I.gen(function* (_) {
  const show   = yield* _(showFileLogEntry)
  const config = yield* _(LoggerConfigTag)
  return yield* _(fs.appendFile(config.path, show))
})

function _log(message: ChalkFn, level: LogLevel) {
  return I.gen(function* (_) {
    const { level: configLevel, path } = yield* _(LoggerConfigTag)

    const { chalk }       = yield* _(ChalkTag)
    const entry: LogEntry = {
      message: message(chalk),
      level
    }

    yield* _(
      pipe(
        logToConsole,
        I.apr(logToFile),
        I.catchAll((error) => Console.putStrLn(`Error when writing to path ${path}\n${error}`)),
        I.when(() => severity[configLevel] >= severity[level]),
        I.giveService(LogEntryTag)(entry)
      )
    )
  })
}

export const LiveLogger = L.create(Logger).fromEffect(
  I.asksServices({ config: LoggerConfigTag, console: ConsoleTag, chalk: ChalkTag })(
    ({ config, console, chalk }): Logger => ({
      debug: (m) =>
        pipe(
          _log(m, 'debug'),
          I.giveService(ConsoleTag)(console),
          I.giveService(LoggerConfigTag)(config),
          I.giveService(ChalkTag)(chalk)
        ),
      info: (m) =>
        pipe(
          _log(m, 'info'),
          I.giveService(ConsoleTag)(console),
          I.giveService(LoggerConfigTag)(config),
          I.giveService(ChalkTag)(chalk)
        ),
      warning: (m) =>
        pipe(
          _log(m, 'warning'),
          I.giveService(ConsoleTag)(console),
          I.giveService(LoggerConfigTag)(config),
          I.giveService(ChalkTag)(chalk)
        ),
      error: (m) =>
        pipe(
          _log(m, 'error'),
          I.giveService(ConsoleTag)(console),
          I.giveService(LoggerConfigTag)(config),
          I.giveService(ChalkTag)(chalk)
        )
    })
  )
)

export const { debug, info, warning, error } = I.deriveLifted(Logger)(['debug', 'info', 'warning', 'error'], [], [])
