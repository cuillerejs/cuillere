import { CuillereApolloServerPostgres, CrudFactory, Crud, gql } from '..'

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
    * books(_parent: any, _args: any, { crud }: { crud: Crud }) {
      return yield crud<Book>('books').all()
    },
  },

  Book: {
    * author({ authorid }: any, _args: any, { crud }: { crud: Crud }) {
      return yield crud.authors.get(authorid)
    },
  },
}

const books: CrudFactory<Book> = ({ crud }) => ({
  * listByAuthor(authorid) {
    return crud.list({ authorid })
  },
})

interface Book {
  id: number
  title: string
  authorid: number
}

const server = new CuillereApolloServerPostgres({
  typeDefs,

  resolvers,

  crud: {
    books,
  },

  pgPoolConfig: {
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    host: 'localhost',
    port: 5432,
  },
})

// For use in functions which are not resolvers
export const { crud } = server

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
