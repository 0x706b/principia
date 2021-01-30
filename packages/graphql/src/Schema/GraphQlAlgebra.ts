import type { EvaluateConfig, InputTypeConfig, OutputTypeConfig } from './Config'
import type { Effect, Query, Resolver, Subscription } from './Resolver'
import type { AnyField, GQLInputObject, GQLObject, GQLUnion, InputRecord } from './Types'
import type { TypeofInputRecord } from './Utils'
import type { _A, _E, _R } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'
import { memoize } from '@principia/model/utils'

import {
  createInputValueDefinitionNode,
  createUnnamedFieldDefinitionNode,
  createUnnamedInputValueDefinitionNode,
  getTypeName
} from './AST'
import { GQLField, GQLInputValue, GQLObjectField, GQLScalarField, GQLSubscriptionField, GQLUnionField } from './Types'

export const GqlFieldURI = 'graphql/algebra/field'
export type GqlFieldURI = typeof GqlFieldURI

export const GqlInputURI = 'graphql/algebra/input'
export type GqlInputURI = typeof GqlInputURI

declare module './HKT' {
  interface AURItoFieldAlgebra<Root, Ctx> {
    readonly [GqlFieldURI]: GqlField<Root, Ctx>
  }
  interface AURItoInputAlgebra {
    readonly [GqlInputURI]: GqlInput
  }
}

export interface GqlField<Root, Ctx> {
  readonly boolean: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, boolean>>
  readonly field: <X extends AnyField<Ctx>, Args extends InputRecord, R, E>(def: {
    type: X
    resolve: Resolver<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<X>>
    args?: Args
  }) => GQLField<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<X>>
  readonly float: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly id: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly int: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly string: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, string>>
  readonly union: <X extends GQLUnion<any, any, Ctx, any>, C extends OutputTypeConfig>(
    type: () => X,
    config?: C
  ) => GQLUnionField<Ctx, EvaluateConfig<C, _A<X>>>
  readonly object: <C extends OutputTypeConfig, X extends GQLObject<any, any, Ctx, any, any, any>>(
    type: () => X,
    config?: C
  ) => GQLObjectField<X['_Root'], Ctx, _R<X>, _E<X>, EvaluateConfig<C, _A<X>>>
}

export interface GqlInput {
  readonly booleanArg: <C extends InputTypeConfig<EvaluateConfig<C, boolean>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, boolean>>
  readonly floatArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, number>>
  readonly idArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, string>>
  readonly intArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, number>>
  readonly objectArg: <X extends GQLInputObject<any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    type: () => X,
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, _A<X>>>
  readonly stringArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, string>>
}

export interface GqlSubscription<Ctx> {
  readonly subscription: <X extends AnyField<Ctx>, Args extends InputRecord, SR, SE, SA, RR, RE>(def: {
    type: X
    resolve: Subscription<{}, TypeofInputRecord<Args>, SR, SE, SA, RR, RE, _A<X>>
    args?: Args
  }) => GQLSubscriptionField<SR & RR, _A<X>>
}

export const GqlSubscriptionInterpreter = memoize<void, GqlSubscription<any>>(() => ({
  subscription: ({ args, type, resolve }) =>
    new GQLSubscriptionField(
      createUnnamedFieldDefinitionNode({
        description: type.config.description,
        list: type.config.list,
        nullable: type.config.nullable,
        typeName: getTypeName(type.ast),
        arguments: args
          ? R.ifoldl_(args, A.empty(), (b, k, a) => [
              ...b,
              createInputValueDefinitionNode({
                defaultValue: a.config.defaultValue,
                description: a.config.description,
                list: a.config.list,
                name: k,
                nullable: a.config.nullable,
                typeName: getTypeName(a.ast)
              })
            ])
          : []
      }),
      resolve
    )
}))

export const GqlFieldInterpreter = memoize<void, GqlField<any, any>>(
  (): GqlField<any, any> => ({
    boolean: (config) =>
      new GQLScalarField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Boolean'
        }),
        config ?? {}
      ),

    field: ({ args, resolve, type }) =>
      new GQLField(
        createUnnamedFieldDefinitionNode({
          arguments: args
            ? R.ifoldl_(args, A.empty(), (b, k, a) => [
                ...b,
                createInputValueDefinitionNode({
                  defaultValue: a.config.defaultValue,
                  description: a.config.description,
                  list: a.config.list,
                  name: k,
                  nullable: a.config.nullable,
                  typeName: getTypeName(a.ast)
                })
              ])
            : [],
          description: type.config.description,
          list: type.config.list,
          nullable: type.config.nullable,
          typeName: getTypeName(type.ast)
        }),
        resolve
      ),

    union: (type, config) =>
      new GQLUnionField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: type().name
        }),
        config ?? {}
      ),

    float: (config) =>
      new GQLScalarField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Float'
        }),
        config ?? {}
      ),

    id: (config) =>
      new GQLScalarField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'ID'
        }),
        config ?? {}
      ),

    int: (config) =>
      new GQLScalarField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Int'
        }),
        config ?? {}
      ),

    string: (config) =>
      new GQLScalarField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'String'
        }),
        config ?? {}
      ),

    object: (type, config) =>
      new GQLObjectField(
        createUnnamedFieldDefinitionNode({
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: type().name
        }),
        config ?? {}
      )
  })
)

export const GqlInputInterpreter = memoize<void, GqlInput>(
  (): GqlInput => ({
    booleanArg: (config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Boolean'
        }),
        config ?? {}
      ),
    floatArg: (config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Float'
        }),
        config ?? ({} as any)
      ),
    idArg: (config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'ID'
        }),
        config ?? {}
      ),
    intArg: (config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'Int'
        }),
        config ?? {}
      ),
    objectArg: (type, config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: type().name
        }),
        config ?? {}
      ),
    stringArg: (config) =>
      new GQLInputValue(
        createUnnamedInputValueDefinitionNode({
          defaultValue: config?.defaultValue,
          description: config?.description,
          list: config?.list,
          nullable: config?.nullable,
          typeName: 'String'
        }),
        config ?? {}
      )
  })
)

export const DefaultGraphQlInterpreters = {
  ...GqlFieldInterpreter(),
  ...GqlInputInterpreter(),
  ...GqlSubscriptionInterpreter()
}
