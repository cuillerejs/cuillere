import { mergeCruds } from '.'

describe('mergeCrud', () => {
  it('simple case', () => {
    const result = mergeCruds({
      postgres: {
        pool: {
          schema: {
            table: 'zob',
          },
        },
      },
    })

    console.log(JSON.stringify(result, null, 2))

    expect(result).toEqual({
      table: 'zob',
      schema: {
        table: 'zob',
      },
      pool: {
        table: 'zob',
        schema: {
          table: 'zob',
        },
      },
      postgres: {
        table: 'zob',
        schema: {
          table: 'zob',
        },
        pool: {
          table: 'zob',
          schema: {
            table: 'zob',
          },
        },
      },
    })
  })

  it('duplicates case', () => {
    const result = mergeCruds({
      postgres: {
        pool: {
          schema: {
            table: 'zob',
          },
          schema2: {
            table: 'ha',
          },
        },
      },
    })

    console.log(JSON.stringify(result, null, 2))

    expect(result).toEqual({
      schema: {
        table: 'zob',
      },
      schema2: {
        table: 'ha',
      },
      pool: {
        schema: {
          table: 'zob',
        },
        schema2: {
          table: 'ha',
        },
      },
      postgres: {
        schema: {
          table: 'zob',
        },
        schema2: {
          table: 'ha',
        },
        pool: {
          schema: {
            table: 'zob',
          },
          schema2: {
            table: 'ha',
          },
        },
      },
    })
  })
})
