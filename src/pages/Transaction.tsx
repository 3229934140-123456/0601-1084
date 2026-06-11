import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tabs,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  message,
  List,
  Empty,
  Form
} from 'antd'
import {
  SearchOutlined,
  ExportOutlined,
  BarChartOutlined,
  TeamOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import type { TransactionRecord } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const Transaction: React.FC = () => {
  const [list, setList] = useState<TransactionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('flow')
  const [monthlySummary, setMonthlySummary] = useState<any[]>([])
  const [departmentSummary, setDepartmentSummary] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format('YYYY-MM'))
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadList()
    loadCategories()
  }, [page, pageSize])

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlySummary()
    } else if (activeTab === 'department') {
      loadDepartmentSummary()
    }
  }, [activeTab, selectedMonth])

  const loadList = async () => {
    setLoading(true)
    try {
      const values = searchForm.getFieldsValue()
      const params: any = {
        page,
        pageSize
      }
      if (values.keyword) params.keyword = values.keyword
      if (values.type) params.type = values.type
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD')
        params.endDate = values.dateRange[1].format('YYYY-MM-DD')
      }
      if (values.category) params.category = values.category

      const result = await window.api.transaction.list(params)
      setList(result.list)
      setTotal(result.total)
    } catch (e) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    const data = await window.api.asset.categories()
    setCategories(data)
  }

  const loadMonthlySummary = async () => {
    try {
      const data = await window.api.transaction.monthlySummary(selectedMonth)
      setMonthlySummary(data)
    } catch (e) {
      message.error('加载月度汇总失败')
    }
  }

  const loadDepartmentSummary = async () => {
    try {
      const data = await window.api.stockOut.departmentConsumption(selectedMonth)
      setDepartmentSummary(data)
    } catch (e) {
      message.error('加载部门汇总失败')
    }
  }

  const handleSearch = () => {
    setPage(1)
    loadList()
  }

  const handleReset = () => {
    searchForm.resetFields()
    setPage(1)
    loadList()
  }

  const handleExportFlow = async () => {
    const exportData = list.map(item => ({
      '流水类型': item.type === 'in' ? '入库' : item.type === 'out' ? '出库' : '调拨',
      '单号': item.order_no,
      '资产名称': item.asset_name,
      '型号': item.model || '',
      '序列号': item.serial_number || '',
      '类别': item.category || '',
      '数量': item.quantity,
      '仓库': item.warehouse || '',
      '目标仓库': item.target_warehouse || '',
      '经办人': item.operator || '',
      '时间': item.created_at,
      '备注': item.remark || ''
    }))
    const result = await window.api.export.excel(
      exportData,
      `流水记录_${dayjs().format('YYYYMMDD')}.xlsx`,
      '流水记录'
    )
    if (result.success) {
      message.success('导出成功')
    } else {
      message.error('导出失败')
    }
  }

  const handleExportDepartment = async () => {
    const exportData = departmentSummary.map(item => ({
      '部门': item.department_name || '',
      '资产名称': item.asset_name,
      '类别': item.category || '',
      '型号': item.model || '',
      '领用数量': item.total_quantity || 0,
      '总金额(元)': (item.total_cost || 0).toFixed(2)
    }))
    const result = await window.api.export.excel(
      exportData,
      `部门领用明细_${selectedMonth}.xlsx`,
      '部门领用明细'
    )
    if (result.success) {
      message.success('导出成功')
    } else {
      message.error('导出失败')
    }
  }

  const typeMap: Record<string, { text: string; color: string }> = {
    in: { text: '入库', color: 'green' },
    out: { text: '出库', color: 'red' },
    transfer: { text: '调拨', color: 'blue' }
  }

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => (
        <Tag color={typeMap[type]?.color || 'default'}>
          {typeMap[type]?.text || type}
        </Tag>
      )
    },
    {
      title: '单号',
      dataIndex: 'order_no',
      width: 160
    },
    {
      title: '资产名称',
      dataIndex: 'asset_name',
      width: 150
    },
    {
      title: '型号',
      dataIndex: 'model',
      width: 120
    },
    {
      title: '序列号',
      dataIndex: 'serial_number',
      width: 150
    },
    {
      title: '类别',
      dataIndex: 'category',
      width: 100
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 80
    },
    {
      title: '仓库/源仓库',
      dataIndex: 'warehouse',
      width: 120
    },
    {
      title: '目标仓库',
      dataIndex: 'target_warehouse',
      width: 120,
      render: (val: string) => val || '-'
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 100
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 160
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 150,
      ellipsis: true
    }
  ]

  const tabItems = [
    {
      key: 'flow',
      label: '流水追踪',
      children: (
        <>
          <div className="search-bar">
            <Form form={searchForm} layout="inline">
              <Form.Item name="keyword" label="关键词">
                <Input placeholder="名称/单号/序列号" style={{ width: 200 }} allowClear />
              </Form.Item>
              <Form.Item name="type" label="类型">
                <Select placeholder="全部" style={{ width: 120 }} allowClear>
                  <Option value="in">入库</Option>
                  <Option value="out">出库</Option>
                  <Option value="transfer">调拨</Option>
                </Select>
              </Form.Item>
              <Form.Item name="category" label="类别">
                <Select placeholder="全部" style={{ width: 120 }} allowClear>
                  {categories.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="dateRange" label="日期">
                <RangePicker />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                    查询
                  </Button>
                  <Button onClick={handleReset}>重置</Button>
                  <Button icon={<ExportOutlined />} onClick={handleExportFlow}>
                    导出
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>

          <div className="table-container">
            <Table
              columns={columns}
              dataSource={list}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1400 }}
              pagination={{
                current: page,
                pageSize,
                total,
                onChange: (p, ps) => {
                  setPage(p)
                  setPageSize(ps)
                },
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条记录`
              }}
            />
          </div>
        </>
      )
    },
    {
      key: 'monthly',
      label: '月度汇总',
      children: (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>月度消耗汇总</div>
            <Space>
              <DatePicker
                picker="month"
                value={dayjs(selectedMonth)}
                onChange={(date) => date && setSelectedMonth(date.format('YYYY-MM'))}
              />
              <Button icon={<ExportOutlined />} onClick={() => {
                const exportData = monthlySummary.map(item => ({
                  '类别': item.category || '',
                  '资产名称': item.asset_name,
                  '型号': item.model || '',
                  '入库数量': item.in_qty || 0,
                  '出库数量': item.out_qty || 0,
                  '净变化': item.net_qty || 0
                }))
                window.api.export.excel(
                  exportData,
                  `月度汇总_${selectedMonth}.xlsx`,
                  '月度汇总'
                ).then(r => r.success ? message.success('导出成功') : message.error('导出失败'))
              }}>
                导出
              </Button>
            </Space>
          </div>
          {monthlySummary.length === 0 ? (
            <Empty description="本月暂无数据" style={{ padding: '60px 0' }} />
          ) : (
            <Table
              dataSource={monthlySummary}
              rowKey={(r) => `${r.category}-${r.asset_name}-${r.model}`}
              pagination={false}
              columns={[
                { title: '类别', dataIndex: 'category', width: 120 },
                { title: '资产名称', dataIndex: 'asset_name', width: 180 },
                { title: '型号', dataIndex: 'model', width: 150 },
                { 
                  title: '入库数量', 
                  dataIndex: 'in_qty', 
                  width: 120,
                  render: (val: number) => <Tag color="green">+{val || 0}</Tag>
                },
                { 
                  title: '出库数量', 
                  dataIndex: 'out_qty', 
                  width: 120,
                  render: (val: number) => <Tag color="red">-{val || 0}</Tag>
                },
                { 
                  title: '净变化', 
                  dataIndex: 'net_qty', 
                  width: 120,
                  render: (val: number) => {
                    const color = val > 0 ? 'green' : val < 0 ? 'red' : 'default'
                    const sign = val > 0 ? '+' : ''
                    return <Tag color={color}>{sign}{val || 0}</Tag>
                  }
                }
              ]}
            />
          )}
        </div>
      )
    },
    {
      key: 'department',
      label: '部门领用明细',
      children: (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>部门领用明细</div>
            <Space>
              <DatePicker
                picker="month"
                value={dayjs(selectedMonth)}
                onChange={(date) => date && setSelectedMonth(date.format('YYYY-MM'))}
              />
              <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportDepartment}>
                导出部门明细
              </Button>
            </Space>
          </div>
          {departmentSummary.length === 0 ? (
            <Empty description="本月暂无领用数据" style={{ padding: '60px 0' }} />
          ) : (
            <Table
              dataSource={departmentSummary}
              rowKey={(r) => `${r.department_name}-${r.asset_name}-${r.model}`}
              pagination={false}
              columns={[
                { title: '部门', dataIndex: 'department_name', width: 150 },
                { title: '资产名称', dataIndex: 'asset_name', width: 180 },
                { title: '类别', dataIndex: 'category', width: 120 },
                { title: '型号', dataIndex: 'model', width: 150 },
                { title: '领用数量', dataIndex: 'total_quantity', width: 120 },
                { 
                  title: '总金额(元)', 
                  dataIndex: 'total_cost', 
                  width: 120,
                  render: (val: number) => `￥${(val || 0).toFixed(2)}`
                }
              ]}
            />
          )}

          {departmentSummary.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                <TeamOutlined /> 部门领用统计
              </div>
              <Row gutter={16}>
                {Array.from(new Set(departmentSummary.map(d => d.department_name))).filter(Boolean).map(dept => {
                  const deptItems = departmentSummary.filter(d => d.department_name === dept)
                  const totalQty = deptItems.reduce((sum, item) => sum + (item.total_quantity || 0), 0)
                  const totalCost = deptItems.reduce((sum, item) => sum + (item.total_cost || 0), 0)
                  return (
                    <Col span={8} key={dept}>
                      <Card size="small" style={{ marginBottom: 16 }}>
                        <Card.Meta
                          title={dept}
                          description={
                            <div>
                              <div>领用数量：{totalQty} 件</div>
                              <div>总金额：￥{totalCost.toFixed(2)}</div>
                            </div>
                          }
                        />
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">流水查询</div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日流水" value={total} suffix="笔" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="入库数" value={156} suffix="笔" valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="出库数" value={198} suffix="笔" valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="调拨数" value={28} suffix="笔" valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  )
}

export default Transaction
