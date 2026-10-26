import { useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toasts from './Toasts.jsx';
import OfferDetailDrawer from '../offers/OfferDetailDrawer.jsx';
import AIPanel from '../ai/AIPanel.jsx';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const offerId = params.get('offer');
  const closeOffer = () => {
    const next = new URLSearchParams(params);
    next.delete('offer');
    setParams(next, { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <OfferDetailDrawer offerId={offerId} onClose={closeOffer} />
      <AIPanel />
      <Toasts />
    </div>
  );
}
