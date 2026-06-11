import { query, queryOne, run } from '../database'

export interface Warehouse {
  id?: number
  name: string
  location?: string
  manager?: string
  created_at?: string
}

export function getWarehouses(): Warehouse[] {
  return query('SELECT * FROM warehouses ORDER BY id') as Warehouse[]
}

export function createWarehouse(warehouse: Omit<Warehouse, 'id' | 'created_at'>): number {
  const result = run('INSERT INTO warehouses (name, location, manager) VALUES (?, ?, ?)', [
    warehouse.name,
    warehouse.location || '',
    warehouse.manager || ''
  ])
  return result.lastInsertRowid
}

export function updateWarehouse(id: number, warehouse: Partial<Warehouse>): void {
  const fields = Object.keys(warehouse).filter(k => k !== 'id')
  if (fields.length === 0) return
  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (warehouse as any)[f])
  values.push(id)
  run(`UPDATE warehouses SET ${setClause} WHERE id = ?`, values)
}

export function deleteWarehouse(id: number): void {
  run('DELETE FROM warehouses WHERE id = ?', [id])
}

export interface Department {
  id?: number
  name: string
  manager?: string
  created_at?: string
}

export function getDepartments(): Department[] {
  return query('SELECT * FROM departments ORDER BY id') as Department[]
}

export function createDepartment(dept: Omit<Department, 'id' | 'created_at'>): number {
  const result = run('INSERT INTO departments (name, manager) VALUES (?, ?)', [
    dept.name,
    dept.manager || ''
  ])
  return result.lastInsertRowid
}

export function updateDepartment(id: number, dept: Partial<Department>): void {
  const fields = Object.keys(dept).filter(k => k !== 'id')
  if (fields.length === 0) return
  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (dept as any)[f])
  values.push(id)
  run(`UPDATE departments SET ${setClause} WHERE id = ?`, values)
}

export interface Employee {
  id?: number
  name: string
  department_id?: number
  department_name?: string
  position?: string
  created_at?: string
}

export function getEmployees(department_id?: number): Employee[] {
  if (department_id) {
    return query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.department_id = ?
      ORDER BY e.id
    `, [department_id]) as Employee[]
  }
  return query(`
    SELECT e.*, d.name as department_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY e.id
  `) as Employee[]
}

export function createEmployee(emp: Omit<Employee, 'id' | 'created_at' | 'department_name'>): number {
  const result = run('INSERT INTO employees (name, department_id, position) VALUES (?, ?, ?)', [
    emp.name,
    emp.department_id || null,
    emp.position || ''
  ])
  return result.lastInsertRowid
}

export function updateEmployee(id: number, emp: Partial<Employee>): void {
  const fields = Object.keys(emp).filter(k => k !== 'id' && k !== 'department_name')
  if (fields.length === 0) return
  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => (emp as any)[f])
  values.push(id)
  run(`UPDATE employees SET ${setClause} WHERE id = ?`, values)
}
