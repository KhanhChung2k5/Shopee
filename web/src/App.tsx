import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import CategoryPage from './pages/CategoryPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import AdminLayout from './admin/AdminLayout'
import AdminDashboardPage from './admin/pages/AdminDashboardPage'
import AdminCustomersPage from './admin/pages/AdminCustomersPage'
import AdminDemographicsPage from './admin/pages/AdminDemographicsPage'
import AdminProductsPage from './admin/pages/AdminProductsPage'
import AdminInventoryPage from './admin/pages/AdminInventoryPage'
import AdminOrdersPage from './admin/pages/AdminOrdersPage'
import AdminMarketingPage from './admin/pages/AdminMarketingPage'
import AdminEmployeesPage from './admin/pages/AdminEmployeesPage'
import { CartProvider } from './state/CartContext'

function CustomerShell() {
  return (
    <CartProvider>
      <a className="skip-link" href="#main-content">Bỏ qua để đến nội dung chính</a>
      <Header />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/san-pham/:id" element={<ProductDetailPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/danh-muc/:slug" element={<CategoryPage />} />
          <Route path="/tim-kiem" element={<SearchPage />} />
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </CartProvider>
  )
}

function App() {
  return (
    <Routes>
      {/* Admin area: deliberately separate layout (no customer Header/Footer),
          per the HTTTDN requirement for a distinct Admin interface. */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="san-pham" element={<AdminProductsPage />} />
        <Route path="kho" element={<AdminInventoryPage />} />
        <Route path="don-hang" element={<AdminOrdersPage />} />
        <Route path="marketing" element={<AdminMarketingPage />} />
        <Route path="khach-hang" element={<AdminCustomersPage />} />
        <Route path="bao-cao" element={<AdminDemographicsPage />} />
        <Route path="nhan-vien" element={<AdminEmployeesPage />} />
      </Route>
      <Route path="/*" element={<CustomerShell />} />
    </Routes>
  )
}

export default App
