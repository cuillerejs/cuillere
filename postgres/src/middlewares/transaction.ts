import { Middleware, isStart } from "@cuillere/core";
import { createTransactionExecutor } from "../postgres";

export const transactionMiddleware = (config): Middleware => {
  const executor = createTransactionExecutor(config)

  return next => async (operation, ctx) => {
    if (isStart(operation)) {
      return executor(ctx, () => next(operation))
    }

    return next(operation)
  }
}
