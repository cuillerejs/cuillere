import { ServerContext, ServerPlugin } from '@cuillere/server-plugin'

export interface CuillereConfig {
  contextKey?: string
  plugins?: ((srvCtx: ServerContext) => ServerPlugin)[]
}
