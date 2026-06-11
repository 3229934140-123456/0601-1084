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
  Tag
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  SwapOutlined,
  ExportOutlined
} from '@ant-design/icons'
import type { TransferRecord, Asset, Warehouse } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { TextArea } = Input

const Transfer: React.FC = () => {
  const [list, setList] = useState<TransferRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  useEffect(() => {
    loadList()
    loadWarehouses()
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
      if (values.from_warehouse_id) params.from_warehouse_id = values.from_warehouse_id
      if (values.to_warehouse_id) params.to_warehouse_id = values.to_warehouse_id

      const result = await window.api.transfer.list(params)
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
      from_warehouse_id: asset.warehouse_id,
      from_shelf: asset.shelf,
      quantity: 1
    })
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (!selectedAsset) {
        message.error('请选择调拨资产')
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

      await window.api.transfer.create(record)
      message.success('调拨成功')
      setModalOpen(false)
      loadList()
    } catch (e: any) {
      message.error(e.message || '调拨失败')
    }
  }

  const handleExport = async () => {
    const exportData = list.map(item => ({
      '调拨单号': item.transfer_no,
      '资产名称': item.asset_name,
      '型号': item.model || '',
      '序列号': item.serial_number || '',
      '类别': item.category || '',
      '数量': item.quantity,
      '源仓库': item.from_warehouse_name || '',
      '源货架': item.from_shelf || '',
      '目标仓库': item.to_warehouse_name || '',
      '目标货架': item.to_shelf || '',
      '经办人': item.operator || '',
      '调拨时间': item.created_at,
      '备注': item.remark || ''
    }))
    const result = await window.api.export.excel(
      exportData,
      `调拨记录_${dayjs().format('YYYYMMDD')}.xlsx`,
      '调拨记录'
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
      title: '调拨单号',
      dataIndex: 'transfer_no',
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
      title: '源仓库',
      dataIndex: 'from_warehouse_name',
      width: 100
    },
    {
      title: '源货架',
      dataIndex: 'from_shelf',
      width: 100
    },
    {
      title: '→',
      key: 'arrow',
      width: 40,
      align: 'center' as const,
      render: () => <SwapOutlined style={{ color: '#1890ff' }} />
    },
    {
      title: '目标仓库',
      dataIndex: 'to_warehouse_name',
      width: 100
    },
    {
      title: '目标货架',
      dataIndex: 'to_shelf',
      width: 100
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 100
    },
    {
      title: '调拨时间',
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

  return (
    <div>
      <div className="page-header">
        <div className="page-title">调拨管理</div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增调拨
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="本月调拨单" value={28} suffix="笔" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月调拨数量" value={156} suffix="件" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="涉及仓库" value={3} suffix="个" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="资产品类" value={32} suffix="种" />
          </Card>
        </Col>
      </Row>

      <div className="search-bar">
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="名称/单号/序列号" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="from_warehouse_id" label="源仓库">
            <Select placeholder="全部" style={{ width: 120 }} allowClear>
              {warehouses.map(w => (
                <Option key={w.id} value={w.id}>{w.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="to_warehouse_id" label="目标仓库">
            <Select placeholder="全部" style={{ width: 120 }} allowClear>
              {warehouses.map(w => (
                <Option key={w.id} value={w.id}>{w.name}</Option>
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
          scroll={{ x: 1600 }}
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
        title="资产调拨"
        open={modalOpen}
        width={700}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确认调拨"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="form-section">
            <div className="form-section-title">选择资产</div>
            <Form.Item
              name="asset_search"
              label="搜索资产"
              rules={[{ required: true, message: '请选择调拨资产' }]}
            >
              <AutoComplete
                placeholder="输入资产名称/型号/序列号搜索"
                options={assetOptions}
                onSearch={loadAssets}
                onSelect={(_, option: any) => handleSelectAsset(option.asset)}
                filterOption={false}
              />
            </Form.Item>
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
                  label="调拨数量"
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
                <Form.Item name="serial_number" label="序列号">
                  <Input readOnly />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <div className="form-section-title">调拨信息</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="from_warehouse_id"
                  label="源仓库"
                  rules={[{ required: true, message: '请选择源仓库' }]}
                >
                  <Select disabled>
                    {warehouses.map(w => (
                      <Option key={w.id} value={w.id}>{w.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="from_shelf" label="源货架">
                  <Input readOnly />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="to_warehouse_id"
                  label="目标仓库"
                  rules={[{ required: true, message: '请选择目标仓库' }]}
                >
                  <Select placeholder="请选择目标仓库">
                    {warehouses.map(w => (
                      <Option key={w.id} value={w.id}>{w.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="to_shelf" label="目标货架">
                  <Input placeholder="请输入目标货架位置" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Transfer
