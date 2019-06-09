import { crud, CrudOperation } from './operations'

export interface Service {
  [method: string]: (...args: any[]) => Promise<any>
}

interface Services {
  [name: string]: Service
}

interface OperationService {
  [method: string]: (...args: any[]) => CrudOperation
}

interface OperationServices {
  [name: string]: OperationService
}

export function makeServices(
  services: Services,
): { getService(name: string): Service; services: OperationServices } {
  const servicesOperations = {}

  Object.keys(services).forEach(name => {
    const serviceOperations = {}
    Object.keys(services[name]).forEach(method => {
      serviceOperations[method] = (...args: any[]) => crud(name, method, ...args)
    })
    servicesOperations[name] = serviceOperations
  })

  return {
    services: servicesOperations,
    getService: (name: string) => services[name],
  }
}
