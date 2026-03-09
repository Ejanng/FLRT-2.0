import React, { useState, useMemo, useEffect } from 'react';
import {
  type PaginationState,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Search, MapPin, Calendar, Tag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import '../styles.css';

const CLAIM_PUBLISH_TRIGGER_KEY = 'claimableReportsRefreshToken';
const API_BASE_URL = 'http://localhost:5000';

const normalizeStatus = (status: unknown): 'lost' | 'found' => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'published_lost') return 'lost';
  if (value === 'published_found') return 'found';
  return value === 'lost' ? 'lost' : 'found';
};

const resolveImageUrl = (imageValue: string | null | undefined): string => {
  if (!imageValue) return 'https://via.placeholder.com/300x200?text=Image';
  if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
    return imageValue;
  }
  return `${API_BASE_URL}/reports/images/${encodeURIComponent(imageValue)}`;
};

interface LostItem {
  id: string;
  name: string;
  description: string;
  location: string;
  date: string;
  category: string;
  status: 'lost' | 'found';
  image: string;
}

const columns = [
  { accessorKey: 'name' as const, header: 'Name' },
  { accessorKey: 'description' as const, header: 'Description' },
  { accessorKey: 'location' as const, header: 'Location' },
  { accessorKey: 'date' as const, header: 'Date' },
  { accessorKey: 'category' as const, header: 'Category' },
  { accessorKey: 'status' as const, header: 'Status' },
];

export const Claimant: React.FC = () => {
  const [data, setData] = useState<LostItem[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [loadMessage, setLoadMessage] = useState('Loading reports...');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 9,
  });
  const navigate = useNavigate();

  const fetchPublishedReports = async () => {
    try {
      const response = await fetch('http://localhost:5000/reports/claimable-reports');
      if (response.ok) {
        const result = await response.json();
        const fetchedReports: LostItem[] = (result.reports || []).map((report: any) => ({
          id: String(report.report_id),
          name: report.item_name || '',
          description: report.description || '',
          location: report.location || '',
          date: report.date_reported ? new Date(report.date_reported).toLocaleDateString() : '',
          category: report.category || 'Published',
          status: normalizeStatus(report.status),
          image: resolveImageUrl(report.image),
        }));
        setData(fetchedReports);
        setLoadMessage(fetchedReports.length ? '' : 'No published reports available.');
      } else {
        console.error('Failed to fetch published reports');
        setLoadMessage('Failed to load published reports.');
      }
    } catch (error) {
      console.error('Error fetching published reports:', error);
      setLoadMessage('Error loading published reports.');
    }
  };

  useEffect(() => {
    fetchPublishedReports();

    const trigger = localStorage.getItem(CLAIM_PUBLISH_TRIGGER_KEY);
    if (trigger) {
      localStorage.removeItem(CLAIM_PUBLISH_TRIGGER_KEY);
    }
  }, []); 


  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesCategory = categoryFilter === 'All Categories' || item.category === categoryFilter;
      const matchesType = typeFilter === 'All Types' ||
        (typeFilter === 'Lost' && item.status === 'lost') ||
        (typeFilter === 'Found' && item.status === 'found');
      const matchesGlobal = globalFilter === '' ||
        item.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.description.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.location.toLowerCase().includes(globalFilter.toLowerCase());
      return matchesCategory && matchesType && matchesGlobal;
    });
  }, [data, categoryFilter, typeFilter, globalFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleAction = (item: LostItem) => {
    navigate({
      to: '/claim/claimForm',
      search: {
        id: item.id,
        name: item.name,
        description: item.description,
        location: item.location,
        date: item.date,
        category: item.category,
        status: item.status,
        image: item.image,
      },
    });
  };

  return (
    <div className="page">
      <div className="container">
        {/* Filters */}
        <div className="filters">
          <div className="filters-row">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search..."
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                className="input"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="select"
            >
              <option>All Categories</option>
              <option>Accessories</option>
              <option>Books</option>
              <option>Bags</option>
              <option>Electronics</option>
              <option>Stationery</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="select"
            >
              <option>All Types</option>
              <option>Lost</option>
              <option>Found</option>
            </select>
          </div>
        </div>

        {/* Items Header */}
        <div className="items-header">
          <span>{filteredData.length} items found</span>
          <button className="refresh-btn" onClick={fetchPublishedReports}>
            Refresh
          </button>
        </div>

        {/* Cards */}
        <div className="cards-grid">
          {loadMessage && <p>{loadMessage}</p>}
          {table.getRowModel().rows.map(row => {
            const item = row.original;
            return (
              <div key={row.id} className="card">
                <div className="card-image">
                  <img src={item.image} alt={item.name} />
                </div>

                <div className="card-content">
                  <div className="card-header">
                    <h3>{item.name}</h3>
                    <span className={`badge ${item.status}`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="description">{item.description}</p>

                  <div className="details">
                    <div><MapPin size={14}/> {item.location}</div>
                    <div><Calendar size={14}/> {item.date}</div>
                    <div><Tag size={14}/> {item.category}</div>
                  </div>

                  <button
                    className="action-btn"
                    onClick={() => handleAction(item)}
                  >
                    Claim Item
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <div className="pagination">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>

            <div className="pagination-buttons">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Claimant;
