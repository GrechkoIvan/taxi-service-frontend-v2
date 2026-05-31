export interface Manager {
  id: string
  login: string
  name: string
}

export interface ManagerAuthResponse {
  manager: Manager
}

export interface ManagerLoginPayload {
  login: string
  password: string
}
