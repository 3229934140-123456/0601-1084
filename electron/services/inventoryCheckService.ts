import { query, queryOne, run, beginTransaction, commitTransaction, rollbackTransaction } from '../database'
import { getAssetById, updateAsset } from './assetService'

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

export function getInventoryCheckList(params: {
  keyword?: string
  status?: string
  startDate?: string
  endDate?: string
  check_no?: string
  page?: number
  pageSize?: number
} = {}): { list: InventoryCheckRecord[]; total: number } {
  const { keyword, status, startDate, endDate, check_no, page = 1, pageSize = 200 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND (ic.asset_name LIKE ? OR ic.check_no LIKE ? OR ic.model LIKE ?)'
    paramsArr.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (status) {
    where += ' AND ic.status = ?'
    paramsArr.push(status)
  }
  if (startDate) {
    where += ' AND date(ic.check_date) >= date(?)'
    paramsArr.push(startDate)
  }
  if (endDate) {
    where += ' AND date(ic.check_date) <= date(?)'
    paramsArr.push(endDate)
  }
  if (check_no) {
    where += ' AND ic.check_no = ?'
    paramsArr.push(check_no)
  }

  const countSql = `SELECT COUNT(*) as total FROM inventory_check ic ${where}`
  const totalResult = queryOne(countSql, paramsArr)
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT ic.*
    FROM inventory_check ic
    ${where}
    ORDER BY ic.check_no DESC, ic.id ASC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, pageSize, offset]) as InventoryCheckRecord[]

  return { list, total }
}

export function getCheckGroupList(params: {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
} = {}): { list: { check_no: string; check_date: string; total_items: number; pending_count: number }[]; total: number } {
  const { keyword, status, page = 1, pageSize = 50 } = params

  let where = 'WHERE 1=1'
  const paramsArr: any[] = []

  if (keyword) {
    where += ' AND check_no LIKE ?'
    paramsArr.push(`%${keyword}%`)
  }
  if (status) {
    where += ' AND status = ?'
    paramsArr.push(status)
  }

  const sql = `
    SELECT 
      check_no,
      check_date,
      COUNT(*) as total_items,
      SUM(CASE WHEN status = '待处理' THEN 1 ELSE 0 END) as pending_count
    FROM inventory_check
    ${where}
    GROUP BY check_no, check_date
    ORDER BY MIN(id) DESC
  `
  const list = query(sql, paramsArr) as { check_no: string; check_date: string; total_items: number; pending_count: number }[]
  return { list, total: list.length }
}

export function createBatchCheck(items: {
  asset_id: number
  actual_qty: number
  handler?: string
  remark?: string
}[]): string {
  const checkNo = generateCheckNo()
  const checkDate = new Date().toISOString().split('T')[0]

  try {
    beginTransaction()

    for (const item of items) {
      const asset = getAssetById(item.asset_id)
      if (!asset) continue

      const diff = item.actual_qty - (asset.quantity || 0)
      run(
        `INSERT INTO inventory_check (check_no, check_date, asset_id, asset_name, model, system_qty, actual_qty, diff_qty, handler, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '待处理', ?)`,
        [
          checkNo,
          checkDate,
          item.asset_id,
          asset.name,
          asset.model || '',
          asset.quantity || 0,
          item.actual_qty,
          diff,
          item.handler || '',
          item.remark || ''
        ]
      )
    }

    commitTransaction()
    return checkNo
  } catch (e) {
    rollbackTransaction()
    throw e
  }
}

export function handleCheckDiff(id: number, handleType: 'adjust' | 'ignore', remark?: string): void {
  try {
    beginTransaction()

    const check = queryOne('SELECT * FROM inventory_check WHERE id = ?', [id])
    if (!check) {
      throw new Error('盘点记录不存在')
    }

    if (handleType === 'adjust' && check.asset_id) {
      updateAsset(check.asset_id, {
        quantity: check.actual_qty
      })
    }

    run(
      'UPDATE inventory_check SET status = ?, remark = COALESCE(?, remark) WHERE id = ?',
      [
        handleType === 'adjust' ? '已调整' : '已忽略',
        remark || null,
        id
      ]
    )

    commitTransaction()
  } catch (e) {
    rollbackTransaction()
    throw e
  }
}

export function getCheckByNo(checkNo: string): InventoryCheckRecord[] {
  return query('SELECT * FROM inventory_check WHERE check_no = ? ORDER BY id', [checkNo]) as InventoryCheckRecord[]
}

function generateCheckNo(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `PD${dateStr}${random}`
}
