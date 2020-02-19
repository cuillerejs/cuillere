export const isGenerator = (value: any): value is Generator | AsyncGenerator =>
  Boolean(value.next && value.throw && value.return)
