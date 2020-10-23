import { gql } from '@cuillere/server'

export const typeDefs = gql`
  scalar Date
  scalar DateTime 

  type Query {
    hello(name: String): String!
    now: DateTime!
    wait: String
  }
`
