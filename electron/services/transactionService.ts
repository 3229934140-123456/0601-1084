import { query, queryOne } from '../database'

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

export function getTransactionList(params: {
  keyword?: string
  type?: 'in' | 'out' | 'transfer'
  startDate?: string
  endDate?: string
  category?: string
  page?: number
  pageSize?: number
} = {}): { list: TransactionRecord[]; total: number } {
  const { keyword, type, startDate, endDate, category, page = 1, pageSize = 20 } = params

  let unionParts: string[] = []
  let paramsArr: any[] = []

  if (!type || type === 'in') {
    unionParts.push(`
      SELECT 
        id as related_id,
        'in' as type,
        order_no,
        asset_name,
        model,
        serial_number,
        category,
        quantity,
        (SELECT name FROM warehouses WHERE id = warehouse_id) as warehouse,
        NULL as target_warehouse,
        operator,
        remark,
        created_at
      FROM stock_in
    `)
  }
  if (!type || type === 'out') {
    unionParts.push(`
      SELECT 
        id as related_id,
        'out' as type,
        order_no,
        asset_name,
        model,
        serial_number,
        category,
        quantity,
        (SELECT name FROM warehouses WHERE id = warehouse_id) as warehouse,
        NULL as target_warehouse,
        operator,
        remark,
        created_at
      FROM stock_out
    `)
  }
  if (!type || type === 'transfer') {
    unionParts.push(`
      SELECT 
        id as related_id,
        'transfer' as type,
        transfer_no as order_no,
        asset_name,
        model,
        serial_number,
        category,
        quantity,
        (SELECT name FROM warehouses WHERE id = from_warehouse_id) as warehouse,
        (SELECT name FROM warehouses WHERE id = to_warehouse_id) as target_warehouse,
        operator,
        remark,
        created_at
      FROM transfers
    `)
  }

  const unionSql = unionParts.join(' UNION ALL ')

  let where = 'WHERE 1=1'
  const whereParams: any[] = []

  if (keyword) {
    where += ' AND (asset_name LIKE ? OR model LIKE ? OR serial_number LIKE ? OR order_no LIKE ?)'
    whereParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
  }
  if (startDate) {
    where += ' AND date(created_at) >= date(?)'
    whereParams.push(startDate)
  }
  if (endDate) {
    where += ' AND date(created_at) <= date(?)'
    whereParams.push(endDate)
  }
  if (category) {
    where += ' AND category = ?'
    whereParams.push(category)
  }

  const countSql = `SELECT COUNT(*) as total FROM (${unionSql}) t ${where}`
  const totalResult = queryOne(countSql, [...paramsArr, ...whereParams])
  const total = totalResult?.total || 0

  const offset = (page - 1) * pageSize
  const sql = `
    SELECT * FROM (${unionSql}) t
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `
  const list = query(sql, [...paramsArr, ...whereParams, pageSize, offset]) as TransactionRecord[]

  return { list, total }
}

export function getMonthlySummary(yearMonth: string): any[] {
  const sql = `
    SELECT 
      category,
      asset_name,
      model,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as in_qty,
      SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as out_qty,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) - SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as net_qty
    FROM (
      SELECT category, asset_name, model, quantity, 'in' as type, created_at FROM stock_in
      UNION ALL
      SELECT category, asset_name, model, quantity, 'out' as type, created_at FROM stock_out
    )
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY category, asset_name, model
    ORDER BY category, asset_name
  `
  return query(sql, [yearMonth]) as any[]
}
