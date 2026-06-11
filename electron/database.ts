import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let db: Database | null = null
let SQL: any = null
let inTransaction = false

export async function initDb(): Promise<void> {
  if (db) return

  SQL = await initSqlJs({
    locateFile: (file: string) => {
      return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
    }
  })

  const dbPath = path.join(app.getPath('userData'), 'asset-manager.db')
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  
  initTables()
  initSeedData()
  saveDb()
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function saveDb(): void {
  if (!db) return
  const dbPath = path.join(app.getPath('userData'), 'asset-manager.db')
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

function query(sql: string, params: any[] = []): any[] {
  if (!db) return []
  try {
    const stmt = db.prepare(sql)
    stmt.bind(params)
    const results: any[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  } catch (e) {
    console.error('Query error:', e)
    console.error('SQL:', sql)
    console.error('Params:', params)
    return []
  }
}

function queryOne(sql: string, params: any[] = []): any | undefined {
  const results = query(sql, params)
  return results[0]
}

function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  if (!db) return { lastInsertRowid: 0, changes: 0 }
  try {
    db.run(sql, params)
    const lastId = queryOne('SELECT last_insert_rowid() as id')?.id || 0
    const changes = queryOne('SELECT changes() as cnt')?.cnt || 0
    if (!inTransaction) {
      saveDb()
    }
    return { lastInsertRowid: lastId, changes }
  } catch (e) {
    console.error('Run error:', e)
    console.error('SQL:', sql)
    console.error('Params:', params)
    throw e
  }
}

function exec(sql: string): void {
  if (!db) return
  try {
    db.run(sql)
    if (!inTransaction) {
      saveDb()
    }
  } catch (e) {
    console.error('Exec error:', e)
    console.error('SQL:', sql)
    throw e
  }
}

function beginTransaction(): void {
  if (inTransaction) return
  if (!db) return
  db.run('BEGIN')
  inTransaction = true
}

function commitTransaction(): void {
  if (!inTransaction || !db) return
  db.run('COMMIT')
  inTransaction = false
  saveDb()
}

function rollbackTransaction(): void {
  if (!inTransaction || !db) return
  db.run('ROLLBACK')
  inTransaction = false
}

function initTables() {
  exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      location TEXT,
      manager TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      manager TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      department_id INTEGER,
      position TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT UNIQUE,
      category TEXT NOT NULL,
      warehouse_id INTEGER,
      shelf TEXT,
      quantity INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier TEXT,
      expire_date TEXT,
      safety_stock INTEGER DEFAULT 0,
      photo_path TEXT,
      status TEXT DEFAULT '正常',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS stock_in (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE,
      asset_id INTEGER,
      asset_name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      category TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL,
      supplier TEXT,
      warehouse_id INTEGER,
      shelf TEXT,
      operator TEXT,
      photo_path TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS stock_out (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE,
      asset_id INTEGER,
      asset_name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      category TEXT,
      quantity INTEGER NOT NULL,
      applicant TEXT,
      department_id INTEGER,
      purpose TEXT,
      cost_center TEXT,
      warehouse_id INTEGER,
      operator TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_no TEXT UNIQUE,
      asset_id INTEGER,
      asset_name TEXT NOT NULL,
      model TEXT,
      serial_number TEXT,
      category TEXT,
      quantity INTEGER NOT NULL,
      from_warehouse_id INTEGER,
      from_shelf TEXT,
      to_warehouse_id INTEGER,
      to_shelf TEXT,
      operator TEXT,
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_no TEXT UNIQUE,
      check_date TEXT,
      asset_id INTEGER,
      asset_name TEXT,
      model TEXT,
      system_qty INTEGER,
      actual_qty INTEGER,
      diff_qty INTEGER,
      handler TEXT,
      status TEXT DEFAULT '待处理',
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    );

    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_warehouse ON assets(warehouse_id);
    CREATE INDEX IF NOT EXISTS idx_stock_in_date ON stock_in(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_out_date ON stock_out(created_at);
    CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(created_at);
  `)
}

function initSeedData() {
  const warehouseCount = queryOne('SELECT COUNT(*) as count FROM warehouses')
  if (!warehouseCount || warehouseCount.count === 0) {
    run('INSERT INTO warehouses (name, location, manager) VALUES (?, ?, ?)', ['主仓库', 'A栋1楼', '张三'])
    run('INSERT INTO warehouses (name, location, manager) VALUES (?, ?, ?)', ['备用仓', 'B栋2楼', '李四'])
    run('INSERT INTO warehouses (name, location, manager) VALUES (?, ?, ?)', ['耗材仓', 'C栋1楼', '王五'])
  }

  const deptCount = queryOne('SELECT COUNT(*) as count FROM departments')
  if (!deptCount || deptCount.count === 0) {
    run('INSERT INTO departments (name, manager) VALUES (?, ?)', ['技术部', '王经理'])
    run('INSERT INTO departments (name, manager) VALUES (?, ?)', ['行政部', '李经理'])
    run('INSERT INTO departments (name, manager) VALUES (?, ?)', ['财务部', '张经理'])
    run('INSERT INTO departments (name, manager) VALUES (?, ?)', ['市场部', '刘经理'])
    run('INSERT INTO departments (name, manager) VALUES (?, ?)', ['人力资源部', '陈经理'])
  }

  const empCount = queryOne('SELECT COUNT(*) as count FROM employees')
  if (!empCount || empCount.count === 0) {
    run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', ['张三', 1, '工程师'])
    run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', ['李四', 1, '工程师'])
    run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', ['王五', 2, '行政专员'])
    run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', ['赵六', 3, '会计'])
    run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', ['钱七', 4, '销售'])
  }

  const assetCount = queryOne('SELECT COUNT(*) as count FROM assets')
  if (!assetCount || assetCount.count === 0) {
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['ThinkPad X1 Carbon', 'X1 Gen11', 'SN20240001', '办公电脑', 1, 'A区-01架', 5, 8999, '联想', 2, '正常']
    )
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['MacBook Pro', 'M3 Pro', 'SN20240002', '笔记本电脑', 1, 'A区-02架', 3, 14999, '苹果', 1, '正常']
    )
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status, expire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['A4打印纸', '70g', '', '办公耗材', 3, 'B区-05架', 50, 25, '得力', 20, '正常', '2026-12-31']
    )
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['签字笔', '0.5mm黑色', '', '办公耗材', 3, 'B区-06架', 200, 2.5, '晨光', 50, '正常']
    )
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['笔记本电脑', 'ThinkBook 14', 'SN20240003', '周转设备', 2, 'C区-01架', 2, 4999, '联想', 1, '正常']
    )
    run(
      'INSERT INTO assets (name, model, serial_number, category, warehouse_id, shelf, quantity, unit_price, supplier, safety_stock, status, expire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['硒鼓', 'HP 1020', '', '办公耗材', 3, 'B区-03架', 5, 180, '惠普', 3, '正常', '2026-08-15']
    )
  }

  const stockInCount = queryOne('SELECT COUNT(*) as count FROM stock_in')
  if (!stockInCount || stockInCount.count === 0) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    run(
      'INSERT INTO stock_in (order_no, asset_id, asset_name, model, serial_number, category, quantity, unit_price, supplier, warehouse_id, shelf, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['RK202606010001', 1, 'ThinkPad X1 Carbon', 'X1 Gen11', 'SN20240001', '办公电脑', 5, 8999, '联想', 1, 'A区-01架', '管理员', now]
    )
  }

  const stockOutCount = queryOne('SELECT COUNT(*) as count FROM stock_out')
  if (!stockOutCount || stockOutCount.count === 0) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
    run(
      'INSERT INTO stock_out (order_no, asset_id, asset_name, model, serial_number, category, quantity, applicant, department_id, purpose, cost_center, warehouse_id, operator, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['CK202606050001', 3, 'A4打印纸', '70g', '', '办公耗材', 10, '王五', 2, '办公使用', '办公费用', 3, '管理员', now]
    )
  }
}

export { query, queryOne, run, exec, beginTransaction, commitTransaction, rollbackTransaction }
