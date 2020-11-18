import { QueryOptions as MariaQueryOptions } from 'mariadb'

export interface QueryOptions extends MariaQueryOptions {
  pool?: string
  usePoolQuery?: boolean
}
