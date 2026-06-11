import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Card,
  Row,
  Col,
  Statistic,
  AutoComplete,
  Tag,
  Drawer,
  Descriptions,
  Divider
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  PrinterOutlined,
  ExportOutlined,
  EyeOutlined
} from '@ant-design/icons'
import type { StockOutRecord, Asset, Department, Employee, Warehouse } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { TextArea } = Input

const StockOut: React.FC = () => {
  const [list, setList] = useState<StockOutRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [detailDrawer, setDetailDrawer] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<StockOutRecord | null>(null)

  useEffect(() => {
    loadList()
    loadBasicData()
  }, [page, pageSize])

  const loadList = async () => {
    setLoading(true)
    try {
      const values = searchForm.getFieldsValue()
      const params: any = {
        page,
        pageSize
      }
      if (values.keyword) params.keyword = values.keyword
      if (values.dateRange) {
        params.startDate = values.dateRange[0].format('YYYY-MM-DD')
        params.endDate = values.dateRange[1].format('YYYY-MM-DD')
      }
      if (values.department_id) params.department_id = values.department_id

      const result = await window.api.stockOut.list(params)
      setList(result.list)
      setTotal(result.total)
    } catch (e) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadBasicData = async () => {
    const [depts, emps, whs] = await Promise.all([
      window.api.department.list(),
      window.api.employee.list(),
      window.api.warehouse.list()
    ])
    setDepartments(depts)
    setEmployees(emps)
    setWarehouses(whs)
  }

  const loadAssets = async (keyword: string) => {
    if (!keyword) {
      setAssets([])
      return
    }
    const result = await window.api.asset.list({ keyword, pageSize: 20 })
    setAssets(result.list)
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

  const handleAdd = () => {
    form.resetFields()
    setSelectedAsset(null)
    setModalOpen(true)
  }

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset)
    form.setFieldsValue({
      asset_id: asset.id,
      asset_name: asset.name,
      model: asset.model,
      serial_number: asset.serial_number,
      category: asset.category,
      warehouse_id: asset.warehouse_id,
      unit_price: asset.unit_price
    })
  }

  const handleDeptChange = (deptId: number) => {
    form.setFieldsValue({ applicant: undefined })
    if (deptId) {
      window.api.employee.list(deptId).then(emps => {
        setEmployees(emps)
      })
    } else {
      window.api.employee.list().then(emps => {
        setEmployees(emps)
      })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!selectedAsset) {
        message.error('请选择出库资产')
        return
      }

      const record = {
        ...values,
        asset_id: selectedAsset.id,
        asset_name: selectedAsset.name,
        model: selectedAsset.model,
        serial_number: selectedAsset.serial_number,
        category: selectedAsset.category,
        operator: '管理员'
      }

      await window.api.stockOut.create(record)
      message.success('出库登记成功')
      setModalOpen(false)
      loadList()
    } catch (e: any) {
      message.error(e.message || '登记失败')
    }
  }

  const handlePrint = (record: StockOutRecord) => {
    const printContent = `
      <div style="padding: 20px; font-family: Arial;">
        <h2 style="text-align: center;">出库单</h2>
        <div style="margin-bottom: 10px;">单号：${record.order_no}</div>
        <div style="margin-bottom: 10px;">日期：${record.created_at}</div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px; width: 120px;">资产名称</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.asset_name}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">型号</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.model || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">序列号</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.serial_number || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">类别</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.category || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">数量</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.quantity}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">申请人</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.applicant || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">所属部门</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.department_name || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">用途</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.purpose || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">成本归属</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.cost_center || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">出库仓库</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.warehouse_name || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">经办人</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.operator || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">备注</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.remark || '-'}</td>
          </tr>
        </table>
        <div style="margin-top: 40px; display: flex; justify-content: space-between;">
          <div>领用人签字：</div>
          <div>仓管员签字：</div>
          <div>日期：${dayjs().format('YYYY年MM月DD日')}</div>
        </div>
      </div>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleViewDetail = (record: StockOutRecord) => {
    setCurrentRecord(record)
    setDetailDrawer(true)
  }

  const handleExport = async () => {
    const exportData = list.map(item => ({
      '出库单号': item.order_no,
      '资产名称': item.asset_name,
      '型号': item.model || '',
      '序列号': item.serial_number || '',
      '类别': item.category || '',
      '数量': item.quantity,
      '申请人': item.applicant || '',
      '部门': item.department_name || '',
      '用途': item.purpose || '',
      '成本归属': item.cost_center || '',
      '出库仓库': item.warehouse_name || '',
      '经办人': item.operator || '',
      '出库时间': item.created_at,
      '备注': item.remark || ''
    }))
    const result = await window.api.export.excel(
      exportData,
      `出库记录_${dayjs().format('YYYYMMDD')}.xlsx`,
      '出库记录'
    )
    if (result.success) {
      message.success('导出成功')
    } else {
      message.error('导出失败')
    }
  }

  const assetOptions = assets.map(a => ({
    value: a.name,
    label: (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{a.name}</span>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
          库存: {a.quantity} | {a.warehouse_name}
        </span>
      </div>
    ),
    asset: a
  }))

  const columns = [
    {
      title: '出库单号',
      dataIndex: 'order_no',
      width: 160,
      render: (text: string, record: StockOutRecord) => (
        <a onClick={() => handleViewDetail(record)}>{text}</a>
      )
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
      title: '申请人',
      dataIndex: 'applicant',
      width: 100
    },
    {
      title: '部门',
      dataIndex: 'department_name',
      width: 100
    },
    {
      title: '用途',
      dataIndex: 'purpose',
      width: 120,
      ellipsis: true
    },
    {
      title: '成本归属',
      dataIndex: 'cost_center',
      width: 100
    },
    {
      title: '出库时间',
      dataIndex: 'created_at',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: StockOutRecord) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          <Button type="link" size="small" onClick={() => handlePrint(record)}>
            <PrinterOutlined /> 打印
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">出库管理</div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增出库
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日出库单" value={12} suffix="笔" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日出库数量" value={45} suffix="件" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月出库金额" value={15680} prefix="￥" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="领用部门" value={8} suffix="个" />
          </Card>
        </Col>
      </Row>

      <div className="search-bar">
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="名称/单号/申请人" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="department_id" label="部门">
            <Select placeholder="全部" style={{ width: 150 }} allowClear>
              {departments.map(d => (
                <Option key={d.id} value={d.id}>{d.name}</Option>
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

      <Modal
        title="出库登记"
        open={modalOpen}
        width={700}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确认出库"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="form-section">
            <div className="form-section-title">选择资产</div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="asset_search"
                  label="搜索资产"
                  rules={[{ required: true, message: '请选择出库资产' }]}
                >
                  <AutoComplete
                    placeholder="输入资产名称/型号/序列号搜索"
                    options={assetOptions}
                    onSearch={loadAssets}
                    onSelect={(_, option: any) => handleSelectAsset(option.asset)}
                    filterOption={false}
                  />
                </Form.Item>
              </Col>
            </Row>
            {selectedAsset && (
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span><strong>{selectedAsset.name}</strong></span>
                  <Tag color={selectedAsset.quantity > 0 ? 'green' : 'red'}>
                    库存: {selectedAsset.quantity}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  型号: {selectedAsset.model || '-'} | 
                  序列号: {selectedAsset.serial_number || '-'} | 
                  仓库: {selectedAsset.warehouse_name || '-'} |
                  货架: {selectedAsset.shelf || '-'}
                </div>
              </div>
            )}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="asset_name" label="资产名称">
                  <Input readOnly />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="category" label="类别">
                  <Input readOnly />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="quantity"
                  label="出库数量"
                  rules={[{ required: true, message: '请输入数量' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="model" label="型号">
                  <Input readOnly />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="warehouse_id" label="出库仓库">
                  <Select disabled>
                    {warehouses.map(w => (
                      <Option key={w.id} value={w.id}>{w.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <div className="form-section-title">领用信息</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="department_id"
                  label="所属部门"
                  rules={[{ required: true, message: '请选择部门' }]}
                >
                  <Select placeholder="请选择部门" onChange={handleDeptChange}>
                    {departments.map(d => (
                      <Option key={d.id} value={d.id}>{d.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="applicant"
                  label="申请人"
                  rules={[{ required: true, message: '请选择/输入申请人' }]}
                >
                  <Select
                    placeholder="请选择申请人"
                    showSearch
                    optionFilterProp="children"
                  >
                    {employees.map(e => (
                      <Option key={e.id} value={e.name}>{e.name} ({e.department_name || '-'})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="purpose"
                  label="用途"
                  rules={[{ required: true, message: '请填写用途' }]}
                >
                  <Input placeholder="请填写领用用途" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cost_center" label="成本归属">
                  <Select placeholder="请选择成本中心" allowClear>
                    <Option value="办公费用">办公费用</Option>
                    <Option value="研发费用">研发费用</Option>
                    <Option value="销售费用">销售费用</Option>
                    <Option value="生产费用">生产费用</Option>
                    <Option value="管理费用">管理费用</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="出库单详情"
        open={detailDrawer}
        width={600}
        onClose={() => setDetailDrawer(false)}
        extra={
          currentRecord && (
            <Button type="primary" size="small" icon={<PrinterOutlined />} onClick={() => handlePrint(currentRecord)}>
              打印
            </Button>
          )
        }
      >
        {currentRecord && (
          <>
            <Descriptions title="基本信息" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="出库单号" span={2}>{currentRecord.order_no}</Descriptions.Item>
              <Descriptions.Item label="资产名称">{currentRecord.asset_name}</Descriptions.Item>
              <Descriptions.Item label="类别">{currentRecord.category || '-'}</Descriptions.Item>
              <Descriptions.Item label="型号">{currentRecord.model || '-'}</Descriptions.Item>
              <Descriptions.Item label="序列号">{currentRecord.serial_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="出库数量">
                <Tag color="blue">{currentRecord.quantity}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="出库仓库">{currentRecord.warehouse_name || '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="领用信息" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="申请人">{currentRecord.applicant || '-'}</Descriptions.Item>
              <Descriptions.Item label="部门">{currentRecord.department_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="用途" span={2}>{currentRecord.purpose || '-'}</Descriptions.Item>
              <Descriptions.Item label="成本归属" span={2}>{currentRecord.cost_center || '-'}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="其他信息" bordered column={2}>
              <Descriptions.Item label="经办人">{currentRecord.operator || '-'}</Descriptions.Item>
              <Descriptions.Item label="出库时间">{currentRecord.created_at}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{currentRecord.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  )
}

export default StockOut
