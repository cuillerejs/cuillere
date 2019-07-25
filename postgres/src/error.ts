export class CuillereError extends Error {
  causedBy: Error[]
  causeOf: Error[]

  constructor(message: string, causedBy?: Error[], causeOf?: Error[]) {
    super(message)
    this.causedBy = causedBy
    this.causeOf = causeOf
  }

  get stack(): string {
    let stack = super.stack

    if(this.causedBy && this.causedBy.length > 0) {
      stack += '\nCaused by :'
      this.causedBy.forEach(err => stack += `\n\t${err.stack}`)
    }

    if(this.causeOf) {
      stack += `\nCause of :`
      this.causeOf.forEach(err => stack += `\n\t${err.stack}`)
    }

    return stack
  }
}