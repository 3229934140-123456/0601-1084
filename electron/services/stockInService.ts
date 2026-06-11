import { query, queryOne, run, exec, beginTransaction, commitTransaction, rollbackTransaction } from '../database'
import { updateAsset, getAssetBySerial, createAsset } from './assetService'

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
  shelf?: string
  operator?: string
  photo_path?: string
  remark?: string
  created_at?: string
}

export function getStockInList(params: {
  keyword?: string
  startDate?: string
  endDate?: string
  warehouse_id?: number
  page?: number
  pageSize?: number
} = {}): { list: StockInRecord[]; total: number } {
  const { keyword, startDate, endDate, warehouse_id, page = 1, pageSize = 20 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND (s.asset_name LIKE ? OR s.model LIKE ? OR s.serial_number LIKE ? OR s.order_no LIKE ?)'
    paramsArr.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (startDate) {
    where += ' AND date(s.created_at) >= date(?)'
    paramsArr.push(startDate)
  }
  if (endDate) {
    where += ' AND date(s.created_at) <= date(?)'
    paramsArr.push(endDate)
  }
  if (warehouse_id) {
    where += ' AND s.warehouse_id = ?'
    paramsArr.push(warehouse_id)
  }

  const countSql = `SELECT COUNT(*) as total FROM stock_in s ${where}`
  const totalResult = queryOne(countSql, paramsArr)
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT s.*, w.name as warehouse_name
    FROM stock_in s
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    ${where}
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, pageSize, offset]) as StockInRecord[]

  return { list, total }
}

export function createStockIn(record: Omit<StockInRecord, 'id' | 'order_no' | 'created_at'>): number {
  const orderNo = generateOrderNo('RK')

  try {
    beginTransaction()

    let assetId = record.asset_id

    if (record.serial_number) {
      const existing = getAssetBySerial(record.serial_number)
      if (existing) {
        assetId = existing.id!
        updateAsset(assetId, {
          quantity: (existing.quantity || 0) + record.quantity
        })
      } else {
        assetId = createAsset({
          name: record.asset_name,
          model: record.model,
          serial_number: record.serial_number,
          category: record.category || '其他',
          warehouse_id: record.warehouse_id,
          shelf: record.shelf,
          quantity: record.quantity,
          unit_price: record.unit_price,
          supplier: record.supplier,
          photo_path: record.photo_path
        })
      }
    } else if (assetId) {
      const asset = queryOne('SELECT * FROM assets WHERE id = ?', [assetId])
      if (asset) {
        updateAsset(assetId, {
          quantity: (asset.quantity || 0) + record.quantity,
          shelf: record.shelf || asset.shelf,
          warehouse_id: record.warehouse_id || asset.warehouse_id
        })
      }
    } else {
      assetId = createAsset({
        name: record.asset_name,
        model: record.model,
        category: record.category || '其他',
        warehouse_id: record.warehouse_id,
        shelf: record.shelf,
        quantity: record.quantity,
        unit_price: record.unit_price,
        supplier: record.supplier,
        photo_path: record.photo_path
      })
    }

    const sql = `
      INSERT INTO stock_in (order_no, asset_id, asset_name, model, serial_number, category, quantity, unit_price, supplier, warehouse_id, shelf, operator, photo_path, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = run(sql, [
      orderNo,
      assetId,
      record.asset_name,
      record.model,
      record.serial_number,
      record.category,
      record.quantity,
      record.unit_price,
      record.supplier,
      record.warehouse_id,
      record.shelf,
      record.operator,
      record.photo_path,
      record.remark
    ])

    commitTransaction()
    return result.lastInsertRowid
  } catch (e) {
    rollbackTransaction()
    throw e
  }
}

export function getStockInById(id: number): StockInRecord | undefined {
  const sql = `
    SELECT s.*, w.name as warehouse_name
    FROM stock_in s
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.id = ?
  `
  return queryOne(sql, [id]) as StockInRecord | undefined
}

function generateOrderNo(prefix: string): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${prefix}${dateStr}${random}`
}

export function getStockInByOrderNo(orderNo: string): StockInRecord | undefined {
  const sql = `
    SELECT s.*, w.name as warehouse_name
    FROM stock_in s
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    WHERE s.order_no = ?
  `
  return queryOne(sql, [orderNo]) as StockInRecord | undefined
}
