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
import { AuthProvider } from './state/AuthContext'
import ProfilePage from './pages/ProfilePage'
import RequireStaff from './components/RequireStaff'
import RequireDepartment from './components/RequireDepartment'

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
          <Route path="/ho-so" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </CartProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Admin area: deliberately separate layout (no customer Header/Footer),
            per the HTTTDN requirement for a distinct Admin interface. Gated by
            RequireStaff — only role=staff accounts get past this, regardless
            of which URL is typed directly into the browser. */}
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          {/* Each page is wrapped in RequireDepartment, which reads the allowed
              departments for its own path from admin/access.ts — the same map
              the sidebar uses. Adding a new admin page: add the route here AND
              one line in access.ts, nothing else. */}
          <Route index element={<RequireDepartment><AdminDashboardPage /></RequireDepartment>} />
          <Route path="san-pham" element={<RequireDepartment><AdminProductsPage /></RequireDepartment>} />
          <Route path="kho" element={<RequireDepartment><AdminInventoryPage /></RequireDepartment>} />
          <Route path="don-hang" element={<RequireDepartment><AdminOrdersPage /></RequireDepartment>} />
          <Route path="marketing" element={<RequireDepartment><AdminMarketingPage /></RequireDepartment>} />
          <Route path="khach-hang" element={<RequireDepartment><AdminCustomersPage /></RequireDepartment>} />
          <Route path="bao-cao" element={<RequireDepartment><AdminDemographicsPage /></RequireDepartment>} />
          <Route path="nhan-vien" element={<RequireDepartment><AdminEmployeesPage /></RequireDepartment>} />
        </Route>
        <Route path="/*" element={<CustomerShell />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
