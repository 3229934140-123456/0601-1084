import { query, queryOne, run, exec, beginTransaction, commitTransaction, rollbackTransaction } from '../database'
import { getAssetById, updateAsset } from './assetService'

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

export function getStockOutList(params: {
  keyword?: string
  startDate?: string
  endDate?: string
  department_id?: number
  page?: number
  pageSize?: number
} = {}): { list: StockOutRecord[]; total: number } {
  const { keyword, startDate, endDate, department_id, page = 1, pageSize = 20 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND (s.asset_name LIKE ? OR s.model LIKE ? OR s.serial_number LIKE ? OR s.order_no LIKE ? OR s.applicant LIKE ?)'
    paramsArr.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (startDate) {
    where += ' AND date(s.created_at) >= date(?)'
    paramsArr.push(startDate)
  }
  if (endDate) {
    where += ' AND date(s.created_at) <= date(?)'
    paramsArr.push(endDate)
  }
  if (department_id) {
    where += ' AND s.department_id = ?'
    paramsArr.push(department_id)
  }

  const countSql = `SELECT COUNT(*) as total FROM stock_out s ${where}`
  const totalResult = queryOne(countSql, paramsArr)
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT s.*, d.name as department_name, w.name as warehouse_name
    FROM stock_out s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    ${where}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, pageSize, offset]) as StockOutRecord[]

  return { list, total }
}

export function createStockOut(record: Omit<StockOutRecord, 'id' | 'order_no' | 'created_at'>): number {
  const orderNo = generateOrderNo('CK')

  try {
    beginTransaction()

    const asset = getAssetById(record.asset_id!)
    if (!asset) {
      throw new Error('资产不存在')
    }
    if ((asset.quantity || 0) < record.quantity) {
      throw new Error('库存不足')
    }

    updateAsset(record.asset_id!, {
      quantity: (asset.quantity || 0) - record.quantity
    })

    const sql = `
      INSERT INTO stock_out (order_no, asset_id, asset_name, model, serial_number, category, quantity, applicant, department_id, purpose, cost_center, warehouse_id, operator, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = run(sql, [
      orderNo,
      record.asset_id,
      record.asset_name,
      record.model,
      record.serial_number,
      record.category,
      record.quantity,
      record.applicant,
      record.department_id,
      record.purpose,
      record.cost_center,
      record.warehouse_id,
      record.operator,
      record.remark
    ])

    commitTransaction()
    return result.lastInsertRowid
  } catch (e) {
    rollbackTransaction()
    throw e
  }
}

export function getStockOutById(id: number): StockOutRecord | undefined {
  const sql = `
    SELECT s.*, d.name as department_name, w.name as warehouse_name
    FROM stock_out s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.id = ?
  `
  return queryOne(sql, [id]) as StockOutRecord | undefined
}

export function getStockOutByOrderNo(orderNo: string): StockOutRecord | undefined {
  const sql = `
    SELECT s.*, d.name as department_name, w.name as warehouse_name
    FROM stock_out s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.order_no = ?
  `
  return queryOne(sql, [orderNo]) as StockOutRecord | undefined
}

export function getMonthlyConsumption(yearMonth: string): any[] {
  const sql = `
    SELECT 
      category,
      asset_name,
      model,
      SUM(quantity) as total_quantity,
      COUNT(DISTINCT order_no) as order_count
    FROM stock_out
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY category, asset_name, model
    ORDER BY total_quantity DESC
  `
  return query(sql, [yearMonth]) as any[]
}

export function getDepartmentConsumption(yearMonth?: string): any[] {
  let sql = `
    SELECT 
      d.name as department_name,
      s.asset_name,
      s.category,
      s.model,
      SUM(s.quantity) as total_quantity,
      SUM(s.quantity * COALESCE(a.unit_price, 0)) as total_cost
    FROM stock_out s
    LEFT JOIN departments d ON s.department_id = d.id
    LEFT JOIN assets a ON s.asset_id = a.id
  `
  const params: any[] = []
  if (yearMonth) {
    sql += ` WHERE strftime('%Y-%m', s.created_at) = ?`
    params.push(yearMonth)
  }
  sql += ` GROUP BY d.name, s.asset_name, s.category, s.model
           ORDER BY department_name, total_quantity DESC`
  return query(sql, params) as any[]
}

function generateOrderNo(prefix: string): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${prefix}${dateStr}${random}`
}
