import { contextBridge, ipcRenderer } from 'electron'

const api = {
  asset: {
    list: (params: any) => ipcRenderer.invoke('asset:list', params),
    get: (id: number) => ipcRenderer.invoke('asset:get', id),
    create: (asset: any) => ipcRenderer.invoke('asset:create', asset),
    update: (id: number, asset: any) => ipcRenderer.invoke('asset:update', id, asset),
    delete: (id: number) => ipcRenderer.invoke('asset:delete', id),
    lowStock: () => ipcRenderer.invoke('asset:lowStock'),
    expiring: (days: number) => ipcRenderer.invoke('asset:expiring', days),
    categories: () => ipcRenderer.invoke('asset:categories'),
    allForCheck: () => ipcRenderer.invoke('asset:allForCheck')
  },
  stockIn: {
    list: (params: any) => ipcRenderer.invoke('stockIn:list', params),
    create: (record: any) => ipcRenderer.invoke('stockIn:create', record),
    get: (id: number) => ipcRenderer.invoke('stockIn:get', id),
    getByOrderNo: (orderNo: string) => ipcRenderer.invoke('stockIn:getByOrderNo', orderNo)
  },
  stockOut: {
    list: (params: any) => ipcRenderer.invoke('stockOut:list', params),
    create: (record: any) => ipcRenderer.invoke('stockOut:create', record),
    get: (id: number) => ipcRenderer.invoke('stockOut:get', id),
    getByOrderNo: (orderNo: string) => ipcRenderer.invoke('stockOut:getByOrderNo', orderNo),
    monthlyConsumption: (yearMonth: string) => ipcRenderer.invoke('stockOut:monthlyConsumption', yearMonth),
    departmentConsumption: (yearMonth?: string) => ipcRenderer.invoke('stockOut:departmentConsumption', yearMonth)
  },
  transfer: {
    list: (params: any) => ipcRenderer.invoke('transfer:list', params),
    create: (record: any) => ipcRenderer.invoke('transfer:create', record),
    get: (id: number) => ipcRenderer.invoke('transfer:get', id)
  },
  inventoryCheck: {
    list: (params: any) => ipcRenderer.invoke('inventoryCheck:list', params),
    createBatch: (items: any[]) => ipcRenderer.invoke('inventoryCheck:createBatch', items),
    handleDiff: (id: number, handleType: 'adjust' | 'ignore', remark?: string) =>
      ipcRenderer.invoke('inventoryCheck:handleDiff', id, handleType, remark),
    getByNo: (checkNo: string) => ipcRenderer.invoke('inventoryCheck:getByNo', checkNo)
  },
  transaction: {
    list: (params: any) => ipcRenderer.invoke('transaction:list', params),
    monthlySummary: (yearMonth: string) => ipcRenderer.invoke('transaction:monthlySummary', yearMonth)
  },
  warehouse: {
    list: () => ipcRenderer.invoke('warehouse:list'),
    create: (warehouse: any) => ipcRenderer.invoke('warehouse:create', warehouse),
    update: (id: number, warehouse: any) => ipcRenderer.invoke('warehouse:update', id, warehouse),
    delete: (id: number) => ipcRenderer.invoke('warehouse:delete', id)
  },
  department: {
    list: () => ipcRenderer.invoke('department:list'),
    create: (dept: any) => ipcRenderer.invoke('department:create', dept),
    update: (id: number, dept: any) => ipcRenderer.invoke('department:update', id, dept)
  },
  employee: {
    list: (department_id?: number) => ipcRenderer.invoke('employee:list', department_id),
    create: (emp: any) => ipcRenderer.invoke('employee:create', emp),
    update: (id: number, emp: any) => ipcRenderer.invoke('employee:update', id, emp)
  },
  export: {
    excel: (data: any[], fileName: string, sheetName?: string) =>
      ipcRenderer.invoke('export:excel', data, fileName, sheetName)
  },
  print: {
    receipt: (type: string, data: any) => ipcRenderer.invoke('print:receipt', type, data)
  },
  file: {
    savePhoto: (base64Data: string, fileName: string) =>
      ipcRenderer.invoke('file:savePhoto', base64Data, fileName)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
