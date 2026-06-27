export type ResourceType = 'table' | 'room';
export type BackendResourceType = 'TABLE' | 'ROOM';

export interface RestaurantInfo {
  id: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  rating: number;
  address: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
  upiQrImage: string;
}

export interface DiningResource {
  id: number;
  resourceType: BackendResourceType;
  number: string;
  displayId: string;
  isOccupied: boolean;
  capacity: number;
  roomType: string;
  floor: number;
  qrUrl: string;
}

export interface TableInfo {
  id: string;
  number: string;
  capacity: number;
  isOccupied: boolean;
}

export interface RoomInfo {
  id: string;
  number: string;
  type: string;
  floor: number;
  isOccupied: boolean;
}

export interface ResourceInfo {
  type: ResourceType;
  id: string;
  displayName: string;
  details: string;
}

export function backendToFrontendType(type: BackendResourceType): ResourceType {
  return type === 'TABLE' ? 'table' : 'room';
}

export function frontendToBackendType(type: ResourceType): BackendResourceType {
  return type === 'table' ? 'TABLE' : 'ROOM';
}

export function diningResourceToTableInfo(r: DiningResource): TableInfo {
  return { id: r.displayId, number: r.number, capacity: r.capacity, isOccupied: r.isOccupied };
}

export function diningResourceToRoomInfo(r: DiningResource): RoomInfo {
  return { id: r.displayId, number: r.number, type: r.roomType, floor: r.floor, isOccupied: r.isOccupied };
}
