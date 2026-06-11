import React, { useState, useEffect, useCallback } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Tabs,
  Empty,
  Popconfirm,
  Drawer,
  Descriptions,
  Divider,
  Collapse
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  RightOutlined,
  DownOutlined
} from '@ant-design/icons'
import type { Asset, Warehouse, InventoryCheckRecord } from '../types'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface CheckGroupItem {
  check_no: string
  check_date: string
  total_items: number
  pending_count: number
}

interface CheckAssetItem extends Asset {
  _actual_qty?: number
}

const Inventory: React.FC = () => {
  const [list, setList] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [checkModalOpen, setCheckModalOpen] = useState(false)
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('list')
  const [checkGroups, setCheckGroups] = useState<CheckGroupItem[]>([])
  const [checkLoading, setCheckLoading] = useState(false)
  const [allAssets, setAllAssets] = useState<CheckAssetItem[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [detailDrawer, setDetailDrawer] = useState(false)
  const [diffRecord, setDiffRecord] = useState<InventoryCheckRecord | null>(null)
  const [expandedCheckNo, setExpandedCheckNo] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<InventoryCheckRecord[]>([])

  useEffect(() => {
    loadList()
    loadWarehouses()
    loadCategories()
  }, [page, pageSize])

  useEffect(() => {
    if (activeTab === 'check') {
      loadCheckGroups()
    }
  }, [activeTab])

  const loadList = async () => {
    setLoading(true)
    try {
      const values = searchForm.getFieldsValue()
      const params: any = { page, pageSize }
      if (values.keyword) params.keyword = values.keyword
      if (values.category) params.category = values.category
      if (values.warehouse_id) params.warehouse_id = values.warehouse_id
      if (values.status) params.status = values.status

      const result = await window.api.asset.list(params)
      setList(result.list)
      setTotal(result.total)
    } catch (e) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadWarehouses = async () => {
    const data = await window.api.warehouse.list()
    setWarehouses(data)
  }

  const loadCategories = async () => {
    const data = await window.api.asset.categories()
    setCategories(data)
  }

  const handleSearch = () => { setPage(1); loadList() }
  const handleReset = () => { searchForm.resetFields(); setPage(1); loadList() }
  const handleAdd = () => { setEditingId(null); form.resetFields(); setModalOpen(true) }
  const handleEdit = (record: Asset) => { setEditingId(record.id!); form.setFieldsValue(record); setModalOpen(true) }

  const handleDelete = async (id: number) => {
    try {
      await window.api.asset.delete(id)
      message.success('删除成功')
      loadList()
    } catch (e) {
      message.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingId) {
        await window.api.asset.update(editingId, values)
        message.success('更新成功')
      } else {
        await window.api.asset.create(values)
        message.success('添加成功')
      }
      setModalOpen(false)
      loadList()
      loadCategories()
    } catch (e: any) {
      message.error(e.message || '操作失败')
    }
  }

  const handleViewDetail = (record: Asset) => {
    setSelectedAsset(record)
    setDetailDrawer(true)
  }

  const loadCheckGroups = async () => {
    setCheckLoading(true)
    try {
      const result = await window.api.inventoryCheck.groupList({})
      setCheckGroups(result.list)
    } catch (e) {
      message.error('加载盘点记录失败')
    } finally {
      setCheckLoading(false)
    }
  }

  const handleExpandCheck = async (checkNo: string) => {
    if (expandedCheckNo === checkNo) {
      setExpandedCheckNo(null)
      setExpandedDetails([])
      return
    }
    try {
      const details = await window.api.inventoryCheck.getByNo(checkNo)
      setExpandedCheckNo(checkNo)
      setExpandedDetails(details)
    } catch (e) {
      message.error('加载盘点明细失败')
    }
  }

  const handleStartCheck = async () => {
    try {
      const assets = await window.api.asset.allForCheck()
      setAllAssets(assets.map(a => ({ ...a, _actual_qty: a.quantity })))
      setCheckModalOpen(true)
    } catch (e) {
      message.error('加载资产数据失败')
    }
  }

  const handleBatchCheck = async () => {
    try {
      const items = allAssets.map(a => ({
        asset_id: a.id!,
        actual_qty: a._actual_qty ?? a.quantity,
        handler: '管理员',
        remark: ''
      }))
      const result = await window.api.inventoryCheck.createBatch(items)
      const msg = `盘点单 ${result.check_no} 创建成功，共${result.success_count}项` + (result.fail_count > 0 ? `，${result.fail_count}项失败` : '')
      message.success(msg)
      setCheckModalOpen(false)
      await loadCheckGroups()
      setTimeout(async () => {
        const details = await window.api.inventoryCheck.getByNo(result.check_no)
        setExpandedCheckNo(result.check_no)
        setExpandedDetails(details)
      }, 100)
    } catch (e: any) {
      message.error(e.message || '创建盘点单失败')
    }
  }

  const handleDiffHandler = (record: InventoryCheckRecord) => {
    setDiffRecord(record)
    setDiffModalOpen(true)
  }

  const handleConfirmDiff = async (type: 'adjust' | 'ignore') => {
    if (!diffRecord) return
    try {
      await window.api.inventoryCheck.handleDiff(diffRecord.id!, type, '系统处理')
      message.success('处理成功')
      setDiffModalOpen(false)
      loadCheckGroups()
      if (expandedCheckNo) {
        const details = await window.api.inventoryCheck.getByNo(expandedCheckNo)
        setExpandedDetails(details)
      }
      loadList()
    } catch (e) {
      message.error('处理失败')
    }
  }

  const updateActualQty = (assetId: number, qty: number) => {
    setAllAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, _actual_qty: qty } : a
    ))
  }

  const columns = [
    {
      title: '资产名称', dataIndex: 'name', width: 150,
      render: (text: string, record: Asset) => <a onClick={() => handleViewDetail(record)}>{text}</a>
    },
    { title: '型号', dataIndex: 'model', width: 120 },
    { title: '序列号', dataIndex: 'serial_number', width: 150 },
    { title: '类别', dataIndex: 'category', width: 100 },
    {
      title: '库存数量', dataIndex: 'quantity', width: 100,
      render: (val: number, record: Asset) => {
        const isLow = record.safety_stock && val <= record.safety_stock
        return <Tag color={isLow ? 'orange' : 'green'}>{val}{isLow && ' ⚠'}</Tag>
      }
    },
    { title: '单价', dataIndex: 'unit_price', width: 100, render: (val: number) => val ? `￥${val.toFixed(2)}` : '-' },
    { title: '仓库', dataIndex: 'warehouse_name', width: 100 },
    { title: '货架', dataIndex: 'shelf', width: 100 },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (status: string) => {
        const colorMap: Record<string, string> = { '正常': 'green', '预警': 'orange', '停用': 'red' }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      }
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160 },
    {
      title: '操作', key: 'action', width: 180, fixed: 'right' as const,
      render: (_: any, record: Asset) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>详情</Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id!)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const checkDetailColumns = [
    { title: '资产名称', dataIndex: 'asset_name', width: 150 },
    { title: '型号', dataIndex: 'model', width: 120 },
    { title: '系统数量', dataIndex: 'system_qty', width: 100 },
    { title: '实际数量', dataIndex: 'actual_qty', width: 100 },
    {
      title: '差异', dataIndex: 'diff_qty', width: 100,
      render: (val: number) => {
        if (val === 0) return <Tag color="green">0</Tag>
        return <Tag color={val > 0 ? 'blue' : 'red'}>{val > 0 ? '+' : ''}{val}</Tag>
      }
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = { '待处理': 'orange', '已调整': 'green', '已忽略': 'default' }
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>
      }
    },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right' as const,
      render: (_: any, record: InventoryCheckRecord) => (
        record.status === '待处理' && record.diff_qty !== 0 ? (
          <Button type="link" size="small" onClick={() => handleDiffHandler(record)}>处理差异</Button>
        ) : <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.remark || '-'}</span>
      )
    }
  ]

  const tabItems = [
    {
      key: 'list',
      label: '库存列表',
      children: (
        <>
          <div className="search-bar">
            <Form form={searchForm} layout="inline">
              <Form.Item name="keyword" label="关键词">
                <Input placeholder="名称/型号/序列号" style={{ width: 200 }} allowClear />
              </Form.Item>
              <Form.Item name="category" label="类别">
                <Select placeholder="全部" style={{ width: 120 }} allowClear>
                  {categories.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="warehouse_id" label="仓库">
                <Select placeholder="全部" style={{ width: 120 }} allowClear>
                  {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select placeholder="全部" style={{ width: 120 }} allowClear>
                  <Option value="正常">正常</Option>
                  <Option value="预警">预警</Option>
                  <Option value="停用">停用</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
                  <Button onClick={handleReset}>重置</Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
          <div className="table-container">
            <Table columns={columns} dataSource={list} rowKey="id" loading={loading} scroll={{ x: 1300 }}
              pagination={{ current: page, pageSize, total, onChange: (p, ps) => { setPage(p); setPageSize(ps) }, showSizeChanger: true, showTotal: (t) => `共 ${t} 条记录` }}
            />
          </div>
        </>
      )
    },
    {
      key: 'check',
      label: '批量盘点',
      children: (
        <div className="table-container">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>盘点记录</div>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleStartCheck}>
              开始盘点
            </Button>
          </div>

          {checkGroups.length === 0 && !checkLoading ? (
            <Empty description="暂无盘点记录" style={{ padding: '60px 0' }}>
              <Button type="primary" onClick={handleStartCheck}>开始第一次盘点</Button>
            </Empty>
          ) : (
            <div>
              {checkGroups.map(group => (
                <div key={group.check_no} style={{ marginBottom: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: expandedCheckNo === group.check_no ? '#fafafa' : '#fff'
                    }}
                    onClick={() => handleExpandCheck(group.check_no)}
                  >
                    <Space>
                      {expandedCheckNo === group.check_no ? <DownOutlined /> : <RightOutlined />}
                      <span style={{ fontWeight: 600 }}>{group.check_no}</span>
                      <Tag>{group.check_date}</Tag>
                      <span style={{ color: '#8c8c8c', fontSize: 13 }}>共 {group.total_items} 项</span>
                      {group.pending_count > 0 && (
                        <Tag color="orange">{group.pending_count} 项待处理</Tag>
                      )}
                      {group.pending_count === 0 && (
                        <Tag color="green">已处理完毕</Tag>
                      )}
                    </Space>
                  </div>
                  {expandedCheckNo === group.check_no && (
                    <div style={{ padding: '0 16px 16px' }}>
                      <Table
                        columns={checkDetailColumns}
                        dataSource={expandedDetails}
                        rowKey="id"
                        size="small"
                        pagination={false}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">库存管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增资产</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="资产总数" value={total} suffix="种" /></Card></Col>
        <Col span={6}><Card><Statistic title="库存总数量" value={2856} suffix="件" /></Card></Col>
        <Col span={6}><Card><Statistic title="库存总价值" value={258600} prefix="￥" /></Card></Col>
        <Col span={6}><Card><Statistic title="预警品类" value={5} suffix="种" valueStyle={{ color: '#fa8c16' }} /></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title={editingId ? '编辑资产' : '新增资产'}
        open={modalOpen}
        width={650}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="资产名称" rules={[{ required: true, message: '请输入资产名称' }]}>
                <Input placeholder="请输入资产名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="资产类别" rules={[{ required: true, message: '请选择类别' }]}>
                <Select placeholder="请选择类别">
                  <Option value="办公电脑">办公电脑</Option>
                  <Option value="笔记本电脑">笔记本电脑</Option>
                  <Option value="办公耗材">办公耗材</Option>
                  <Option value="周转设备">周转设备</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="model" label="型号"><Input placeholder="请输入型号" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="serial_number" label="序列号"><Input placeholder="唯一序列号/编码" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quantity" label="库存数量" rules={[{ required: true, message: '请输入数量' }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit_price" label="单价(元)"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="safety_stock" label="安全库存"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="warehouse_id" label="所属仓库" rules={[{ required: true, message: '请选择仓库' }]}>
                <Select placeholder="请选择仓库">
                  {warehouses.map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shelf" label="货架位置"><Input placeholder="例如：A区-03架" /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier" label="供应商"><Input placeholder="供应商名称" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="expire_date" label="到期日期"><Input type="date" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="状态">
            <Select><Option value="正常">正常</Option><Option value="停用">停用</Option></Select>
          </Form.Item>
          <Form.Item name="remark" label="备注"><TextArea rows={3} placeholder="请输入备注信息" /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量盘点"
        open={checkModalOpen}
        width={900}
        onOk={handleBatchCheck}
        onCancel={() => setCheckModalOpen(false)}
        okText="生成盘点单"
        cancelText="取消"
      >
        <div style={{ marginBottom: 16, color: '#8c8c8c', fontSize: 13 }}>
          请核对实际库存数量。「系统数量」为当前系统记录值，不可修改；「实际数量」为盘点实际数，请根据实际情况填写。
        </div>
        <div style={{ maxHeight: 500, overflow: 'auto' }}>
          <Table
            dataSource={allAssets}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: '资产名称', dataIndex: 'name', width: 140 },
              { title: '型号', dataIndex: 'model', width: 110 },
              { title: '类别', dataIndex: 'category', width: 90 },
              { title: '仓库', dataIndex: 'warehouse_name', width: 90 },
              {
                title: '系统数量',
                dataIndex: 'quantity',
                width: 100,
                render: (val: number) => (
                  <span style={{ fontWeight: 600, color: '#262626' }}>{val}</span>
                )
              },
              {
                title: '实际数量',
                dataIndex: '_actual_qty',
                width: 120,
                render: (_: any, record: CheckAssetItem) => (
                  <InputNumber
                    min={0}
                    size="small"
                    value={record._actual_qty ?? record.quantity}
                    onChange={(val) => updateActualQty(record.id!, val ?? 0)}
                    style={{ width: '100%' }}
                  />
                )
              },
              {
                title: '差异',
                width: 80,
                render: (_: any, record: CheckAssetItem) => {
                  const diff = (record._actual_qty ?? record.quantity) - record.quantity
                  if (diff === 0) return <Tag color="green">0</Tag>
                  return <Tag color={diff > 0 ? 'blue' : 'red'}>{diff > 0 ? '+' : ''}{diff}</Tag>
                }
              }
            ]}
          />
        </div>
      </Modal>

      <Modal
        title="处理库存差异"
        open={diffModalOpen}
        width={500}
        footer={null}
        onCancel={() => setDiffModalOpen(false)}
      >
        {diffRecord && (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>盘点单号</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{diffRecord.check_no}</div>
            </div>
            <div style={{ marginBottom: 16, fontSize: 14 }}>
              <strong>{diffRecord.asset_name}</strong>
              {diffRecord.model && <span style={{ color: '#8c8c8c', marginLeft: 8 }}>{diffRecord.model}</span>}
            </div>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#f5f5f5', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>系统数量</div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{diffRecord.system_qty}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: '#e6f7ff', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>实际数量</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>{diffRecord.actual_qty}</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '16px 0', background: diffRecord.diff_qty! > 0 ? '#f6ffed' : '#fff2f0', borderRadius: 6 }}>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>差异</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: diffRecord.diff_qty! > 0 ? '#52c41a' : '#ff4d4f' }}>
                    {diffRecord.diff_qty! > 0 ? '+' : ''}{diffRecord.diff_qty}
                  </div>
                </div>
              </Col>
            </Row>
            <Divider />
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => handleConfirmDiff('ignore')}>
                  <ExclamationCircleOutlined /> 忽略差异
                </Button>
                <Button type="primary" onClick={() => handleConfirmDiff('adjust')}>
                  <CheckCircleOutlined /> 调整库存
                </Button>
              </Space>
            </div>
          </>
        )}
      </Modal>

      <Drawer
        title="资产详情"
        open={detailDrawer}
        width={600}
        onClose={() => setDetailDrawer(false)}
      >
        {selectedAsset && (
          <>
            <Descriptions title="基本信息" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="资产名称" span={2}>{selectedAsset.name}</Descriptions.Item>
              <Descriptions.Item label="类别">{selectedAsset.category}</Descriptions.Item>
              <Descriptions.Item label="状态">{selectedAsset.status}</Descriptions.Item>
              <Descriptions.Item label="型号">{selectedAsset.model || '-'}</Descriptions.Item>
              <Descriptions.Item label="序列号">{selectedAsset.serial_number || '-'}</Descriptions.Item>
              <Descriptions.Item label="库存数量">
                <Tag color={selectedAsset.quantity > (selectedAsset.safety_stock || 0) ? 'green' : 'orange'}>{selectedAsset.quantity}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="安全库存">{selectedAsset.safety_stock || 0}</Descriptions.Item>
              <Descriptions.Item label="单价">{selectedAsset.unit_price ? `￥${selectedAsset.unit_price.toFixed(2)}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="总价值">￥{((selectedAsset.quantity || 0) * (selectedAsset.unit_price || 0)).toFixed(2)}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="存放位置" bordered column={2} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="所属仓库">{selectedAsset.warehouse_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="货架位置">{selectedAsset.shelf || '-'}</Descriptions.Item>
              <Descriptions.Item label="供应商" span={2}>{selectedAsset.supplier || '-'}</Descriptions.Item>
              <Descriptions.Item label="到期日期" span={2}>{selectedAsset.expire_date || '-'}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="其他信息" bordered column={2}>
              <Descriptions.Item label="创建时间">{selectedAsset.created_at}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{selectedAsset.updated_at}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{selectedAsset.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  )
}

export default Inventory
