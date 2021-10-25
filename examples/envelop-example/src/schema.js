import {makeExecutableSchema} from "@graphql-tools/schema";
import {query} from "@cuillere/postgres";

export const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      now: String
    }
    
    type Mutation {
      insert: String
      throwing: String
    }
  `,
  resolvers: {
    Query: {
      *now() {
        const { rows: [{ now }] } = yield query({ text: 'SELECT NOW()' })
        return `${now}`
      }
    },
    Mutation: {
      *insert() {
        yield query("INSERT INTO test(data) VALUES ('coucou')")
      },
      *throwing() {
        throw Error('test')
      }
    }
  },
})
