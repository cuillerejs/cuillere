import { cuillere, delegate } from '..'

describe('start', () => {
  it('should call start handler once at startup', async () => {
    // given
    const ctx = {
      started: 0,
    }

    // when
    await cuillere({
      handlers: {
        * '@cuillere/core/start'(_, ctx) {
          ctx.started++
          yield delegate()
        },
      },
    }).ctx(ctx).call(function* () {
      // does nothing
    })

    // then
    expect(ctx).toEqual({ started: 1 })
  })
})
