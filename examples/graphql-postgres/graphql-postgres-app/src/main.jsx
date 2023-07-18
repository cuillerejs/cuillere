import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BatchHttpLink } from '@apollo/client/link/batch-http'
import App from './App.jsx'
import './index.css'

const link = new BatchHttpLink({
  uri: 'http://localhost:4000/graphql',
  headers: {
    authorization: '17a74e8c-aec5-402b-aacd-63f65dd10871',
  },
})

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
  link,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
)
