import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import OrderDetailPage from './pages/OrderDetailPage'
import VoucherWalletPage from './pages/VoucherWalletPage'
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
import AdminGoodsReceiptsPage from './admin/pages/AdminGoodsReceiptsPage'
import AdminOrdersPage from './admin/pages/AdminOrdersPage'
import AdminMarketingPage from './admin/pages/AdminMarketingPage'
import AdminEmployeesPage from './admin/pages/AdminEmployeesPage'
import AdminCrmProfilesPage from './admin/pages/crm/AdminCrmProfilesPage'
import AdminSupportPage from './admin/pages/crm/AdminSupportPage'
import AdminSurveysPage from './admin/pages/crm/AdminSurveysPage'
import AdminSegmentsPage from './admin/pages/crm/AdminSegmentsPage'
import AdminCampaignsPage from './admin/pages/crm/AdminCampaignsPage'
import NotificationsPage from './pages/NotificationsPage'
import SurveyPage from './pages/SurveyPage'
import SupportPage from './pages/SupportPage'
import { CartProvider } from './state/CartContext'
import { AuthProvider } from './state/AuthContext'
import ProfilePage from './pages/ProfilePage'
import RequireStaff from './components/RequireStaff'
import RequireDepartment from './components/RequireDepartment'
import MobileNav from './components/MobileNav'

function CustomerShell() {
  return (
    <CartProvider>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-space-md focus:py-2 focus:rounded-lg focus:bg-primary focus:text-on-primary focus:font-title-md"
        href="#main-content"
      >
        Bỏ qua để đến nội dung chính
      </a>
      <Header />
      <main id="main-content" className="w-full pt-[108px] md:pt-[156px] bg-surface min-h-[calc(100vh-156px)]">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/san-pham/:id" element={<ProductDetailPage />} />
          <Route path="/gio-hang" element={<CartPage />} />
          <Route path="/thanh-toan" element={<CheckoutPage />} />
          <Route path="/don-hang" element={<OrderHistoryPage />} />
          <Route path="/don-hang/:id" element={<OrderDetailPage />} />
          <Route path="/kho-voucher" element={<VoucherWalletPage />} />
          <Route path="/danh-muc/:slug" element={<CategoryPage />} />
          <Route path="/tim-kiem" element={<SearchPage />} />
          <Route path="/dang-nhap" element={<LoginPage />} />
          <Route path="/ho-so" element={<ProfilePage />} />
          <Route path="/thong-bao" element={<NotificationsPage />} />
          <Route path="/khao-sat/:id" element={<SurveyPage />} />
          <Route path="/ho-tro" element={<SupportPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      {/* Keeps the footer clear of the fixed bottom nav on phones. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <MobileNav />
    </CartProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireStaff>
              <AdminLayout />
            </RequireStaff>
          }
        >
          <Route index element={<RequireDepartment><AdminDashboardPage /></RequireDepartment>} />
          <Route path="san-pham" element={<RequireDepartment><AdminProductsPage /></RequireDepartment>} />
          <Route path="kho" element={<RequireDepartment><AdminInventoryPage /></RequireDepartment>} />
          <Route path="phieu-nhap" element={<RequireDepartment><AdminGoodsReceiptsPage /></RequireDepartment>} />
          <Route path="don-hang" element={<RequireDepartment><AdminOrdersPage /></RequireDepartment>} />
          <Route path="marketing" element={<RequireDepartment><AdminMarketingPage /></RequireDepartment>} />
          <Route path="khach-hang" element={<RequireDepartment><AdminCustomersPage /></RequireDepartment>} />
          <Route path="bao-cao" element={<RequireDepartment><AdminDemographicsPage /></RequireDepartment>} />
          <Route path="nhan-vien" element={<RequireDepartment><AdminEmployeesPage /></RequireDepartment>} />
          <Route path="crm" element={<RequireDepartment><AdminCrmProfilesPage /></RequireDepartment>} />
          <Route path="ho-tro" element={<RequireDepartment><AdminSupportPage /></RequireDepartment>} />
          <Route path="khao-sat" element={<RequireDepartment><AdminSurveysPage /></RequireDepartment>} />
          <Route path="phan-khuc" element={<RequireDepartment><AdminSegmentsPage /></RequireDepartment>} />
          <Route path="chien-dich" element={<RequireDepartment><AdminCampaignsPage /></RequireDepartment>} />
        </Route>
        <Route path="/*" element={<CustomerShell />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
