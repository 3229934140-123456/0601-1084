import React, { useState, useEffect } from 'react'
import {
  Tabs,
  List,
  Card,
  Tag,
  Button,
  InputNumber,
  Space,
  message,
  Empty,
  Row,
  Col,
  Statistic,
  Alert
} from 'antd'
import {
  WarningOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type { Asset } from '../types'

const Warning: React.FC = () => {
  const [lowStockList, setLowStockList] = useState<Asset[]>([])
  const [expiringList, setExpiringList] = useState<Asset[]>([])
  const [expiringDays, setExpiringDays] = useState(30)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadLowStock()
    loadExpiring()
  }, [expiringDays])

  const loadLowStock = async () => {
    setLoading(true)
    try {
      const data = await window.api.asset.lowStock()
      setLowStockList(data)
    } catch (e) {
      message.error('加载库存预警数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadExpiring = async () => {
    setLoading(true)
    try {
      const data = await window.api.asset.expiring(expiringDays)
      setExpiringList(data)
    } catch (e) {
      message.error('加载临期数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSetSafetyStock = async (assetId: number, safetyStock: number) => {
    try {
      await window.api.asset.update(assetId, { safety_stock: safetyStock })
      message.success('设置成功')
      loadLowStock()
    } catch (e) {
      message.error('设置失败')
    }
  }

  const lowStockItems = [
    {
      key: 'lowStock',
      label: (
        <span>
          <WarningOutlined /> 库存预警
          {lowStockList.length > 0 && (
            <Tag color="orange" style={{ marginLeft: 8 }}>{lowStockList.length}</Tag>
          )}
        </span>
      ),
      children: (
        <div>
          <Alert
            type="warning"
            showIcon
            message="库存预警说明"
            description="以下物资库存数量已低于或接近安全库存阈值，请及时采购补货。"
            style={{ marginBottom: 16 }}
          />
          {lowStockList.length === 0 ? (
            <Empty
              description="暂无库存预警"
              style={{ padding: '60px 0' }}
            />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
              dataSource={lowStockList}
              renderItem={(item) => (
                <List.Item>
                  <Card
                    size="small"
                    className="warning-item low-stock"
                    style={{ borderLeft: '4px solid #fa8c16' }}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{item.name}</span>
                        <Tag color="orange">库存不足</Tag>
                      </div>
                    }
                    extra={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
                  >
                    <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                      型号：{item.model || '-'}
                    </div>
                    <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                      类别：{item.category}
                    </div>
                    <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                      存放位置：{item.warehouse_name || '-'} {item.shelf || ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <div>
                        <span style={{ fontSize: 24, fontWeight: 600, color: '#fa8c16' }}>
                          {item.quantity}
                        </span>
                        <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 4 }}>件</span>
                        <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>
                          / 安全库存 {item.safety_stock} 件
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
                        调整安全库存：
                      </div>
                      <Space>
                        <InputNumber
                          size="small"
                          min={0}
                          defaultValue={item.safety_stock}
                          onChange={(val) => {
                            if (val !== null) {
                              handleSetSafetyStock(item.id!, val)
                            }
                          }}
                        />
                        <Button type="link" size="small">
                          快速采购
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </div>
      )
    },
    {
      key: 'expiring',
      label: (
        <span>
          <ClockCircleOutlined /> 临期耗材
          {expiringList.length > 0 && (
            <Tag color="red" style={{ marginLeft: 8 }}>{expiringList.length}</Tag>
          )}
        </span>
      ),
      children: (
        <div>
          <Alert
            type="error"
            showIcon
            message="临期耗材提醒"
            description={
              <div>
                以下耗材将在 
                <InputNumber
                  size="small"
                  min={1}
                  max={365}
                  value={expiringDays}
                  onChange={(val) => val && setExpiringDays(val)}
                  style={{ width: 70, margin: '0 8px' }}
                />
                天内到期，请优先使用或及时处理。
              </div>
            }
            style={{ marginBottom: 16 }}
          />
          {expiringList.length === 0 ? (
            <Empty
              description="暂无临期耗材"
              style={{ padding: '60px 0' }}
            />
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
              dataSource={expiringList}
              renderItem={(item) => {
                const daysLeft = Math.ceil(
                  (new Date(item.expire_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                )
                return (
                  <List.Item>
                    <Card
                      size="small"
                      className="warning-item expiring"
                      style={{ borderLeft: '4px solid #ff4d4f' }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.name}</span>
                          <Tag color={daysLeft <= 7 ? 'red' : 'orange'}>
                            {daysLeft <= 0 ? '已过期' : `还剩${daysLeft}天`}
                          </Tag>
                        </div>
                      }
                      extra={<ClockCircleOutlined style={{ color: '#ff4d4f' }} />}
                    >
                      <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                        型号：{item.model || '-'}
                      </div>
                      <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                        类别：{item.category}
                      </div>
                      <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                        存放位置：{item.warehouse_name || '-'} {item.shelf || ''}
                      </div>
                      <div style={{ fontSize: 13, color: '#595959', marginBottom: 8 }}>
                        到期日期：{item.expire_date}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <div>
                          <span style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>
                            {item.quantity}
                          </span>
                          <span style={{ color: '#8c8c8c', fontSize: 12, marginLeft: 4 }}>件</span>
                        </div>
                        <Tag color={daysLeft <= 7 ? 'red' : 'orange'}>
                          {daysLeft <= 0 ? '已过期' : `${daysLeft}天后到期`}
                        </Tag>
                      </div>
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                        <Space>
                          <Button size="small" type="primary" danger>
                            优先领用
                          </Button>
                          <Button size="small">
                            报废处理
                          </Button>
                        </Space>
                      </div>
                    </Card>
                  </List.Item>
                )
              }}
            />
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="page-header">
        <div className="page-title">预警中心</div>
        <Button icon={<SettingOutlined />}>预警设置</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="库存预警数"
              value={lowStockList.length}
              suffix="种"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="临期耗材数"
              value={expiringList.length}
              suffix="种"
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="待处理预警"
              value={lowStockList.length + expiringList.length}
              suffix="项"
              valueStyle={{ color: '#faad14' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div className="table-container">
        <Tabs defaultActiveKey="lowStock" items={lowStockItems} />
      </div>
    </div>
  )
}

export default Warning
