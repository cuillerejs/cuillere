import { gql } from 'apollo-server-koa'

export const typeDefs = gql`
  scalar Date
  scalar DateTime 

  type Query {
    hello(name: String): String!
    all: [String!]!
    uuid: String!
    now: DateTime!
  }

  type Mutation {
    setupDatabase: Boolean
    addName(name: String!): String!
    setName(before: String!, after: String!): String
    wait: String
  }
`
