import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Trash2, Calendar, User, Clock } from 'lucide-react';

export default function DeletedAttendance() {
  const [deletedRecords, setDeletedRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedRecords();
  }, []);

  const fetchDeletedRecords = async () => {
    setLoading(true);
    try {
      const response = await api.get('/attendance/deleted');
      setDeletedRecords(response.data);
    } catch (error) {
      toast.error('Failed to fetch deleted records');
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
          Deleted Attendance Records
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Deleted Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Deleted By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Deleted At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deletedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No deleted records found
                      </td>
                    </tr>
                  ) : (
                    deletedRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            {record.employee_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {record.date}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{record.deleted_by_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {formatTimestamp(record.deleted_at)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
