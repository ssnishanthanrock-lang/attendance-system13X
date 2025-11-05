import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Activity, Calendar, User, FileText, ChevronDown } from 'lucide-react';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    action_type: '',
    search: ''
  });

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchLogs(true);
  }, []);

  const fetchLogs = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.search) params.append('search', filters.search);
      params.append('limit', ITEMS_PER_PAGE.toString());
      
      const response = await api.get(`/activity-logs?${params.toString()}`);
      const newLogs = response.data;
      
      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }
      
      // Check if there are more records
      setHasMore(newLogs.length === ITEMS_PER_PAGE);
      
      if (!reset) {
        setPage(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to fetch activity logs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleFilter = () => {
    fetchLogs(true);
  };

  const handleLoadMore = () => {
    fetchLogs(false);
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-700';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Activity Logs
          </h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                type="date"
                placeholder="From Date"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              />
              <Input
                type="date"
                placeholder="To Date"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              />
              <Input
                placeholder="Search action or user..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Button onClick={handleFilter} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                Apply Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activity Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No activity logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatTimestamp(log.timestamp)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {log.user_name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Load More Button */}
            {hasMore && logs.length > 0 && (
              <div className="flex justify-center mt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {loadingMore ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
            
            {/* Results Info */}
            {logs.length > 0 && (
              <div className="text-center mt-4 text-sm text-gray-500">
                Showing {logs.length} record{logs.length !== 1 ? 's' : ''}
                {!hasMore && ' (all records loaded)'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
