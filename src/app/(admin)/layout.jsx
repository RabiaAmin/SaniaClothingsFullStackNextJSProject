import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

/**
 * Admin shell — applies to all routes under (admin)/.
 * Add auth guard here once AuthContext is wired up.
 */
export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
