export type DriverApplicationStatus = 'pending' | 'approved' | 'rejected'

export type ComfortLevel = 'economy' | 'comfort' | 'business'

export type CarInfo = {
  make: string
  model: string
  color: string
  plate: string
}

export interface DriverApplicationPublic {
  id: string
  email: string
  name: string
  phone: string
  status: DriverApplicationStatus
  createdAt: string
  reviewedAt: string | null
  driverId: string | null

  // fields that appear after review
  reviewedByManagerId?: string
  managerComment?: string
  driverLicenseNumber?: string
  comfortLevel?: ComfortLevel
  car?: CarInfo
}

export interface ApproveDriverApplicationPayload {
  driverLicenseNumber: string
  carMake: string
  carModel: string
  carColor: string
  carPlate: string
  comfortLevel: ComfortLevel
}

export interface ApproveDriverApplicationResponse {
  ok: true
  driverId: string
}

export interface RejectDriverApplicationPayload {
  comment: string
}

export interface RejectDriverApplicationResponse {
  ok: true
}
