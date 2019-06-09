export interface Context {
  getService(name: string): Service
}

export interface Service {
  [method: string]: (...args: any[]) => Promise<any>
}
