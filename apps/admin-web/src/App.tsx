
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router';
import {
  Activity, ArrowRight, Bell, CarFront, CheckCircle2,
  ChevronRight, ClipboardList, Clock3, FileImage,
  ImageIcon, LayoutDashboard, MapPin, Menu,
  Search, ShieldCheck, SlidersHorizontal, UsersRound,
  Wrench, X
} from 'lucide-react';

type RequestStatus =
  | 'Created'
  | 'Bidding'
  | 'Bid selected'
  | 'Cancelled';

type BidStatus = 'Submitted' | 'Accepted' | 'Rejected';

type DamagePhoto = {
  name: string;
  url?: string;
};

type Bid = {
  id: string;
  provider: string;
  type: string;
  price: number;
  eta: number;
  rating: number;
  receivedAt: string;
  status: BidStatus;
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
  photos: DamagePhoto[];
  bids: Bid[];
};

// UI-only sample records. Replace with API data later.
// Photo names demonstrate attachments without inventing photos.
const requests: ServiceRequest[] = [
  {
    id: 'RFX-1068',
    customer: 'Kasun Perera',
    service: 'Flat Tyre',
    vehicle: 'Toyota Aqua 2015',
    location: 'Colombo 06',
    description:
      'Front-left tyre puncture. Driver needs roadside assistance.',
    createdAt: 'Oct 31, 2026 · 10:24 AM',
    status: 'Bidding',
    photos: [
      { name: 'front-left-tyre.jpg' },
      { name: 'tyre-closeup.jpg' }
    ],
    bids: [
      {
        id: 'B-101',
        provider: 'AutoFix Garage',
        type: 'Garage',
        price: 3500,
        eta: 15,
        rating: 4.8,
        receivedAt: '10:27 AM',
        status: 'Submitted'
      },
      {
        id: 'B-102',
        provider: 'SpeedCare Mobile',
        type: 'Mobile Mechanic',
        price: 2800,
        eta: 22,
        rating: 4.6,
        receivedAt: '10:28 AM',
        status: 'Submitted'
      },
      {
        id: 'B-103',
        provider: 'Galle Auto Service',
        type: 'Garage',
        price: 4000,
        eta: 10,
        rating: 4.7,
        receivedAt: '10:30 AM',
        status: 'Submitted'
      }
    ]
  },
  {
    id: 'RFX-1067',
    customer: 'Nimali Sandamini',
    service: 'Battery Jump Start',
    vehicle: 'Honda Fit 2018',
    location: 'Kottawa',
    description:
      'Battery is flat and the vehicle will not start.',
    createdAt: 'Oct 31, 2026 · 9:18 AM',
    status: 'Bid selected',
    photos: [{ name: 'battery-dashboard.jpg' }],
    bids: [
      {
        id: 'B-104',
        provider: 'QuickFix Pro',
        type: 'Mobile Mechanic',
        price: 1800,
        eta: 12,
        rating: 4.9,
        receivedAt: '9:21 AM',
        status: 'Accepted'
      },
      {
        id: 'B-105',
        provider: 'City Mechanics',
        type: 'Mechanic',
        price: 2200,
        eta: 18,
        rating: 4.5,
        receivedAt: '9:22 AM',
        status: 'Rejected'
      },
      {
        id: 'B-106',
        provider: 'SpeedCare Mobile',
        type: 'Mobile Mechanic',
        price: 2000,
        eta: 25,
        rating: 4.6,
        receivedAt: '9:23 AM',
        status: 'Rejected'
      }
    ]
  },
  {
    id: 'RFX-1066',
    customer: 'Ravindu Silva',
    service: 'Towing',
    vehicle: 'Suzuki Wagon R',
    location: 'Nugegoda',
    description:
      'Engine stopped unexpectedly. Vehicle cannot be driven.',
    createdAt: 'Oct 31, 2026 · 8:45 AM',
    status: 'Bidding',
    photos: [{ name: 'engine-bay.jpg' }],
    bids: [
      {
        id: 'B-107',
        provider: 'Quick Tow Lanka',
        type: 'Towing',
        price: 4500,
        eta: 20,
        rating: 4.7,
        receivedAt: '8:49 AM',
        status: 'Submitted'
      },
      {
        id: 'B-108',
        provider: 'Lanka Tow Service',
        type: 'Towing',
        price: 5000,
        eta: 15,
        rating: 4.8,
        receivedAt: '8:52 AM',
        status: 'Submitted'
      }
    ]
  },
  {
    id: 'RFX-1065',
    customer: 'Sahan Karunathilaka',
    service: 'Engine Repair',
    vehicle: 'Nissan March 2012',
    location: 'Gampaha',
    description:
      'Vehicle has an engine warning light and unusual noise.',
    createdAt: 'Oct 31, 2026 · 8:10 AM',
    status: 'Created',
    photos: [
      { name: 'engine-warning.jpg' },
      { name: 'engine-photo.jpg' }
    ],
    bids: []
  },
  {
    id: 'RFX-1064',
    customer: 'Dilini Fernando',
    service: 'Fuel Delivery',
    vehicle: 'Toyota Vitz',
    location: 'Maharagama',
    description: 'Emergency fuel delivery requested.',
    createdAt: 'Oct 30, 2026 · 4:35 PM',
    status: 'Cancelled',
    photos: [],
    bids: []
  }
];

const money = (value: number) =>
  `LKR ${value.toLocaleString('en-LK')}`;

const totalBids = requests.reduce(
  (total, request) => total + request.bids.length,
  0
);

function Status({
  value
}: {
  value: RequestStatus | BidStatus;
}) {
  const color =
    value === 'Accepted' || value === 'Bid selected'
      ? 'success'
      : value === 'Bidding' || value === 'Submitted'
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
      <span className="rf-demo-tag">Sprint 1 · Demo data</span>
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
              <small>UI preview only</small>
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
              <span /> UI Prototype
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

  const openRequests = requests.filter(
    request => request.status === 'Bidding'
  ).length;

  const selected = requests.filter(
    request => request.status === 'Bid selected'
  ).length;

  const withPhotos = requests.filter(
    request => request.photos.length > 0
  ).length;

  return (
    <>
      <PageHeading
        title="Dashboard"
        subtitle="Monitor roadside requests, provider offers and bid selections."
      />

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
          value={totalBids}
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
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Bids</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map(request => (
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
            <div>
              <h2>Sprint 1 Workflow</h2>
              <p>Core marketplace journey</p>
            </div>
          </div>

          <div className="rf-journey">
            {[
              ['01', 'Driver creates request',
                'Vehicle, location, issue and damage photos'],
              ['02', 'Providers submit bids',
                'Offer price and estimated arrival'],
              ['03', 'Driver compares offers',
                'Price, ETA and provider rating'],
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
            ['Bidding', 'Open bidding'],
            ['Bid selected', 'Bid selected'],
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
                      status === 'Bid selected' ? 'is-selected' : ''
                    }`}
                    style={{
                      width: `${(count / requests.length) * 100}%`
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
              <h2>Damage Evidence</h2>
              <p>Image attachments from driver requests</p>
            </div>
            <FileImage size={22} color="#f97316" />
          </div>
          <div className="rf-evidence-count">
            {withPhotos} <span>requests with attachments</span>
          </div>
          <p className="rf-note">
            Admins can inspect damage evidence inside
            each request. The driver app is responsible
            for uploading the actual images.
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
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(
  requests[0]?.id ?? null
  );

  const [bidSort, setBidSort] = useState<'price' | 'eta'>('price');

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
        subtitle="Review driver issues, damage photos, provider bids and selected offers."
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
          value={requests.filter(r => r.status === 'Bidding').length}
          icon={<Clock3 />}
          tone="orange"
          note="Awaiting decision"
        />
        <StatCard
          title="Received Bids"
          value={totalBids}
          icon={<Wrench />}
          tone="purple"
          note="Total provider offers"
        />
        <StatCard
          title="Accepted Offers"
          value={requests.filter(r => r.status === 'Bid selected').length}
          icon={<CheckCircle2 />}
          tone="green"
          note="Chosen by drivers"
        />
      </div>

      <div className={`rf-requests-grid ${
        selectedRequest ? 'has-detail' : ''
      }`}>
        <section className="rf-panel rf-request-list">
          <div className="rf-panel-head">
            <div>
              <h2>Service Requests</h2>
              <p>Select any request to inspect the bids and damage images.</p>
            </div>
          </div>

          <div className="rf-filters">
            <label className="rf-search">
              <Search size={18} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search ID, customer, location..."
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
                <option value="Bidding">Bidding</option>
                <option value="Bid selected">Bid selected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="rf-table-scroll">
            <table className="rf-table rf-request-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Customer / Vehicle</th>
                  <th>Service / Location</th>
                  <th>Photos</th>
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
                    <td>
                      <span className="rf-photo-count">
                        <ImageIcon size={14} />
                        {request.photos.length}
                      </span>
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

          <div className="rf-table-footer">
            Showing {filtered.length} of {requests.length} demo requests
          </div>
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
                  <span>Customer</span>
                  <strong>{selectedRequest.customer}</strong>
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
                <h3>
                  <ImageIcon size={18} />
                  Damage Photos ({selectedRequest.photos.length})
                </h3>

                {selectedRequest.photos.length > 0 ? (
                  <div className="rf-photo-grid">
                    {selectedRequest.photos.map((photo, index) => (
                      <div className="rf-photo" key={`${photo.name}-${index}`}>
                        {photo.url ? (
                          <a
                            href={photo.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${photo.name}`}
                          >
                            <img src={photo.url} alt={photo.name} />
                          </a>
                        ) : (
                          <div className="rf-photo-placeholder">
                            <FileImage size={28} />
                            <span>Demo attachment</span>
                          </div>
                        )}
                        <small title={photo.name}>{photo.name}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rf-note">
                    No images attached to this request.
                  </p>
                )}

                <p className="rf-attachment-note">
                  Actual photo previews will appear here once image
                  URLs are supplied by the backend.
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
                              {bid.type} · ★ {bid.rating}
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

                  {selectedRequest.photos.length > 0 && (
                    <div className="rf-timeline-item">
                      <span className="rf-timeline-dot" />
                      <div>
                        <strong>Damage evidence attached</strong>
                        <p>
                          {selectedRequest.photos.length} image records
                        </p>
                      </div>
                    </div>
                  )}

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
  return <AppShell />;
}
