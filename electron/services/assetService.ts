import { query, queryOne, run } from '../database'

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

export function getAssets(params: {
  keyword?: string
  category?: string
  warehouse_id?: number
  status?: string
  page?: number
  pageSize?: number
} = {}): { list: Asset[]; total: number } {
  const { keyword, category, warehouse_id, status, page = 1, pageSize = 20 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND (a.name LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)'
    paramsArr.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (category) {
    where += ' AND a.category = ?'
    paramsArr.push(category)
  }
  if (warehouse_id) {
    where += ' AND a.warehouse_id = ?'
    paramsArr.push(warehouse_id)
  }
  if (status) {
    where += ' AND a.status = ?'
    paramsArr.push(status)
  }

  const countSql = `SELECT COUNT(*) as total FROM assets a ${where}`
  const totalResult = queryOne(countSql, paramsArr)
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT a.*, w.name as warehouse_name
    FROM assets a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    ${where}
    ORDER BY a.id DESC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, pageSize, offset]) as Asset[]

  return { list, total }
}

export function getAssetById(id: number): Asset | undefined {
  const sql = `
    SELECT a.*, w.name as warehouse_name
    FROM assets a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.id = ?
  `
  return queryOne(sql, [id]) as Asset | undefined
}

export function getAssetBySerial(serialNumber: string): Asset | undefined {
  return queryOne('SELECT * FROM assets WHERE serial_number = ?', [serialNumber]) as Asset | undefined
}

export function createAsset(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): number {
  const sql = `
    INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, expire_date, safety_stock, photo_path, status, remark)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `
  const result = run(sql, [
    asset.name,
    asset.model || null,
    asset.serial_number || null,
    asset.category,
    asset.warehouse_id || null,
    asset.shelf || null,
    asset.quantity || 0,
    asset.unit_price || 0,
    asset.supplier || null,
    asset.expire_date || null,
    asset.safety_stock || 0,
    asset.photo_path || null,
    asset.status || '正常',
    asset.remark || null
  ])
  return result.lastInsertRowid
}

export function updateAsset(id: number, asset: Partial<Asset>): void {
  const fields = Object.keys(asset).filter(k => k !== 'id')
  if (fields.length === 0) return

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (asset as any)[f])
  values.push(id)
  const sql = `UPDATE assets SET ${setClause}, updated_at = datetime('now', 'localtime') WHERE id = ?`
  run(sql, values)
}

export function deleteAsset(id: number): void {
  run('DELETE FROM assets WHERE id = ?', [id])
}

export function getLowStockAssets(): Asset[] {
  const sql = `
    SELECT a.*, w.name as warehouse_name
    FROM assets a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.quantity <= a.safety_stock AND a.safety_stock > 0
    ORDER BY a.quantity ASC
  `
  return query(sql) as Asset[]
}

export function getExpiringAssets(days: number = 30): Asset[] {
  const sql = `
    SELECT a.*, w.name as warehouse_name
    FROM assets a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.expire_date IS NOT NULL 
    AND a.expire_date != ''
    AND a.quantity > 0
    AND date(a.expire_date) <= date('now', 'localtime', '+' || ? || ' days')
    AND date(a.expire_date) >= date('now', 'localtime')
    ORDER BY a.expire_date ASC
  `
  return query(sql, [days]) as Asset[]
}

export function getCategories(): string[] {
  const rows = query('SELECT DISTINCT category FROM assets WHERE category IS NOT NULL AND category != ""') as { category: string }[]
  return rows.map(r => r.category)
}

export function getAllAssetsForCheck(): Asset[] {
  const sql = `
    SELECT a.*, w.name as warehouse_name
    FROM assets a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.status = '正常'
    ORDER BY a.category, a.name
  `
  return query(sql) as Asset[]
}
