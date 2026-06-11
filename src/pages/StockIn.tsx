import React, { useState, useEffect, useRef } from 'react'
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
  Upload,
  message,
  Card,
  Row,
  Col,
  Statistic
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  CameraOutlined,
  PrinterOutlined,
  UploadOutlined
} from '@ant-design/icons'
import type { StockInRecord, Warehouse } from '../types'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { TextArea } = Input

const StockIn: React.FC = () => {
  const [list, setList] = useState<StockInRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [form] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = ['办公电脑', '笔记本电脑', '办公耗材', '周转设备', '其他']

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
      if (values.warehouse_id) params.warehouse_id = values.warehouse_id

      const result = await window.api.stockIn.list(params)
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
    setPhotoUrl('')
    setModalOpen(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTakePhoto = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      let photoPath = ''
      if (photoUrl) {
        const fileName = `stock_in_${Date.now()}.jpg`
        photoPath = await window.api.file.savePhoto(photoUrl, fileName)
      }

      const record = {
        ...values,
        photo_path: photoPath || undefined,
        operator: '管理员'
      }

      await window.api.stockIn.create(record)
      message.success('入库登记成功')
      setModalOpen(false)
      loadList()
    } catch (e: any) {
      message.error(e.message || '登记失败')
    }
  }

  const handlePrint = (record: StockInRecord) => {
    const printContent = `
      <div style="padding: 20px; font-family: Arial;">
        <h2 style="text-align: center;">入库单</h2>
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
            <td style="border: 1px solid #ccc; padding: 8px;">单价</td>
            <td style="border: 1px solid #ccc; padding: 8px;">￥${record.unit_price || 0}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">供应商</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.supplier || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">存放仓库</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.warehouse_name || '-'}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">货架</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${record.shelf || '-'}</td>
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

  const columns = [
    {
      title: '入库单号',
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
      title: '单价',
      dataIndex: 'unit_price',
      width: 100,
      render: (val: number) => val ? `￥${val.toFixed(2)}` : '-'
    },
    {
      title: '仓库',
      dataIndex: 'warehouse_name',
      width: 100
    },
    {
      title: '货架',
      dataIndex: 'shelf',
      width: 100
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      width: 100
    },
    {
      title: '登记时间',
      dataIndex: 'created_at',
      width: 160
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: StockInRecord) => (
        <Button type="link" size="small" onClick={() => handlePrint(record)}>
          <PrinterOutlined /> 打印
        </Button>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">入库管理</div>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增入库
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日入库单" value={8} suffix="笔" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="今日入库数量" value={32} suffix="件" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月入库金额" value={28560} prefix="￥" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月入库品类" value={15} suffix="种" />
          </Card>
        </Col>
      </Row>

      <div className="search-bar">
        <Form form={searchForm} layout="inline">
          <Form.Item name="keyword" label="关键词">
            <Input placeholder="名称/型号/单号" style={{ width: 200 }} allowClear />
          </Form.Item>
          <Form.Item name="warehouse_id" label="仓库">
            <Select placeholder="全部" style={{ width: 150 }} allowClear>
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
          scroll={{ x: 1300 }}
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
        title="入库登记"
        open={modalOpen}
        width={700}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText="确认入库"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="form-section">
            <div className="form-section-title">基本信息</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="asset_name"
                  label="资产名称"
                  rules={[{ required: true, message: '请输入资产名称' }]}
                >
                  <Input placeholder="请输入资产名称" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="资产类别"
                  rules={[{ required: true, message: '请选择类别' }]}
                >
                  <Select placeholder="请选择类别">
                    {categories.map(c => (
                      <Option key={c} value={c}>{c}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="model" label="型号">
                  <Input placeholder="请输入型号" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="serial_number" label="序列号">
                  <Input placeholder="请输入序列号/唯一标识" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <div className="form-section-title">采购信息</div>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="quantity"
                  label="数量"
                  rules={[{ required: true, message: '请输入数量' }]}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="unit_price" label="单价(元)">
                  <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="supplier" label="供应商">
                  <Input placeholder="供应商名称" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <div className="form-section-title">存放位置</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="warehouse_id"
                  label="存放仓库"
                  rules={[{ required: true, message: '请选择仓库' }]}
                >
                  <Select placeholder="请选择仓库">
                    {warehouses.map(w => (
                      <Option key={w.id} value={w.id}>{w.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="shelf" label="货架位置">
                  <Input placeholder="例如：A区-03架" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="form-section">
            <div className="form-section-title">照片留存</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {photoUrl ? (
                <img src={photoUrl} alt="照片" className="photo-preview" />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    border: '1px dashed #d9d9d9',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#bfbfbf',
                    fontSize: 12
                  }}
                >
                  暂无照片
                </div>
              )}
              <div>
                <Space direction="vertical">
                  <Button icon={<CameraOutlined />} onClick={handleTakePhoto}>
                    拍照/选择图片
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    支持拍照或上传图片
                  </div>
                </Space>
              </div>
            </div>
          </div>

          <Form.Item name="remark" label="备注">
            <TextArea rows={3} placeholder="请输入备注信息" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default StockIn
