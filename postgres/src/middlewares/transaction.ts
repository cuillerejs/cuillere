import { Middleware, isStart } from "@cuillere/core";
import { createTransactionManager } from "../postgres";

export const transactionMiddleware = (config): Middleware => {
  const executor = createTransactionManager(config)

  return (next, ctx) => async operation => {
    if (isStart(operation)) {
      return executor(ctx, () => next(operation))
    }

    return next(operation)
  }
}
