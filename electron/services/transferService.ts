import { query, queryOne, run, exec, beginTransaction, commitTransaction, rollbackTransaction } from '../database'
import { getAssetById, updateAsset, createAsset } from './assetService'

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

export function getTransferList(params: {
  keyword?: string
  startDate?: string
  endDate?: string
  from_warehouse_id?: number
  to_warehouse_id?: number
  page?: number
  pageSize?: number
} = {}): { list: TransferRecord[]; total: number } {
  const { keyword, startDate, endDate, from_warehouse_id, to_warehouse_id, page = 1, pageSize = 20 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND (t.asset_name LIKE ? OR t.model LIKE ? OR t.serial_number LIKE ? OR t.transfer_no LIKE ?)'
    paramsArr.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (startDate) {
    where += ' AND date(t.created_at) >= date(?)'
    paramsArr.push(startDate)
  }
  if (endDate) {
    where += ' AND date(t.created_at) <= date(?)'
    paramsArr.push(endDate)
  }
  if (from_warehouse_id) {
    where += ' AND t.from_warehouse_id = ?'
    paramsArr.push(from_warehouse_id)
  }
  if (to_warehouse_id) {
    where += ' AND t.to_warehouse_id = ?'
    paramsArr.push(to_warehouse_id)
  }

  const countSql = `SELECT COUNT(*) as total FROM transfers t ${where}`
  const totalResult = queryOne(countSql, paramsArr)
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT t.*, 
           w1.name as from_warehouse_name,
           w2.name as to_warehouse_name
    FROM transfers t
    LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
    LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
    ${where}
    ORDER BY t.id DESC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, pageSize, offset]) as TransferRecord[]

  return { list, total }
}

export function createTransfer(record: Omit<TransferRecord, 'id' | 'transfer_no' | 'created_at'>): number {
  const transferNo = generateTransferNo()

  try {
    beginTransaction()

    const asset = getAssetById(record.asset_id!)
    if (!asset) {
      throw new Error('资产不存在')
    }
    if ((asset.quantity || 0) < record.quantity) {
      throw new Error('库存不足')
    }

    if (asset.warehouse_id === record.from_warehouse_id) {
      updateAsset(record.asset_id!, {
        quantity: (asset.quantity || 0) - record.quantity
      })
    }

    let targetAsset = queryOne(
      'SELECT * FROM assets WHERE name = ? AND model = ? AND warehouse_id = ? AND (serial_number = ? OR serial_number IS NULL)',
      [record.asset_name, record.model, record.to_warehouse_id, record.serial_number || '']
    )

    if (targetAsset) {
      updateAsset(targetAsset.id, {
        quantity: (targetAsset.quantity || 0) + record.quantity,
        shelf: record.to_shelf || targetAsset.shelf
      })
    } else {
      const insertSql = `
        INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '正常')
      `
      const result = run(insertSql, [
        record.asset_name,
        record.model,
        record.serial_number || null,
        record.category || asset.category,
        record.to_warehouse_id,
        record.to_shelf,
        record.quantity,
        asset.unit_price,
        asset.supplier
      ])
      targetAsset = { id: result.lastInsertRowid }
    }

    const sql = `
      INSERT INTO transfers (transfer_no, asset_id, asset_name, model, serial_number, category, quantity, from_warehouse_id, from_shelf, to_warehouse_id, to_shelf, operator, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const result = run(sql, [
      transferNo,
      record.asset_id,
      record.asset_name,
      record.model,
      record.serial_number,
      record.category,
      record.quantity,
      record.from_warehouse_id,
      record.from_shelf,
      record.to_warehouse_id,
      record.to_shelf,
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

export function getTransferById(id: number): TransferRecord | undefined {
  const sql = `
    SELECT t.*, 
           w1.name as from_warehouse_name,
           w2.name as to_warehouse_name
    FROM transfers t
    LEFT JOIN warehouses w1 ON t.from_warehouse_id = w1.id
    LEFT JOIN warehouses w2 ON t.to_warehouse_id = w2.id
    WHERE t.id = ?
  `
  return queryOne(sql, [id]) as TransferRecord | undefined
}

function generateTransferNo(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `DB${dateStr}${random}`
}
