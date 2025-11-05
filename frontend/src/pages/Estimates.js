import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, FileText, ArrowRight, Trash2 } from 'lucide-react';

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [estimateForm, setEstimateForm] = useState({
    customer_id: '',
    estimate_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    notes: '',
    items: [{ product_id: '', product_name: '', description: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => {
    fetchEstimates();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchEstimates = async () => {
    try {
      const response = await api.get('/estimates');
      setEstimates(response.data);
    } catch (error) {
      toast.error('Failed to fetch estimates');
    } finally {
      setLoading(false);
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

  const handleCreateEstimate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/estimates', estimateForm);
      toast.success('Estimate created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchEstimates();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create estimate');
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
      valid_until: '',
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
            Estimates
          </h1>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Estimate
          </Button>
        </div>

        <div>
          <Input
            placeholder="Search by estimate number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

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
                    {estimate.status !== 'converted' && (
                      <Button
                        size="sm"
                        onClick={() => handleConvertToInvoice(estimate.id)}
                      >
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Convert to Invoice
                      </Button>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Customer *</label>
                  <Select value={estimateForm.customer_id} onValueChange={(value) => setEstimateForm({ ...estimateForm, customer_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estimate Date *</label>
                  <Input
                    type="date"
                    value={estimateForm.estimate_date}
                    onChange={(e) => setEstimateForm({ ...estimateForm, estimate_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Valid Until</label>
                <Input
                  type="date"
                  value={estimateForm.valid_until}
                  onChange={(e) => setEstimateForm({ ...estimateForm, valid_until: e.target.value })}
                />
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
                  <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-end">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">Product</label>
                      <Select
                        value={item.product_id || "custom"}
                        onValueChange={(value) => updateEstimateItem(index, 'product_id', value === "custom" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
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
                      <label className="block text-xs font-medium mb-1">Name *</label>
                      <Input
                        value={item.product_name}
                        onChange={(e) => updateEstimateItem(index, 'product_name', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Qty *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateEstimateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium mb-1">Price *</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateEstimateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium mb-1">Total</label>
                      <p className="text-sm font-semibold">Rs {(item.quantity * item.unit_price).toFixed(2)}</p>
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
      </div>
    </Layout>
  );
}
