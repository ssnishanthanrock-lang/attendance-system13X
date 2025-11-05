import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    reason: '',
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      const response = await api.get('/leaves');
      setLeaves(response.data);
    } catch (error) {
      toast.error('Failed to fetch leaves');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      toast.success('Leave request submitted successfully');
      setDialogOpen(false);
      resetForm();
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit leave request');
    }
  };

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      await api.put(`/leaves/${leaveId}`, { status });
      toast.success(`Leave ${status} successfully`);
      fetchLeaves();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update leave status');
    }
  };

  const resetForm = () => {
    setFormData({
      leave_type: 'annual',
      from_date: new Date().toISOString().split('T')[0],
      to_date: new Date().toISOString().split('T')[0],
      reason: '',
    });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="leaves-title">
            Leave Management
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="apply-leave-button"
                onClick={resetForm}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Apply Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Apply for Leave</DialogTitle>
                <DialogDescription>Submit your leave request</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Leave Type *</label>
                  <Select value={formData.leave_type} onValueChange={(value) => setFormData({ ...formData, leave_type: value })}>
                    <SelectTrigger data-testid="leave-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="casual">Casual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="no_pay">No Pay Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date *</label>
                    <Input
                      data-testid="from-date-input"
                      type="date"
                      value={formData.from_date}
                      onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date *</label>
                    <Input
                      data-testid="to-date-input"
                      type="date"
                      value={formData.to_date}
                      onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason *</label>
                  <Textarea
                    data-testid="reason-textarea"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Please provide a reason for your leave"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    data-testid="submit-leave-button"
                    type="submit"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leaves List */}
        <div className="space-y-4" data-testid="leaves-list">
          {leaves.map((leave) => (
            <Card key={leave.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {leave.employee_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
                        </p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                          leave.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : leave.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {leave.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Duration</p>
                        <p className="font-medium text-sm">
                          {leave.from_date} to {leave.to_date}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Applied On</p>
                        <p className="font-medium text-sm">{new Date(leave.applied_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{leave.reason}</p>
                    </div>

                    {leave.approved_by && (
                      <p className="text-xs text-gray-500">Reviewed by: {leave.approved_by}</p>
                    )}
                  </div>

                  {isAdmin && leave.status === 'pending' && (
                    <div className="flex lg:flex-col gap-2">
                      <Button
                        data-testid={`approve-leave-${leave.id}`}
                        size="sm"
                        onClick={() => handleStatusUpdate(leave.id, 'approved')}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        data-testid={`reject-leave-${leave.id}`}
                        size="sm"
                        onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                        className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {leaves.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No leave requests found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
