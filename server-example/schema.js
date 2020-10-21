import { gql } from 'apollo-server-koa'

export const typeDefs = gql`
  scalar Date
  scalar DateTime 

  type Query {
    hello(name: String): String!
    uuid: String!
    now: DateTime!
    wait: String
  }
`
