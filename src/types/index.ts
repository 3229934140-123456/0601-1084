export interface Asset {
  id?: number
  name: string
  model?: string
  serial_number?: string
  category: string
  warehouse_id?: number
  warehouse_name?: string
  shelf?: string
  quantity: number
  unit_price?: number
  supplier?: string
  expire_date?: string
  safety_stock?: number
  photo_path?: string
  status?: string
  remark?: string
  created_at?: string
  updated_at?: string
}

export interface StockInRecord {
  id?: number
  order_no?: string
  asset_id?: number
  asset_name: string
  model?: string
  serial_number?: string
  category?: string
  quantity: number
  unit_price?: number
  supplier?: string
  warehouse_id?: number
  warehouse_name?: string
  shelf?: string
  operator?: string
  photo_path?: string
  remark?: string
  created_at?: string
}

export interface StockOutRecord {
  id?: number
  order_no?: string
  asset_id?: number
  asset_name: string
  model?: string
  serial_number?: string
  category?: string
  quantity: number
  applicant?: string
  department_id?: number
  department_name?: string
  purpose?: string
  cost_center?: string
  warehouse_id?: number
  operator?: string
  remark?: string
  created_at?: string
}

export interface TransferRecord {
  id?: number
  transfer_no?: string
  asset_id?: number
  asset_name: string
  model?: string
  serial_number?: string
  category?: string
  quantity: number
  from_warehouse_id?: number
  from_warehouse_name?: string
  from_shelf?: string
  to_warehouse_id?: number
  to_warehouse_name?: string
  to_shelf?: string
  operator?: string
  remark?: string
  created_at?: string
}

export interface InventoryCheckRecord {
  id?: number
  check_no?: string
  check_date?: string
  asset_id?: number
  asset_name?: string
  model?: string
  system_qty?: number
  actual_qty?: number
  diff_qty?: number
  handler?: string
  status?: string
  remark?: string
  created_at?: string
}

export interface TransactionRecord {
  id: number
  type: 'in' | 'out' | 'transfer'
  order_no: string
  asset_name: string
  model?: string
  serial_number?: string
  category?: string
  quantity: number
  warehouse?: string
  target_warehouse?: string
  operator?: string
  remark?: string
  created_at: string
  related_id: number
}

export interface Warehouse {
  id?: number
  name: string
  location?: string
  manager?: string
  created_at?: string
}

export interface Department {
  id?: number
  name: string
  manager?: string
  created_at?: string
}

export interface Employee {
  id?: number
  name: string
  department_id?: number
  department_name?: string
  position?: string
  created_at?: string
}

export interface PageResult<T> {
  list: T[]
  total: number
}
