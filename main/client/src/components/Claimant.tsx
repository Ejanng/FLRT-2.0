import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Search, MapPin, Calendar, Tag } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import '../styles.css';

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

// Sample data
const defaultData: LostItem[] = [
  {
    id: '1',
    name: 'Silver Leather Wallet',
    description: 'Black leather wallet with silver clasp',
    location: 'Library Entrance',
    date: '2026-02-10',
    category: 'Accessories',
    status: 'lost',
    image: 'https://via.placeholder.com/300x200?text=Wallet'
  },
  {
    id: '2',
    name: 'Blue Adidas Water Bottle',
    description: 'Insulated stainless steel bottle',
    location: 'Cafeteria',
    date: '2026-02-12',
    category: 'Bottles',
    status: 'found',
    image: 'https://via.placeholder.com/300x200?text=Water+Bottle'
  },
  {
    id: '3',
    name: 'MacBook Pro Charger',
    description: 'USB-C charging cable 2m white',
    location: 'Computer Lab 204',
    date: '2026-02-11',
    category: 'Electronics',
    status: 'lost',
    image: 'https://via.placeholder.com/300x200?text=Charger'
  },
  {
    id: '4',
    name: 'Red Backpack',
    description: 'North Face Borealis 28L',
    location: 'Gym Locker Room',
    date: '2026-02-13',
    category: 'Bags',
    status: 'found',
    image: 'https://via.placeholder.com/300x200?text=Backpack'
  }
];

// Columns for TanStack Table
const columns = [
  { accessorKey: 'name' as const, header: 'Name' },
  { accessorKey: 'description' as const, header: 'Description' },
  { accessorKey: 'location' as const, header: 'Location' },
  { accessorKey: 'date' as const, header: 'Date' },
  { accessorKey: 'category' as const, header: 'Category' },
  { accessorKey: 'status' as const, header: 'Status' },
];

export const Claimant: React.FC = () => {
  const [data] = useState<LostItem[]>(defaultData);
  const [globalFilter, setGlobalFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const navigate = useNavigate();

  // Client-side filtering
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
    state: { globalFilter, pagination: { pageIndex: 0, pageSize: 9 } },
    onGlobalFilterChange: setGlobalFilter,
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
        location: item.location,
        date: item.date,
        category: item.category,
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
          <button className="refresh-btn" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>

        {/* Cards */}
        <div className="cards-grid">
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