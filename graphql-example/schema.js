import { gql } from 'apollo-server-koa'

export const typeDefs = gql`
  type Query {
    hello(name: String): String!
  }
`
