import { ipcMain } from 'electron'
import * as assetService from './services/assetService'
import * as stockInService from './services/stockInService'
import * as stockOutService from './services/stockOutService'
import * as transferService from './services/transferService'
import * as inventoryCheckService from './services/inventoryCheckService'
import * as transactionService from './services/transactionService'
import * as basicService from './services/basicService'
import * as XLSX from 'xlsx'
import { dialog } from 'electron'
import fs from 'fs'

export function registerIpcHandlers() {
  ipcMain.handle('asset:list', async (_, params) => {
    return assetService.getAssets(params)
  })

  ipcMain.handle('asset:get', async (_, id: number) => {
    return assetService.getAssetById(id)
  })

  ipcMain.handle('asset:create', async (_, asset) => {
    return assetService.createAsset(asset)
  })

  ipcMain.handle('asset:update', async (_, id: number, asset) => {
    assetService.updateAsset(id, asset)
    return true
  })

  ipcMain.handle('asset:delete', async (_, id: number) => {
    assetService.deleteAsset(id)
    return true
  })

  ipcMain.handle('asset:lowStock', async () => {
    return assetService.getLowStockAssets()
  })

  ipcMain.handle('asset:expiring', async (_, days: number) => {
    return assetService.getExpiringAssets(days)
  })

  ipcMain.handle('asset:categories', async () => {
    return assetService.getCategories()
  })

  ipcMain.handle('asset:allForCheck', async () => {
    return assetService.getAllAssetsForCheck()
  })

  ipcMain.handle('stockIn:list', async (_, params) => {
    return stockInService.getStockInList(params)
  })

  ipcMain.handle('stockIn:create', async (_, record) => {
    return stockInService.createStockIn(record)
  })

  ipcMain.handle('stockIn:get', async (_, id: number) => {
    return stockInService.getStockInById(id)
  })

  ipcMain.handle('stockIn:getByOrderNo', async (_, orderNo: string) => {
    return stockInService.getStockInByOrderNo(orderNo)
  })

  ipcMain.handle('stockOut:list', async (_, params) => {
    return stockOutService.getStockOutList(params)
  })

  ipcMain.handle('stockOut:create', async (_, record) => {
    try {
      return stockOutService.createStockOut(record)
    } catch (e: any) {
      throw new Error(e.message)
    }
  })

  ipcMain.handle('stockOut:get', async (_, id: number) => {
    return stockOutService.getStockOutById(id)
  })

  ipcMain.handle('stockOut:getByOrderNo', async (_, orderNo: string) => {
    return stockOutService.getStockOutByOrderNo(orderNo)
  })

  ipcMain.handle('stockOut:monthlyConsumption', async (_, yearMonth: string) => {
    return stockOutService.getMonthlyConsumption(yearMonth)
  })

  ipcMain.handle('stockOut:departmentConsumption', async (_, yearMonth?: string) => {
    return stockOutService.getDepartmentConsumption(yearMonth)
  })

  ipcMain.handle('transfer:list', async (_, params) => {
    return transferService.getTransferList(params)
  })

  ipcMain.handle('transfer:create', async (_, record) => {
    try {
      return transferService.createTransfer(record)
    } catch (e: any) {
      throw new Error(e.message)
    }
  })

  ipcMain.handle('transfer:get', async (_, id: number) => {
    return transferService.getTransferById(id)
  })

  ipcMain.handle('inventoryCheck:list', async (_, params) => {
    return inventoryCheckService.getInventoryCheckList(params)
  })

  ipcMain.handle('inventoryCheck:createBatch', async (_, items) => {
    return inventoryCheckService.createBatchCheck(items)
  })

  ipcMain.handle('inventoryCheck:handleDiff', async (_, id: number, handleType: 'adjust' | 'ignore', remark?: string) => {
    inventoryCheckService.handleCheckDiff(id, handleType, remark)
    return true
  })

  ipcMain.handle('inventoryCheck:getByNo', async (_, checkNo: string) => {
    return inventoryCheckService.getCheckByNo(checkNo)
  })

  ipcMain.handle('transaction:list', async (_, params) => {
    return transactionService.getTransactionList(params)
  })

  ipcMain.handle('transaction:monthlySummary', async (_, yearMonth: string) => {
    return transactionService.getMonthlySummary(yearMonth)
  })

  ipcMain.handle('warehouse:list', async () => {
    return basicService.getWarehouses()
  })

  ipcMain.handle('warehouse:create', async (_, warehouse) => {
    return basicService.createWarehouse(warehouse)
  })

  ipcMain.handle('warehouse:update', async (_, id: number, warehouse) => {
    basicService.updateWarehouse(id, warehouse)
    return true
  })

  ipcMain.handle('warehouse:delete', async (_, id: number) => {
    basicService.deleteWarehouse(id)
    return true
  })

  ipcMain.handle('department:list', async () => {
    return basicService.getDepartments()
  })

  ipcMain.handle('department:create', async (_, dept) => {
    return basicService.createDepartment(dept)
  })

  ipcMain.handle('department:update', async (_, id: number, dept) => {
    basicService.updateDepartment(id, dept)
    return true
  })

  ipcMain.handle('employee:list', async (_, department_id?: number) => {
    return basicService.getEmployees(department_id)
  })

  ipcMain.handle('employee:create', async (_, emp) => {
    return basicService.createEmployee(emp)
  })

  ipcMain.handle('employee:update', async (_, id: number, emp) => {
    basicService.updateEmployee(id, emp)
    return true
  })

  ipcMain.handle('export:excel', async (_, data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出Excel',
        defaultPath: fileName,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      })

      if (result.canceled || !result.filePath) {
        return { success: false }
      }

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, result.filePath)

      return { success: true, filePath: result.filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('print:receipt', async (_, type: string, data: any) => {
    return { success: true, type, data }
  })

  ipcMain.handle('file:savePhoto', async (_, base64Data: string, fileName: string) => {
    const { app } = require('electron')
    const path = require('path')
    const photoDir = path.join(app.getPath('userData'), 'photos')
    if (!fs.existsSync(photoDir)) {
      fs.mkdirSync(photoDir, { recursive: true })
    }
    const filePath = path.join(photoDir, fileName)
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'))
    return filePath
  })
}
