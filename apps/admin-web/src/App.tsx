
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router';
import {
  Activity, ArrowRight, Bell, CarFront, CheckCircle2,
  ChevronRight, ClipboardList, Clock3,
  LayoutDashboard, MapPin, Menu,
  Search, ShieldCheck, SlidersHorizontal, UsersRound,
  Wrench, X
} from 'lucide-react';

type RequestStatus = 'Created' | 'Matching' | 'Open for bids' | 'Awaiting payment' | 'Booked' | 'On the way' | 'In progress' | 'Completed' | 'Cancelled' | 'Expired' | 'Disputed';
type BidStatus = 'Submitted' | 'Accepted' | 'Rejected' | 'Expired' | 'Withdrawn';

type Bid = {
  id: string;
  provider: string;
  price: number;
  eta: number;
  receivedAt: string;
  status: BidStatus;
  providerId: string;
  note: string | null;
};

type ServiceRequest = {
  id: string;
  customer: string;
  service: string;
  vehicle: string;
  location: string;
  description: string;
  createdAt: string;
  status: RequestStatus;
  bids: Bid[];
  driverId: string;
};

type ApiRequest = { id: string; driverId: string; providerId: string | null; vehicleId: string | null; vehicleDescription: string | null; serviceType: string; problemDescription: string; locationLatitude: number; locationLongitude: number; locationAddress: string | null; status: RequestStatus; createdAt: string; updatedAt: string };
type ApiBid = { id: string; requestId: string; providerId: string; providerName: string; priceLkr: number; etaMinutes: number; note: string | null; status: BidStatus; createdAt: string };
const BID_STATUSES: BidStatus[] = ['Submitted', 'Accepted', 'Rejected', 'Expired', 'Withdrawn'];
type AdminData = { requests: ServiceRequest[]; loading: boolean; error: string; refresh: () => void };
const AdminDataContext = createContext<AdminData | null>(null);
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

function useAdminData() {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error('AdminDataProvider is missing');
  return value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function mapData(apiRequests: ApiRequest[], apiBids: ApiBid[]): ServiceRequest[] {
  const bidsByRequest = new Map<string, Bid[]>();
  for (const bid of apiBids) {
    const bids = bidsByRequest.get(bid.requestId) ?? [];
    bids.push({ id: bid.id, provider: bid.providerName, providerId: bid.providerId, price: Number(bid.priceLkr), eta: bid.etaMinutes, receivedAt: formatDate(bid.createdAt), status: bid.status, note: bid.note });
    bidsByRequest.set(bid.requestId, bids);
  }
  return apiRequests.map((request) => ({
    id: request.id,
    customer: request.driverId,
    driverId: request.driverId,
    service: request.serviceType,
    vehicle: request.vehicleDescription || request.vehicleId || 'Not provided',
    location: request.locationAddress || `${request.locationLatitude.toFixed(4)}, ${request.locationLongitude.toFixed(4)}`,
    description: request.problemDescription,
    createdAt: formatDate(request.createdAt),
    status: request.status,
    bids: bidsByRequest.get(request.id) ?? [],
  }));
}

function AdminDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [requestsResponse, ...bidResponses] = await Promise.all([
          fetch(`${API_BASE}/requests/admin`),
          ...BID_STATUSES.map((status) => fetch(`${API_BASE}/bids?status=${encodeURIComponent(status)}`)),
        ]);
        const failedResponse = [requestsResponse, ...bidResponses].find((response) => !response.ok);
        if (failedResponse) throw new Error(`Admin API unavailable (${failedResponse.status}). Start the local RideFix backend and check VITE_API_BASE_URL.`);
        const [requestBody, ...bidBodies] = await Promise.all([
          requestsResponse.json(),
          ...bidResponses.map((response) => response.json()),
        ]) as [{ requests: ApiRequest[] }, ...{ bids: ApiBid[] }[]];
        const bids = bidBodies.flatMap((body) => body.bids);
        if (active) { setRequests(mapData(requestBody.requests, bids)); setError(''); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load admin data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refreshToken]);
  const value = useMemo(() => ({ requests, loading, error, refresh: () => setRefreshToken((value) => value + 1) }), [requests, loading, error]);
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

const money = (value: number) =>
  `LKR ${value.toLocaleString('en-LK')}`;

function bidCount(requests: ServiceRequest[]) { return requests.reduce((total, request) => total + request.bids.length, 0); }

function Status({
  value
}: {
  value: RequestStatus | BidStatus;
}) {
  const color =
    value === 'Accepted' || value === 'Booked'
      ? 'success'
      : value === 'Open for bids' || value === 'Submitted' || value === 'Awaiting payment'
        ? 'purple'
        : value === 'Cancelled' || value === 'Rejected'
          ? 'danger'
          : 'neutral';

  return <span className={`rf-status ${color}`}>{value}</span>;
}

function StatCard({
  title, value, icon, tone, note
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
  note: string;
}) {
  return (
    <div className="rf-stat">
      <div className={`rf-stat-icon ${tone}`}>{icon}</div>
      <div>
        <div className="rf-stat-title">{title}</div>
        <div className="rf-stat-value">{value}</div>
        <div className="rf-stat-note">{note}</div>
      </div>
    </div>
  );
}

function PageHeading({
  title, subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rf-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menu = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard size={19} />
    },
    {
      to: '/requests',
      label: 'Jobs & Requests',
      icon: <ClipboardList size={19} />
    }
  ];

  return (
    <div className="rf-shell">
      {menuOpen && (
        <button
          className="rf-overlay"
          aria-label="Close sidebar"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside className={`rf-sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="rf-brand">
          <CarFront size={34} strokeWidth={2.4} />
          <div>
            <div className="rf-brand-name">
              Ride<span>Fix</span>
            </div>
            <small>Admin Dashboard</small>
          </div>
        </div>

        <div className="rf-nav-caption">WORKSPACE</div>

        <nav className="rf-nav">
          {menu.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rf-nav-link ${isActive ? 'active' : ''}`
              }
            >
              {item.icon}
              {item.label}
              <ChevronRight size={15} className="rf-nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="rf-nav-caption rf-later">
          FUTURE SPRINTS
        </div>
        <div className="rf-nav-pending">
          <div><UsersRound size={17} /> Users & Providers</div>
          <div><MapPin size={17} /> Live Tracking</div>
          <div><ShieldCheck size={17} /> Payments & Disputes</div>
        </div>

        <div className="rf-sidebar-bottom">
          <div className="rf-sidebar-admin">
            <span className="rf-avatar">A</span>
            <div>
              <strong>Administrator</strong>
              <small>Local admin prototype</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="rf-workspace">
        <header className="rf-topbar">
          <div className="rf-topbar-left">
            <button
              className="rf-icon-button rf-menu-button"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={21} />
            </button>
            <span className="rf-topbar-title">RideFix Operations</span>
          </div>
          <div className="rf-topbar-right">
            <span className="rf-online">
              <span /> Live data
            </span>
            <Bell size={19} />
            <span className="rf-avatar small">A</span>
          </div>
        </header>

        <main className="rf-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/bookings" element={<RequestsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const { requests, loading, error } = useAdminData();

  const openRequests = requests.filter(
    request => request.status === 'Open for bids'
  ).length;

  const selected = requests.reduce((count, request) => count + request.bids.filter(bid => bid.status === 'Accepted').length, 0);

  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle="Live requests, provider bids and driver selections. Refreshes every five seconds."
      />
      {error && <div className="rf-admin-error" role="alert">{error}</div>}
      {loading && <div className="rf-admin-loading">Loading RideFix backend data…</div>}

      <div className="rf-stat-grid">
        <StatCard
          title="Total Requests"
          value={requests.length}
          icon={<ClipboardList />}
          tone="blue"
          note="Created by drivers"
        />
        <StatCard
          title="Open for Bidding"
          value={openRequests}
          icon={<Activity />}
          tone="orange"
          note="Waiting for driver selection"
        />
        <StatCard
          title="Bids Received"
          value={bidCount(requests)}
          icon={<Wrench />}
          tone="purple"
          note="Provider offers"
        />
        <StatCard
          title="Bids Selected"
          value={selected}
          icon={<CheckCircle2 />}
          tone="green"
          note="Accepted by drivers"
        />
      </div>

      <div className="rf-dashboard-grid">
        <section className="rf-panel">
          <div className="rf-panel-head">
            <div>
              <h2>Recent Service Requests</h2>
              <p>Latest roadside assistance activity</p>
            </div>
            <button
              className="rf-link-button"
              onClick={() => navigate('/requests')}
            >
              View all <ArrowRight size={16} />
            </button>
          </div>

          <div className="rf-table-scroll">
            <table className="rf-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Driver ID</th>
                  <th>Service</th>
                  <th>Bids</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 8).map(request => (
                  <tr key={request.id}>
                    <td className="rf-id">{request.id}</td>
                    <td>{request.customer}</td>
                    <td>{request.service}</td>
                    <td>{request.bids.length}</td>
                    <td><Status value={request.status} /></td>
                    <td>
                      <button
                        className="rf-table-action"
                        onClick={() => navigate('/requests')}
                        aria-label={`View ${request.id}`}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rf-panel">
          <div className="rf-panel-head">
          </div>

          <div className="rf-journey">
            {[
              ['01', 'Driver creates request',
                'Vehicle, location and issue details'],
              ['02', 'Providers submit bids',
                'Offer price and estimated arrival'],
              ['03', 'Driver compares offers',
                'Compare price and estimated arrival'],
              ['04', 'Driver accepts a bid',
                'Winning provider is displayed to admin']
            ].map(([number, title, description], index) => (
              <div className="rf-journey-step" key={number}>
                <div className={
                  `rf-step-number ${index === 3 ? 'last' : ''}`
                }>
                  {number}
                </div>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="rf-dashboard-bottom">
        <section className="rf-panel rf-summary-panel">
          <div className="rf-panel-head">
            <div>
              <h2>Request Progress</h2>
              <p>Current MVP status distribution</p>
            </div>
          </div>

          {([
            ['Created', 'Created'],
            ['Open for bids', 'Open for bids'],
            ['Booked', 'Booked'],
            ['Cancelled', 'Cancelled']
          ] as [RequestStatus, string][]).map(([status, label]) => {
            const count = requests.filter(
              request => request.status === status
            ).length;

            return (
              <div className="rf-progress-item" key={status}>
                <div className="rf-progress-label">
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
                <div className="rf-progress-track">
                  <div
                    className={`rf-progress-bar ${
                      status === 'Booked' ? 'is-selected' : ''
                    }`}
                    style={{
                      width: `${requests.length ? (count / requests.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        <section className="rf-panel rf-summary-panel">
          <div className="rf-panel-head">
            <div>
              <h2>Accepted Bids</h2>
              <p>Driver-selected provider offers</p>
            </div>
            <CheckCircle2 size={22} color="#f97316" />
          </div>
          <div className="rf-evidence-count">
            {selected} <span>accepted offers</span>
          </div>
          <p className="rf-note">
            Accepted status comes from the Bidding Service after the driver confirms an offer.
          </p>
          <button
            className="rf-primary rf-full"
            onClick={() => navigate('/requests')}
          >
            Inspect Requests <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </>
  );
}

function RequestsPage() {
  const { requests, loading, error } = useAdminData();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [bidSort, setBidSort] = useState<'price' | 'eta'>('price');

  useEffect(() => {
    if (!selectedId && requests[0]) setSelectedId(requests[0].id);
  }, [requests, selectedId]);

  const filtered = useMemo(() => {
    const search = query.toLowerCase().trim();

    return requests.filter(request => {
      const matchesSearch = [
        request.id,
        request.customer,
        request.service,
        request.vehicle,
        request.location
      ].some(value => value.toLowerCase().includes(search));

      return (
        matchesSearch &&
        (filter === 'All' || request.status === filter)
      );
    });
  }, [query, filter]);

  const selectedRequest =
    requests.find(request => request.id === selectedId) ?? null;

  const sortedBids = selectedRequest
    ? [...selectedRequest.bids].sort((a, b) =>
        bidSort === 'price'
          ? a.price - b.price
          : a.eta - b.eta
      )
    : [];

  return (
    <>
      <PageHeading
        title="Jobs & Requests"
        subtitle="Review driver requests, provider bids and the driver’s accepted offer."
      />

      <div className="rf-stat-grid">
        <StatCard
          title="All Requests"
          value={requests.length}
          icon={<ClipboardList />}
          tone="blue"
          note="Driver submissions"
        />
        <StatCard
          title="Bidding Open"
          value={requests.filter(r => r.status === 'Open for bids').length}
          icon={<Clock3 />}
          tone="orange"
          note="Awaiting decision"
        />
        <StatCard
          title="Received Bids"
          value={bidCount(requests)}
          icon={<Wrench />}
          tone="purple"
          note="Total provider offers"
        />
        <StatCard
          title="Accepted Offers"
          value={requests.reduce((count, request) => count + request.bids.filter(bid => bid.status === 'Accepted').length, 0)}
          icon={<CheckCircle2 />}
          tone="green"
          note="Chosen by drivers"
        />
      </div>
      {error && <div className="rf-admin-error" role="alert">{error}</div>}
      {loading && <div className="rf-admin-loading">Loading requests and bids…</div>}

      <div className={`rf-requests-grid ${
        selectedRequest ? 'has-detail' : ''
      }`}>
        <section className="rf-panel rf-request-list">
          <div className="rf-panel-head">
            <div>
              <h2>Service Requests</h2>
              <p>Select a request to inspect its stored provider bids and status.</p>
            </div>
          </div>

          <div className="rf-filters">
            <label className="rf-search">
              <Search size={18} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search request ID, driver ID, location..."
                aria-label="Search requests"
              />
            </label>

            <label className="rf-select-wrapper">
              <SlidersHorizontal size={17} />
              <select
                aria-label="Filter by status"
                value={filter}
                onChange={event => setFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="Created">Created</option>
                <option value="Matching">Matching</option>
                <option value="Open for bids">Open for bids</option>
                <option value="Awaiting payment">Awaiting payment</option>
                <option value="Booked">Booked</option>
                <option value="On the way">On the way</option>
                <option value="In progress">In progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
                <option value="Disputed">Disputed</option>
              </select>
            </label>
          </div>

          <div className="rf-table-scroll">
            <table className="rf-table rf-request-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Driver ID / Vehicle</th>
                  <th>Service / Location</th>
                  <th>Bids</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(request => (
                  <tr
                    key={request.id}
                    className={`rf-clickable-row ${
                      request.id === selectedId ? 'rf-row-selected' : ''
                    }`}
                    onClick={() => setSelectedId(request.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Inspect request ${request.id}`}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(request.id);
                      }
                    }}
                  >
                    <td>
                      <strong className="rf-id">{request.id}</strong>
                      <small className="rf-cell-sub">{request.createdAt}</small>
                    </td>
                    <td>
                      <strong>{request.customer}</strong>
                      <small className="rf-cell-sub">{request.vehicle}</small>
                    </td>
                    <td>
                      <strong>{request.service}</strong>
                      <small className="rf-cell-sub">{request.location}</small>
                    </td>
                    <td>{request.bids.length}</td>
                    <td><Status value={request.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="rf-empty">
              No requests match your search or status filter.
            </div>
          )}

          <div className="rf-table-footer">Showing {filtered.length} of {requests.length} backend requests</div>
        </section>

        {selectedRequest && (
          <aside className="rf-detail">
            <div className="rf-detail-head">
              <div>
                <small>REQUEST DETAILS</small>
                <h2>{selectedRequest.id}</h2>
              </div>
              <button
                className="rf-icon-button"
                aria-label="Close request details"
                onClick={() => setSelectedId(null)}
              >
                <X size={19} />
              </button>
            </div>

            <div className="rf-detail-status">
              <Status value={selectedRequest.status} />
              <span>{selectedRequest.createdAt}</span>
            </div>

            <div className="rf-detail-scroll">
              <div className="rf-detail-section">
                <h3><UsersRound size={17} /> Driver Information</h3>
                <div className="rf-info-row">
                  <span>Driver ID</span>
                  <strong title={selectedRequest.driverId}>{selectedRequest.driverId}</strong>
                </div>
                <div className="rf-info-row">
                  <span>Vehicle</span>
                  <strong>{selectedRequest.vehicle}</strong>
                </div>
                <div className="rf-info-row">
                  <span>Location</span>
                  <strong>{selectedRequest.location}</strong>
                </div>
              </div>

              <div className="rf-detail-section">
                <h3><CarFront size={18} /> Issue Description</h3>
                <div className="rf-issue-type">
                  <Wrench size={16} />
                  {selectedRequest.service}
                </div>
                <p className="rf-description">
                  {selectedRequest.description}
                </p>
              </div>

              <div className="rf-detail-section">
                <div className="rf-section-title-row">
                  <h3>
                    <Wrench size={18} />
                    Provider Bids ({selectedRequest.bids.length})
                  </h3>
                  <select
                    className="rf-small-select"
                    aria-label="Sort provider bids"
                    value={bidSort}
                    onChange={event =>
                      setBidSort(event.target.value as 'price' | 'eta')
                    }
                  >
                    <option value="price">Lowest price</option>
                    <option value="eta">Fastest ETA</option>
                  </select>
                </div>

                {sortedBids.length === 0 ? (
                  <div className="rf-no-bids">
                    <Clock3 size={24} />
                    <strong>No bids received yet</strong>
                    <span>
                      Provider offers will be listed here.
                    </span>
                  </div>
                ) : (
                  <div className="rf-bids">
                    {sortedBids.map(bid => (
                      <div
                        key={bid.id}
                        className={`rf-bid-card ${
                          bid.status === 'Accepted' ? 'rf-winning-bid' : ''
                        }`}
                      >
                        <div className="rf-bid-top">
                          <div className="rf-provider-icon">
                            <Wrench size={18} />
                          </div>
                          <div className="rf-bid-provider">
                            <strong>{bid.provider}</strong>
                            <span>
                              Provider ID · {bid.providerId}
                            </span>
                          </div>
                          <Status value={bid.status} />
                        </div>
                        <div className="rf-bid-bottom">
                          <div>
                            <small>OFFER PRICE</small>
                            <strong className="rf-price">
                              {money(bid.price)}
                            </strong>
                          </div>
                          <div>
                            <small>ESTIMATED ARRIVAL</small>
                            <strong>{bid.eta} min</strong>
                          </div>
                        </div>
                        {bid.note && <p className="rf-note">{bid.note}</p>}
                        {bid.status === 'Accepted' && (
                          <div className="rf-winning-message">
                            <CheckCircle2 size={16} />
                            Selected by the driver
                          </div>
                        )}
                        <div className="rf-bid-time">
                          Bid received at {bid.receivedAt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rf-detail-section">
                <h3><Activity size={18} /> Request Activity</h3>
                <div className="rf-timeline">
                  <div className="rf-timeline-item">
                    <span className="rf-timeline-dot" />
                    <div>
                      <strong>Request created</strong>
                      <p>{selectedRequest.createdAt}</p>
                    </div>
                  </div>

                  {selectedRequest.bids.length > 0 && (
                    <div className="rf-timeline-item">
                      <span className="rf-timeline-dot" />
                      <div>
                        <strong>Provider bids received</strong>
                        <p>
                          {selectedRequest.bids.length} offers available
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedRequest.bids.some(
                    bid => bid.status === 'Accepted'
                  ) && (
                    <div className="rf-timeline-item">
                      <span className="rf-timeline-dot green" />
                      <div>
                        <strong>Driver accepted a bid</strong>
                        <p>
                          {
                            selectedRequest.bids.find(
                              bid => bid.status === 'Accepted'
                            )?.provider
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rf-admin-note">
                <ShieldCheck size={20} />
                <span>
                  Admin monitoring is read-only in Sprint 1.
                  Only the driver can accept a provider's bid.
                </span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

export function App() {
  return <AdminDataProvider><AppShell /></AdminDataProvider>;
}
