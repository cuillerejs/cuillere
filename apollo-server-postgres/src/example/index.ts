import { CuillereApolloServerPostgres, gql } from '..'

const typeDefs = gql`
  type Author {
    id: Int!
    firstname: String!
    lastname: String!
  }

  type Book {
    id: Int!
    title: String!
    author: Author!
  }

  type Query {
    books: [Book!]
  }
`

const resolvers = {
  Query: {
    * books(_parent: any, _args: any, { crud }: any) {
      return yield crud.books.all()
    },
  },

  Book: {
    * author({ authorid }: any, _args: any, { crud }: any) {
      return yield crud.authors.get(authorid)
    },
  },
}

const server = new CuillereApolloServerPostgres({
  typeDefs,

  resolvers,

  pgPoolConfigs: [{
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    host: 'localhost',
    port: 5432,
  }],
})

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
