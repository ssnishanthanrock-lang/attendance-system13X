import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, FileText, ArrowRight, Trash2, Archive } from 'lucide-react';

export default function Estimates() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showDeleted = searchParams.get('view') === 'deleted';
  
  const [estimates, setEstimates] = useState([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline creation states
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '', company_name: '', email: '', phone: '', whatsapp: '', city: '', address: ''
  });
  
  // Helper function to get default valid until date (1 month from today)
  function getDefaultValidUntil() {
    const today = new Date();
    const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
    return nextMonth.toISOString().split('T')[0];
  }

  const [estimateForm, setEstimateForm] = useState({
    customer_id: '',
    estimate_date: new Date().toISOString().split('T')[0],
    valid_until: getDefaultValidUntil(),
    notes: '',
    items: [{ product_id: '', product_name: '', description: '', quantity: '', unit_price: '' }]
  });

  useEffect(() => {
    fetchEstimates();
    fetchCustomers();
    fetchProducts();
    if (!showDeleted) {
      fetchDeletedCount();
    }
  }, [showDeleted]);

  const fetchEstimates = async () => {
    try {
      const response = await api.get(`/estimates?include_deleted=${showDeleted}`);
      // When viewing deleted, filter to show only deleted items
      const filteredData = showDeleted 
        ? response.data.filter(e => e.deleted === true)
        : response.data;
      setEstimates(filteredData);
    } catch (error) {
      toast.error('Failed to fetch estimates');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedCount = async () => {
    try {
      const response = await api.get('/estimates?include_deleted=true');
      const deleted = response.data.filter(e => e.deleted === true);
      setDeletedCount(deleted.length);
    } catch (error) {
      console.error('Failed to fetch deleted count');
    }
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('Are you sure you want to delete this estimate?')) return;
    try {
      await api.delete(`/estimates/${estimateId}`);
      toast.success('Estimate deleted successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      fetchEstimates();
    } catch (error) {
      toast.error('Failed to delete estimate', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleRestoreEstimate = async (estimateId) => {
    if (!window.confirm('Are you sure you want to restore this estimate?')) return;
    try {
      await api.put(`/estimates/${estimateId}/restore`);
      toast.success('Estimate restored successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      setEstimates(estimates.filter(e => e.id !== estimateId));
      setDeletedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to restore estimate', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  // Inline customer creation
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/customers', newCustomerData);
      toast.success('Customer added successfully', { style: { background: '#10b981', color: 'white' } });
      setAddCustomerDialogOpen(false);
      setNewCustomerData({ name: '', company_name: '', email: '', phone: '', whatsapp: '', city: '', address: '' });
      await fetchCustomers();
      setEstimateForm({ ...estimateForm, customer_id: response.data.id });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add customer', { style: { background: '#ef4444', color: 'white' } });
    }
  };

  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/estimates', estimateForm);
      toast.success('Estimate created successfully', { style: { background: '#10b981', color: 'white' } });
      setCreateDialogOpen(false);
      resetForm();
      fetchEstimates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create estimate', { style: { background: '#ef4444', color: 'white' } });
    }
  };

  const handleConvertToInvoice = async (estimateId) => {
    if (!window.confirm('Convert this estimate to an invoice?')) return;
    
    try {
      await api.post(`/estimates/${estimateId}/convert`);
      toast.success('Estimate converted to invoice successfully');
      fetchEstimates();
    } catch (error) {
      toast.error('Failed to convert estimate');
    }
  };

  const addEstimateItem = () => {
    setEstimateForm({
      ...estimateForm,
      items: [...estimateForm.items, { product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const removeEstimateItem = (index) => {
    const newItems = estimateForm.items.filter((_, i) => i !== index);
    setEstimateForm({ ...estimateForm, items: newItems });
  };

  const updateEstimateItem = (index, field, value) => {
    const newItems = [...estimateForm.items];
    newItems[index][field] = value;
    
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.price;
      }
    }
    
    setEstimateForm({ ...estimateForm, items: newItems });
  };

  const resetForm = () => {
    setEstimateForm({
      customer_id: '',
      estimate_date: new Date().toISOString().split('T')[0],
      valid_until: getDefaultValidUntil(),
      notes: '',
      items: [{ product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'accepted': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'converted': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredEstimates = estimates.filter(estimate =>
    estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown';
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            {showDeleted ? 'Deleted Estimates' : 'Estimates'}
          </h1>
          <div className="flex gap-2">
            {(deletedCount > 0 || showDeleted) && (
              <Button 
                variant={showDeleted ? "default" : "outline"} 
                size="sm" 
                onClick={() => {
                  if (showDeleted) {
                    setSearchParams({});
                  } else {
                    setSearchParams({ view: 'deleted' });
                  }
                }}
                title={showDeleted ? "View Active Estimates" : `View Deleted Estimates (${deletedCount})`}
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Estimate
            </Button>
          </div>
        </div>

        {estimates.length >= 5 && (
          <div>
            <Input
              placeholder="Search by estimate number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <h3 className="font-bold text-lg">{estimate.estimate_number}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(estimate.status)}`}>
                        {estimate.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-semibold">{getCustomerName(estimate.customer_id)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-semibold">{estimate.estimate_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valid Until</p>
                        <p className="font-semibold">{estimate.valid_until || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold text-green-600">Rs {estimate.total.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {showDeleted ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleRestoreEstimate(estimate.id)}
                        >
                          Restore
                        </Button>
                        <div className="text-xs text-gray-500 flex flex-col items-end">
                          <span>Deleted: {estimate.deleted_at ? new Date(estimate.deleted_at).toLocaleDateString() : ''}</span>
                          {estimate.deleted_by && <span>By: {estimate.deleted_by}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        {estimate.status !== 'converted' && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertToInvoice(estimate.id)}
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Convert to Invoice
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteEstimate(estimate.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEstimates.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              {searchTerm ? 'No estimates found matching your search' : 'No estimates yet. Click "Create Estimate" to get started.'}
            </CardContent>
          </Card>
        )}

        {/* Create Estimate Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEstimate} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <Select 
                    value={estimateForm.customer_id} 
                    onValueChange={(value) => {
                      if (value === 'add_new') {
                        setAddCustomerDialogOpen(true);
                      } else {
                        setEstimateForm({ ...estimateForm, customer_id: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Customer *" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add_new" className="text-blue-600 font-semibold">
                        + Add New Customer
                      </SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="block text-xs font-medium mb-1">Estimate Date *</label>
                  <Input
                    type="date"
                    value={estimateForm.estimate_date}
                    onChange={(e) => setEstimateForm({ ...estimateForm, estimate_date: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-xs font-medium mb-1">Valid Until</label>
                  <Input
                    type="date"
                    value={estimateForm.valid_until}
                    onChange={(e) => setEstimateForm({ ...estimateForm, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Estimate Items</h3>
                  <Button type="button" size="sm" onClick={addEstimateItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {estimateForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-center">
                    <div className="col-span-3">
                      <Select
                        value={item.product_id || "custom"}
                        onValueChange={(value) => updateEstimateItem(index, 'product_id', value === "custom" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Item</SelectItem>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateEstimateItem(index, 'product_name', e.target.value)}
                        placeholder="Name *"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateEstimateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty *"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateEstimateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        placeholder="Price *"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-semibold text-center">Rs {(item.quantity * item.unit_price).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                      {estimateForm.items.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => removeEstimateItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="text-2xl font-bold text-green-600">Rs {calculateTotal(estimateForm.items).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  value={estimateForm.notes}
                  onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Estimate</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Customer Dialog (Inline) */}
        <Dialog open={addCustomerDialogOpen} onOpenChange={setAddCustomerDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNewCustomer} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">Customer Name *</label>
                  <Input
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <Input
                    value={newCustomerData.company_name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                    placeholder="Enter company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit phone"
                    maxLength={10}
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">WhatsApp</label>
                  <Input
                    value={newCustomerData.whatsapp}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="10-digit WhatsApp"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    type="email"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-sm font-medium mb-1">City</label>
                  <Input
                    value={newCustomerData.city}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Textarea
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddCustomerDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Add Customer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
