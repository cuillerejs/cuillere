import { createServer } from 'http'

import { envelop, useSchema } from '@envelop/core'
import { buildSchema } from 'graphql'

import { useCuillere } from './envelop'

const mySchema = buildSchema(/* GraphQL */ `
  type Query {
    hello: String
  }
`)

export const getEnveloped = envelop({
  plugins: [useSchema(mySchema), useCuillere()],
})

const httpServer = createServer()

httpServer.on('request', async (req, res) => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({ req })

  // Parse the initial request and validate it
  const { query, variables } = JSON.parse(req.payload)
  const document = parse(query)
  const validationErrors = validate(schema, document)

  if (validationErrors.length > 0) {
    return res.end(JSON.stringify({ errors: validationErrors }))
  }

  // Build the context and execute
  const contextValue = await contextFactory()
  const result = await execute({
    document,
    schema,
    variableValues: variables,
    contextValue,
  })

  // Send the response
  res.end(JSON.stringify(result))
})

httpServer.listen(3000)
