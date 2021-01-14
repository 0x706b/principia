import type { ResolverF, ScalarFunctions } from '../schema'

import * as E from '@principia/base/Either'
import { identity, pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import { HttpConnection } from '@principia/http/HttpConnection'
import { HttpRequest } from '@principia/http/HttpRequest'
import { HttpResponse } from '@principia/http/HttpResponse'
import * as T from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as RefM from '@principia/io/IORefM'
import * as Sy from '@principia/io/Sync'
import { Context } from '@principia/koa'
import { GraphQLScalarType } from 'graphql'

const entries = <A>(_: A): ReadonlyArray<[keyof A, A[keyof A]]> => Object.entries(_) as any

export function transformResolvers<Ctx>(
  res: Record<string, Record<string, ResolverF<any, any, Ctx, any, any, any>>>,
  env: any
) {
  const toBind = {}
  for (const [mut_typeName, fields] of entries(res)) {
    const resolvers = {}
    for (const [mut_fieldName, resolver] of entries(fields)) {
      if (typeof resolver === 'function') {
        (resolvers as any)[mut_fieldName] = (root: any, args: any, ctx: any) => {
          return T.runPromise(
            T.gen(function* (_) {
              const reqRef  = yield* _(Ref.make(ctx.req))
              const resRef  = yield* _(RefM.make(ctx.res))
              const context = yield* _(
                T.effectTotal(() => ({
                  engine: ctx,
                  conn: new HttpConnection(reqRef, resRef)
                }))
              )
              const result  = yield* _(
                pipe(
                  (resolver as any)(O.fromNullable(root), args || {}, context),
                  T.give({ ...(env as any) }),
                  T.giveService(Context)(context)
                )
              )
              return result
            })
          )
        }
      } else {
        (resolvers as any)[mut_fieldName] = {
          subscribe: (root: any, args: any, ctx: any) => {
            return T.runPromise(
              T.gen(function* (_) {
                const reqRef  = yield* _(Ref.make(ctx.req))
                const resRef  = yield* _(RefM.make(ctx.res))
                const context = yield* _(
                  T.effectTotal(() => ({
                    engine: ctx,
                    conn: new HttpConnection(reqRef, resRef)
                  }))
                )
                const result  = yield* _(
                  pipe(
                    (resolver as any).subscribe(O.fromNullable(root), args || {}, context),
                    T.give({ ...(env as any) }),
                    T.giveService(Context)(context)
                  )
                )
                return result
              })
            )
          }
        }

        if ((resolver as any).resolve) {
          (resolvers as any)[mut_fieldName].resolve = (x: any, _: any, ctx: any) => {
            return T.runPromise(
              T.gen(function* (_) {
                const reqRef  = yield* _(Ref.make(ctx.req))
                const resRef  = yield* _(RefM.make(ctx.res))
                const context = yield* _(
                  T.effectTotal(() => ({
                    engine: ctx,
                    conn: new HttpConnection(reqRef, resRef)
                  }))
                )
                const result  = yield* _(
                  pipe(
                    (resolver as any).resolve(x, context),
                    T.give({ ...(env as any) }),
                    T.giveService(Context)(context)
                  )
                )
                return result
              })
            )
          }
        }
      }
    }
    (toBind as any)[mut_typeName] = resolvers
  }
  return toBind
}

export function transformScalarResolvers(
  scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>,
  env: any
) {
  const toBind = {}
  for (const [mut_typeName, resolver] of entries(scalars)) {
    (toBind as any)[mut_typeName] = new GraphQLScalarType({
      name: resolver.name,
      parseLiteral: (u) =>
        pipe(
          resolver.functions.parseLiteral(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        ),
      parseValue: (u) =>
        pipe(
          resolver.functions.parseValue(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        ),
      serialize: (u) =>
        pipe(
          resolver.functions.serialize(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        )
    })
  }
  return toBind
}
