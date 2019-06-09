import { Service } from './services'

export interface Context {
  getService(name: string): Service
}
