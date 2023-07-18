import { createSchema } from 'graphql-yoga'
import { posts, comments, users } from './dao.js'

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Query {
      posts: [Post!]!
      post(id: String!): Post
    }

    type Mutation {
      post(title: String!, content: String!): Post!
      comment(postId: String!, content: String!): Comment!
      deletePost(id: String!): Post!
      deleteComment(id: String!): Comment!
    }

    type User {
      id: String!
      username: String!
    }

    type Post {
      id: String!
      author: User!
      content: String!
      title: String!
      comments: [Comment!]!
    }

    type Comment {
      id: String!
      author: User!
      post: Post!
      content: String!
    }
  `,
  resolvers: {
    Query: {
      async* posts() {
        return yield* posts.all()
      },
      async* post(_, { id }) {
        return yield* posts.get(id)
      },
    },
    Mutation: {
      async* post(_, { title, content }) {
        return yield* posts.create({ title, content })
      },
      async* comment(_, { postId, content }) {
        return yield* comments.create({ postId, content })
      },
      async* deletePost(_, { id }) {
        yield* comments.deleteBy('postId', id)
        return yield* posts.delete(id)
      },
      async* deleteComment(_, { id }) {
        return yield* comments.delete(id)
      },
    },
    Post: {
      async* author({ authorId }) {
        return yield* users.get(authorId)
      },
      async* comments({ id }) {
        return yield* comments.listBy('postId', id)
      },
    },
    Comment: {
      async* author({ authorId }) {
        return yield* users.get(authorId)
      },
      async* post({ postId }) {
        return yield* posts.get(postId)
      },
    },
  },
})
