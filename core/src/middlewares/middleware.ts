import { OperationHandler } from '../cuillere';

export interface Middleware {
  (next: OperationHandler, ctx: any, run: OperationHandler): OperationHandler
}
