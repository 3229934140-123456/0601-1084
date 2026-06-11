import React, { useState } from 'react'
import { Layout, Menu, theme } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  ImportOutlined,
  UnorderedListOutlined,
  ExportOutlined,
  SwapOutlined,
  BellOutlined,
  HistoryOutlined,
  AppstoreOutlined
} from '@ant-design/icons'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: '/stock-in',
    icon: <ImportOutlined />,
    label: '入库管理'
  },
  {
    key: '/inventory',
    icon: <UnorderedListOutlined />,
    label: '库存管理'
  },
  {
    key: '/stock-out',
    icon: <ExportOutlined />,
    label: '出库管理'
  },
  {
    key: '/transfer',
    icon: <SwapOutlined />,
    label: '调拨管理'
  },
  {
    key: '/warning',
    icon: <BellOutlined />,
    label: '预警中心'
  },
  {
    key: '/transaction',
    icon: <HistoryOutlined />,
    label: '流水查询'
  }
]

const MainLayout: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken()

  const selectedKey = location.pathname.startsWith('/inventory') 
    ? '/inventory' 
    : location.pathname

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
        width={220}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 12 : 16,
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.1)',
            margin: 16,
            borderRadius: 8
          }}
        >
          {collapsed ? <AppstoreOutlined /> : '资产仓库管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#262626' }}>
            企业资产仓库管理系统
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 14 }}>
            仓管员：管理员
          </div>
        </Header>
        <Content
          style={{
            margin: 16,
            padding: 16,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'auto'
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
