import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, CheckCircle, XCircle, Wallet } from 'lucide-react';

export default function Advances() {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    amount: 0,
    reason: '',
    repayment_months: 1,
  });

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    fetchAdvances();
  }, []);

  const fetchAdvances = async () => {
    try {
      const response = await api.get('/advances');
      setAdvances(response.data);
    } catch (error) {
      toast.error('Failed to fetch advances');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/advances', formData);
      toast.success('Advance request submitted successfully');
      setDialogOpen(false);
      resetForm();
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit advance request');
    }
  };

  const handleStatusUpdate = async (advanceId, status) => {
    try {
      await api.put(`/advances/${advanceId}`, { status });
      toast.success(`Advance ${status} successfully`);
      fetchAdvances();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update advance status');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      reason: '',
      repayment_months: 1,
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }} data-testid="advances-title">
            Advance Management
          </h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="request-advance-button"
                onClick={resetForm}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Request Advance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Work Sans, sans-serif' }}>Request Advance</DialogTitle>
                <DialogDescription>Submit your advance request</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (Rs.) *</label>
                  <Input
                    data-testid="amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repayment Period (Months) *</label>
                  <Input
                    data-testid="repayment-input"
                    type="number"
                    min="1"
                    max="12"
                    value={formData.repayment_months}
                    onChange={(e) => setFormData({ ...formData, repayment_months: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason *</label>
                  <Textarea
                    data-testid="reason-textarea"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Please provide a reason for your advance request"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    data-testid="submit-advance-button"
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

        {/* Advances List */}
        <div className="space-y-4" data-testid="advances-list">
          {advances.map((advance) => (
            <Card key={advance.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                          {advance.employee_name}
                        </h3>
                        <p className="text-2xl font-bold text-blue-600 mt-1">
                          Rs. {advance.amount.toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full whitespace-nowrap ${
                          advance.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : advance.status === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {advance.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-600">Repayment Period</p>
                        <p className="font-medium text-sm">{advance.repayment_months} months</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Request Date</p>
                        <p className="font-medium text-sm">{new Date(advance.request_date).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-600 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{advance.reason}</p>
                    </div>

                    {advance.approved_by && (
                      <p className="text-xs text-gray-500">Reviewed by: {advance.approved_by}</p>
                    )}
                  </div>

                  {isAdmin && advance.status === 'pending' && (
                    <div className="flex lg:flex-col gap-2">
                      <Button
                        data-testid={`approve-advance-${advance.id}`}
                        size="sm"
                        onClick={() => handleStatusUpdate(advance.id, 'approved')}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        data-testid={`reject-advance-${advance.id}`}
                        size="sm"
                        onClick={() => handleStatusUpdate(advance.id, 'rejected')}
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

        {advances.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No advance requests found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
