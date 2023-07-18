import { useState } from 'react'
import './App.css'
import { useQuery, gql, useMutation } from '@apollo/client'

function App() {
  const [state, setState] = useState()
  return (
    <div className="App">
      <header>
        <h1>Blog</h1>
      </header>
      <nav>
        <button onClick={() => setState({ name: states.creating })}>New Post</button>
        <PostList onSelected={id => (
          id ? setState({ name: states.displayPost, id }) : setState(null)
        )}/>
      </nav>
      <main>
        {state?.name === states.creating
          && <PostForm onCreated={id => setState({ name: states.displayPost, id })}/>
        }

        {state?.name === states.displayPost
          && <Post id={state.id}/>
        }
      </main>
    </div>
  )
}

function PostForm({ onCreated }) {
  const [createPost] = useMutation(gql`
    mutation create_post($title: String!, $content: String!) {
      post(title: $title, content: $content) {
        id
      }
    }
  `, {
    refetchQueries: ['list_posts'],
  })

  return (
    <form onSubmit={async (e) => {
      e.preventDefault()
      const { data } = await createPost({
        variables: {
          title: e.target.title.value,
          content: e.target.content.value,
        },
      })
      onCreated(data.post.id)
    }}>
      <input name="title" placeholder='Title' />
      <textarea name="content" placeholder='Content' />
      <button type="submit">Post</button>
    </form>)
}

function PostList({ onSelected }) {
  const { data, error } = useQuery(gql`
    query list_posts {
      posts {
        id, title
      }
    }
  `)

  const [deletePost] = useMutation(gql`
    mutation delete_post($id: String!) {
      deletePost(id: $id) {
        id
      }
    }
  `, {
    refetchQueries: ['list_posts'],
  })

  if (error) return <pre>{error.toString()}</pre>
  if (!data) return 'loading...'

  return (
    <>
      {data.posts.map(post => (
        <div className="post" key={post.id} onClick={() => onSelected(post.id)}>
          {post.title}
          <button onClick={async (e) => {
            e.stopPropagation()
            await deletePost({ variables: { id: post.id } })
            onSelected(null)
          }}>
            🗑️
          </button>
        </div>
      ))}
    </>
  )
}

function Post({ id }) {
  const { data, error } = useQuery(gql`
    query get_post($id: String!) {
      post(id: $id) {
        id, title, content
        author { id, username }
        comments { 
          id, content, authorId
        }
      }
    }
  `, { variables: { id } })

  const [createComment] = useMutation(gql`
    mutation create_comment($postId: String!, $content: String!) {
      comment(postId: $postId, content: $content) {
        id
      }
    }
  `, {
    refetchQueries: ['get_post'],
  })

  if (error) return <pre>{error.toString()}</pre>
  if (!data) return 'loading...'

  return (
    <>
      <h2>{data.post.title}</h2>
      <p>{data.post.content}</p>
      <small>By {data.post.author.username}</small>
      <div>
        <h3>Comments</h3>
        <form className="new_comment" onSubmit={async (e) => {
          e.preventDefault()
          await createComment({
            variables: {
              postId: id,
              content: e.target.content.value,
            },
          })
          e.target.content.value = ''
        }}>
          <textarea name="content" placeholder='Comment' />
          <button type="submit">Comment</button>
        </form>
        {[...data.post.comments].reverse().map(comment => (
          <Comment key={comment.id} comment={comment}/>
        ))}
      </div>
    </>
  )
}

function Comment({ comment }) {
  const { data, error } = useQuery(gql`
    query get_author($id: String!) {
      user(id: $id) {
        id, username
      }
    }
  `, { variables: { id: comment.authorId } })

  const [deleteComment] = useMutation(gql`
    mutation delete_comment($id: String!) {
      deleteComment(id: $id) {
        id
      }
    }
  `, {
    variables: { id: comment.id },
    refetchQueries: ['get_post'],
  })

  if (error) return <pre>{error.toString()}</pre>

  return (
    <div className="comment">
      <p>
        {comment.content}
        <br/><small>By {data ? data.user.username : '...'}</small>
      </p>

      <button onClick={async () => {
        await deleteComment()
      }}>
        🗑️
      </button>
    </div>
  )
}

export default App

const states = {
  creating: 'creating',
  displayPost: 'displayPost',
}
