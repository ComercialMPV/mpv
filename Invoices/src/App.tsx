import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { DocumentForm } from './pages/DocumentForm';
import { DocumentView } from './pages/DocumentView';
import { Clients } from './pages/Clients';
import { ClientForm } from './pages/ClientForm';
import { Suppliers } from './pages/Suppliers';
import { SalesManager } from './pages/SalesManager';
import { SupplierForm } from './pages/SupplierForm';
import { Templates } from './pages/Templates';
import { PublicPortal } from './pages/PublicPortal';
import { TemplateForm } from './pages/TemplateForm';
import { PublicPortalTemplates } from './pages/PublicPortalTemplates';
import { PublicPortalTemplateForm } from './components/PublicPortalTemplateForm';
import { CompanyView } from './pages/CompanyView';
import { CompanyEdit } from './pages/CompanyEdit';
import { Settings } from './pages/Settings';
import { ShareDocumentPage } from './pages/ShareDocumentPage';
import { InventoryPage } from './pages/ServicesPage';
import { RequisitionsPage } from './pages/RequisitionsPage';
import { PublicPortalGallery } from './pages/PublicPortalGallery';
import { ForgotPassword } from './pages/ForgotPassword';
import { GoalsPage } from './pages/Goals';
import { GoalBreakdownPage } from './pages/GoalBreakdown';
import { CustomerAnalyticsPage } from './pages/CustomerAnalytics';
import { PaymentsSettings } from './pages/PaymentsSettings';
import {SuperAdminDashboard} from './pages/SuperAdminDashboard';
import {UsersManager} from './components/UsersManager';
import {RoleManagement} from './pages/RoleManagement';
import { PartnerManagement } from './pages/PartnerManagement';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { Onboarding } from './pages/Onboarding';
import PortalCustomization from './pages/PortalCustomization';
import  BuiltInVariants  from './pages/BuiltInVariants';
import { ProposalsList } from './pages/ProposalsList';
import LandingPage from './pages/landing‑page';
import TermsPage from './pages/TermsPage';
import CheckoutPage from './pages/CheckoutPage';
import TemplateCheckout from './pages/TemplateCheckout';
import NotFound from './pages/NotFound';
import { LeadsBoard } from './components/LeadsBoard';
import { SocialPublish } from './pages/SocialPublish';
import  CommissionManagement  from './pages/CommissionManagement';
import MyCommissionsPage from './pages/MyCommissionsPage';
import AdminCommissionsDashboard from './pages/AdminCommissionsDashboard';
import UserPerformanceDashboard from './pages/UserPerformanceDashboard';
import RegisterReferralPartner from './pages/RegisterReferralPartner';
import ReferralPartnerDashboard from './pages/ReferralPartnerDashboard';
import MyEarnings from './pages/MyEarnings';
import RecommendClient from './pages/RecommendClient';
import OnboardingManagement from './pages/OnboardingManagement';
import Biblioteca from './pages/Biblioteca';
import BibliotecaManagement from './pages/BibliotecaManagement';
import { ExpensesDashboard } from './pages/ExpensesDashboard';
import { SocialCallback } from './pages/SocialCallback';
import { OrdersDisplay } from './pages/OrdersDisplay';
import { KitchenConfirmation } from './pages/KitchenConfirmation';
import {SubscriptionPlansManager} from './pages/admin/SubscriptionPlansManager';
import { TransactionsDashboard } from './pages/TransactionsDashboard';
import { OrderSuccess } from './pages/OrderSuccess';



function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/template-checkout" element={<TemplateCheckout />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register-referral-partner" element={<RegisterReferralPartner />} />
            <Route path="/register" element={<Register />} />
            <Route path="/share/:token" element={<ShareDocumentPage />} />   
            <Route path="/social/callback" element={<SocialCallback />} /> 
            <Route path="/orders-display" element={<OrdersDisplay />} />
            <Route path="/kitchen" element={<KitchenConfirmation />} />  
            <Route path="/order-success" element={<OrderSuccess />} /> 
            
                   
            <Route path="/websites" element={<PublicPortalGallery />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            {/* Protected routes */}
                <Route path="/services" element={
              <ProtectedRoute>
                <Layout>
                      <InventoryPage />
                    </Layout>                
              </ProtectedRoute>
            } />
            
              <Route path="/transactions" element={
                <ProtectedRoute>
                  <Layout>
<TransactionsDashboard />
                  </Layout>                  
                  
                </ProtectedRoute>
              } />
           
                 <Route path="/plans-config" element={
              <ProtectedRoute>
                <Layout>
                      <SubscriptionPlansManager />
                    </Layout>                
              </ProtectedRoute>
            } />
                 <Route path="/expenses" element={
              <ProtectedRoute>
                <Layout>
                      <ExpensesDashboard />
                    </Layout>                
              </ProtectedRoute>
            } />
                <Route path="/admin/biblioteca" element={
              <ProtectedRoute>
                <Layout>
                      <BibliotecaManagement />
                    </Layout>                
              </ProtectedRoute>
            } />

            <Route path="/referral/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <ReferralPartnerDashboard />
                </Layout>
               
                </ProtectedRoute>
            }
            />
                <Route path="/my-earnings" element={
              <ProtectedRoute>
                <Layout>
                  <MyEarnings />
                </Layout>
               
                </ProtectedRoute>
            }
            />
                <Route path="/recommended-clients" element={
              <ProtectedRoute>
                <Layout>
                  <RecommendClient />
                </Layout>
               
                </ProtectedRoute>
            }
            />

            <Route path="/users-performance" element={
              <ProtectedRoute>
                <Layout>
                      <UserPerformanceDashboard />
                    </Layout>                
              </ProtectedRoute>
            } />
                <Route path="/commission-management" element={
              <ProtectedRoute>
                <Layout>
                      <CommissionManagement />
                    </Layout>                
              </ProtectedRoute>
            } />
             <Route path="/my-commissions" element={
              <ProtectedRoute>
                <Layout>
                      <MyCommissionsPage />
                    </Layout>                
              </ProtectedRoute>
            } />
             <Route path="/admin-commissions-dashboard" element={
              <ProtectedRoute>
                <Layout>
                      <AdminCommissionsDashboard />
                    </Layout>                
              </ProtectedRoute>
            } />
              <Route path="/admin/onboarding" element={
              <ProtectedRoute>
                <Layout>
                      <OnboardingManagement />
                    </Layout>                
              </ProtectedRoute>
            } />
            <Route path="/builtin-variants" element={
              <ProtectedRoute>
                <Layout>
                      <BuiltInVariants />
                    </Layout>                
              </ProtectedRoute>
            }/>

            <Route path="/social-publish" element={
              <ProtectedRoute>
                <Layout>
                      <SocialPublish />
                    </Layout>                
              </ProtectedRoute>
            }/>
                <Route path="/proposals" element={
              <ProtectedRoute>
                <Layout>
                      <ProposalsList />
                    </Layout>                
              </ProtectedRoute>
            } />
              <Route path="/portal-customization" element={
              <ProtectedRoute>
                <Layout>
                      <PortalCustomization />
                    </Layout>                
              </ProtectedRoute>
            } />
              <Route path="/onboarding" element={
              <ProtectedRoute>
                <Layout>
                      <Onboarding />
                    </Layout>                
              </ProtectedRoute>
            } />
               <Route path="/users" element={
              <ProtectedRoute>
                <Layout>
                      <UsersManager />
                    </Layout>                
              </ProtectedRoute>
            } />
            <Route path="/super-admin" element={
              <ProtectedRoute>
                <Layout>
                  <SuperAdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/role-management" element={
              <ProtectedRoute>
                <Layout>
                  <RoleManagement />
                </Layout>
              </ProtectedRoute>
            } />
              <Route path="/partner-management" element={ 
                <ProtectedRoute>
                  <Layout>
                    <PartnerManagement />
                  </Layout>
                </ProtectedRoute>
              } />
            <Route path="/sales" element={
              <ProtectedRoute>
                <Layout>
                  <SalesManager />
                </Layout>               
               
              </ProtectedRoute>
            } />
            <Route path="/requisitions" element={
              <ProtectedRoute>
                <Layout>
                <RequisitionsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/goals" element={
              <ProtectedRoute>
                <Layout>
                <GoalsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/goals/:id/breakdown" element={
              <ProtectedRoute>
                <Layout>
                  <GoalBreakdownPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <Layout>
                  <CustomerAnalyticsPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/documents" element={
              <ProtectedRoute>
                <Layout>
                  <Documents />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/documents/new" element={
              <ProtectedRoute>
                <Layout>
                  <DocumentForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/documents/:id" element={
              <ProtectedRoute>
                <Layout>
                  <DocumentView />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/documents/:id/edit" element={
              <ProtectedRoute>
                <Layout>
                  <DocumentForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/clients" element={
              <ProtectedRoute>
                <Layout>
                  <Clients />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/clients/new" element={
              <ProtectedRoute>
                <Layout>
                  <ClientForm />
                </Layout>
              </ProtectedRoute>
            } />
             <Route path="/leads" element={
              <ProtectedRoute>
                <Layout>
                  <LeadsBoard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/clients/:id/edit" element={
              <ProtectedRoute>
                <Layout>
                  <ClientForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/suppliers" element={
              <ProtectedRoute>
                <Layout>
                  <Suppliers />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/suppliers/new" element={
              <ProtectedRoute>
                <Layout>
                  <SupplierForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/suppliers/:id/edit" element={
              <ProtectedRoute>
                <Layout>
                  <SupplierForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/templates" element={
              <ProtectedRoute>
                <Layout>
                  <Templates />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/public-portal-templates" element={
              <ProtectedRoute>
                <Layout>
                  <PublicPortalTemplates />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/public-portal-templates/new" element={
              <ProtectedRoute>
                <Layout>
                  <PublicPortalTemplateForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/public-portal-templates/:id/edit" element={
              <ProtectedRoute>
                <Layout>
                  <PublicPortalTemplateForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/templates/new" element={
              <ProtectedRoute>
                <Layout>
                  <TemplateForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/templates/:id/edit" element={
              <ProtectedRoute>
                <Layout>
                  <TemplateForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/company" element={
              <ProtectedRoute>
                <Layout>
                  <CompanyView />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/company/edit" element={
              <ProtectedRoute>
                <Layout>
                  <CompanyEdit />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
              
            } />
              <Route path="/payment-settings" element={
                <ProtectedRoute>
                  <Layout>
                    <PaymentsSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/partner-dashboard" element={
                <ProtectedRoute>
                  <Layout>
                    <PartnerDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
            <Route path="*" element={<NotFound />} />
            <Route path="/:slug" element={<PublicPortal />} /> 
          </Routes>

          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#6366f1',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;