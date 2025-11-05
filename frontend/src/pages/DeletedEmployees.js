import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, UserCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeletedEmployees() {
  const navigate = useNavigate();
  const [deletedEmployees, setDeletedEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedEmployees();
  }, []);

  const fetchDeletedEmployees = async () => {
    try {
      setLoading(true);
      // Fetch only deleted employees using include_deleted parameter
      const response = await api.get('/employees?include_deleted=true');
      setDeletedEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch deleted employees');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to reactivate ${employeeName}?`)) {
      return;
    }

    try {
      await api.patch(`/employees/${employeeId}/reactivate`);
      toast.success(`${employeeName} has been reactivated`);
      fetchDeletedEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reactivate employee');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/attendance')}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Deleted Employees
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inactive Employee Records</CardTitle>
          </CardHeader>
          <CardContent>
            {deletedEmployees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No deleted employees found</p>
                <p className="text-gray-400 text-sm mt-2">All employees are currently active</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mobile</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Position</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joining Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletedEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-3">
                            {/* Profile Picture */}
                            <div className="w-10 h-10 rounded-full flex-shrink-0">
                              {employee.profile_pic && employee.profile_pic.trim() !== '' ? (
                                <img 
                                  src={employee.profile_pic} 
                                  alt={employee.name} 
                                  className="w-10 h-10 rounded-full object-cover"
                                  onError={(e) => {
                                    e.target.outerHTML = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                  <User className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{employee.name}</p>
                              <p className="text-xs text-gray-500">{employee.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {employee.email || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {employee.mobile || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {employee.position || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {employee.join_date || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            onClick={() => handleReactivate(employee.id, employee.name)}
                            size="sm"
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                          >
                            <UserCheck className="w-4 h-4" />
                            Reactivate
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
