import {makeExecutableSchema} from "@graphql-tools/schema";
import {query as postgresQuery} from "@cuillere/postgres";
import { query as mariaQuery } from '@cuillere/mariadb'

export const schema = makeExecutableSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      now(database: Database): String
    }
    
    enum Database { postgres, maria }
    
    type Mutation {
      postgres: DatabaseOperations
      maria: DatabaseOperations
    }
    
    type DatabaseOperations {
      insert: String
      throwing: String
    }
  `,
  resolvers: {
    Query: {
      * now(_, {database = 'postgres'}) {
        if (database === 'postgres') {
          const {rows: [{now}]} = yield postgresQuery({text: 'SELECT NOW()'})
          return `postgres: ${now}`
        } else {
          const [{now}] = yield mariaQuery({sql: 'SELECT NOW() AS now'})
          return `maria: ${now}`
        }
      }
    },
    DatabaseOperations: {
      * insert({ database }) {
        if(database === 'postgres') {
          yield postgresQuery("INSERT INTO test(data) VALUES ('coucou')")
        } else {
          yield mariaQuery("INSERT INTO phones(number) VALUES ('0601020304')")
        }
        return database
      },
      * throwing() {
        throw Error('test')
      }
    },
    Mutation: {
      postgres: () => ({ database: 'postgres' }),
      maria: () => ({ database: 'maria' })
    }
  },
})
