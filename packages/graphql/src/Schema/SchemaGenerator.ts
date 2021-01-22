/* eslint-disable functional/immutable-data */
import type { ResolverF } from './Resolver'
import type { ScalarFunctions } from './Scalar'
import type { AnyRootTypes, GQLExtendObject, GQLInputObject, GQLObject, GQLScalar } from './Types'
import type { UnionToIntersection } from '@principia/base/util/types'
import type {
  DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode
} from 'graphql'

import * as R from '@principia/base/Record'

import { createDocumentNode, createSchemaDefinitionNode } from './AST'

export class SchemaParts<T, R> {
  readonly _R!: (_: R) => void
  constructor(
    readonly typeDefs: DocumentNode,
    readonly resolvers: Record<string, Record<string, ResolverF<any, any, T, any, any, any>>>,
    readonly scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>
  ) {}
}

type ExtractEnv<Fragments extends ReadonlyArray<AnyRootTypes<any>>> = UnionToIntersection<
  {
    [K in number]: [Fragments[K]] extends [{ _R: (_: infer R) => void }] ? R : unknown
  }[number]
>

export interface SchemaGenerator<T> {
  <Fragments extends readonly [GQLObject<'Query', {}, T, any, any, any>, ...ReadonlyArray<AnyRootTypes<T>>]>(
    ...fragments: Fragments
  ): SchemaParts<T, ExtractEnv<Fragments>>
}

export const makeSchemaGenerator = <Ctx>(): SchemaGenerator<Ctx> => (...types) => {
  const objectTypes: Record<string, GQLObject<any, any, any, any, any, any>> = {}
  const extendTypes: Record<string, GQLExtendObject<any, any, any, any>>     = {}
  const inputObjectTypes: Record<string, GQLInputObject<any, any>>           = {}
  const scalarTypes: Record<string, GQLScalar<any, any, any, any>>           = {}
  for (const type of types) {
    switch (type._tag) {
      case 'GQLExtendObject': {
        extendTypes[type.object.name] = type as any
        break
      }
      case 'GQLObject': {
        objectTypes[type.name] = type as any
        break
      }
      case 'GQLInputObject': {
        inputObjectTypes[type.name] = type as any
        break
      }
      case 'GQLScalar': {
        scalarTypes[type.name] = type as any
      }
    }
  }
  const resolvers: any = {}
  for (const [k, v] of Object.entries(objectTypes)) {
    resolvers[k] = v.resolvers
  }
  for (const [k, v] of Object.entries(extendTypes)) {
    if (resolvers[k]) {
      resolvers[k] = { ...resolvers[k], ...v.resolvers }
    } else {
      resolvers[k] = v.resolvers
    }
  }

  const scalars: any = {}
  for (const [k, v] of Object.entries(scalarTypes)) {
    scalars[k] = {
      functions: v.fns,
      name: v.name
    }
  }
  const extendFieldASTs      = R.ifoldl_(
    extendTypes,
    {} as Record<string, ReadonlyArray<FieldDefinitionNode>>,
    (b, k, v) => ({
      ...b,
      [k]: v.fields
    })
  )
  const extendObjectNames    = R.ifoldl_(extendTypes, [] as string[], (acc, k, _v) => [...acc, k])
  const objectASTs           = R.ifoldl_(objectTypes, [] as ObjectTypeDefinitionNode[], (b, k, v) => {
    return extendObjectNames.includes(k)
      ? [...b, { ...v.ast, fields: [...(v.ast.fields || []), ...extendFieldASTs[k]] }]
      : [...b, v.ast]
  })
  const inputASTs            = R.foldl_(inputObjectTypes, [] as InputObjectTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const scalarASTs           = R.foldl_(scalarTypes, [] as ScalarTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const schemaDefinitionNode = createSchemaDefinitionNode({
    mutation: Object.keys(resolvers).includes('Mutation'),
    query: Object.keys(resolvers).includes('Query')
  })
  const typeDefs             = createDocumentNode([...objectASTs, ...inputASTs, ...scalarASTs, schemaDefinitionNode])
  return new SchemaParts(typeDefs, resolvers, scalars)
}
