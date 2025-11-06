import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, FileText, Eye, DollarSign, Trash2, Filter, Archive } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const showDeleted = searchParams.get('view') === 'deleted';
  
  const [invoices, setInvoices] = useState([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inline creation states
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [productFormKey, setProductFormKey] = useState(0);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({
    name: '', company_name: '', email: '', phone: '', whatsapp: '', city: '', address: ''
  });
  const [newProductData, setNewProductData] = useState({
    name: '', description: '', price: '', unit: 'pcs', stock_quantity: '', category_id: ''
  });
  
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: getDefaultDueDate(),
    notes: '',
    items: [{ product_id: '', product_name: '', description: '', quantity: '', unit_price: '' }]
  });

  // Helper function to get default due date (1 month from today)
  function getDefaultDueDate() {
    const today = new Date();
    const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
    return nextMonth.toISOString().split('T')[0];
  }

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
    fetchCategories();
    if (!showDeleted) {
      fetchDeletedCount();
    }
  }, [showDeleted]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get(`/invoices?include_deleted=${showDeleted}`);
      // When viewing deleted, filter to show only deleted items
      const filteredData = showDeleted 
        ? response.data.filter(i => i.deleted === true)
        : response.data;
      setInvoices(filteredData);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedCount = async () => {
    try {
      const response = await api.get('/invoices?include_deleted=true');
      const deleted = response.data.filter(i => i.deleted === true);
      setDeletedCount(deleted.length);
    } catch (error) {
      console.error('Failed to fetch deleted count');
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

  const fetchCategories = async () => {
    try {
      const response = await api.get('/product-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  // Inline category creation
  const handleAddNewCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/product-categories', { name: newCategoryName });
      toast.success('Category added successfully', { style: { background: '#10b981', color: 'white' } });
      setAddCategoryDialogOpen(false);
      setNewCategoryName('');
      await fetchCategories();
      // Auto-select the new category
      setNewProductData({ ...newProductData, category_id: response.data.id });
    } catch (error) {
      toast.error('Failed to add category', { style: { background: '#ef4444', color: 'white' } });
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
      // Auto-select the new customer
      setInvoiceForm({ ...invoiceForm, customer_id: response.data.id });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add customer', { style: { background: '#ef4444', color: 'white' } });
    }
  };

  // Inline product creation
  const handleAddNewProduct = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/products', newProductData);
      toast.success('Product added successfully', { style: { background: '#10b981', color: 'white' } });
      setAddProductDialogOpen(false);
      setNewProductData({ name: '', description: '', price: '', unit: 'pcs', stock_quantity: '', category_id: '' });
      await fetchProducts();
      // Return the new product to be added to the invoice
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add product', { style: { background: '#ef4444', color: 'white' } });
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices', invoiceForm);
      toast.success('Invoice created successfully', { style: { background: '#10b981', color: 'white' } });
      setCreateDialogOpen(false);
      resetInvoiceForm();
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice', { style: { background: '#ef4444', color: 'white' } });
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      setSelectedInvoice(response.data);
      setViewDialogOpen(true);
    } catch (error) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/invoices/${invoiceId}`);
      toast.success('Invoice deleted successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      fetchInvoices();
    } catch (error) {
      toast.error('Failed to delete invoice', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleRestoreInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to restore this invoice?')) return;
    try {
      await api.put(`/invoices/${invoiceId}/restore`);
      toast.success('Invoice restored successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      setInvoices(invoices.filter(i => i.id !== invoiceId));
      setDeletedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to restore invoice', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/invoices/${selectedInvoice.id}/payments`, {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount)
      });
      toast.success('Payment added successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      setPaymentDialogOpen(false);
      resetPaymentForm();
      fetchInvoices();
      if (viewDialogOpen) {
        handleViewInvoice(selectedInvoice.id);
      }
    } catch (error) {
      toast.error('Failed to add payment');
    }
  };

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { product_id: '', product_name: '', description: '', quantity: '', unit_price: '' }]
    });
  };

  const removeInvoiceItem = (index) => {
    const newItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceForm.items];
    newItems[index][field] = value;
    
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].product_name = product.name;
        newItems[index].unit_price = product.price;
      }
    }
    
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      customer_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: getDefaultDueDate(),
      notes: '',
      items: [{ product_id: '', product_name: '', description: '', quantity: '', unit_price: '' }]
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: ''
    });
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-yellow-100 text-yellow-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
            {showDeleted ? 'Deleted Invoices' : 'Invoices'}
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
                title={showDeleted ? "View Active Invoices" : `View Deleted Invoices (${deletedCount})`}
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Invoice
            </Button>
          </div>
        </div>

        {invoices.length >= 5 && (
          <div className="flex gap-4">
            <Input
              placeholder="Search by invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-lg">{invoice.invoice_number}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(invoice.status)}`}>
                        {invoice.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-semibold">{getCustomerName(invoice.customer_id)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-semibold">{invoice.invoice_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total</p>
                        <p className="font-semibold text-green-600">Rs {invoice.total.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Balance</p>
                        <p className="font-semibold text-red-600">Rs {(invoice.total - invoice.amount_paid).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {showDeleted ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleRestoreInvoice(invoice.id)}
                        >
                          Restore
                        </Button>
                        <div className="text-xs text-gray-500 flex flex-col items-end">
                          <span>Deleted: {invoice.deleted_at ? new Date(invoice.deleted_at).toLocaleDateString() : ''}</span>
                          {invoice.deleted_by && <span>By: {invoice.deleted_by}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(invoice.id)}>
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {invoice.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setPaymentForm({ ...paymentForm, amount: (invoice.total - invoice.amount_paid).toString() });
                              setPaymentDialogOpen(true);
                            }}
                          >
                            Add Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteInvoice(invoice.id)}
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

        {filteredInvoices.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 'No invoices found matching your filters' : 'No invoices yet. Click "Create Invoice" to get started.'}
            </CardContent>
          </Card>
        )}

        {/* Create Invoice Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetInvoiceForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <Select 
                    value={invoiceForm.customer_id} 
                    onValueChange={(value) => {
                      if (value === 'add_new') {
                        setAddCustomerDialogOpen(true);
                      } else {
                        setInvoiceForm({ ...invoiceForm, customer_id: value });
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
                  <label className="block text-xs font-medium mb-1">Invoice Date *</label>
                  <Input
                    type="date"
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-xs font-medium mb-1">Due Date</label>
                  <Input
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Invoice Items</h3>
                  <Button type="button" size="sm" onClick={addInvoiceItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-3 items-center">
                    <div className="col-span-3">
                      <Select
                        value={item.product_id || "custom"}
                        onValueChange={(value) => {
                          if (value === "add_new") {
                            setAddProductDialogOpen(true);
                          } else {
                            updateInvoiceItem(index, 'product_id', value === "custom" ? "" : value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Product" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add_new" className="text-blue-600 font-semibold">
                            + Add New Product
                          </SelectItem>
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
                        onChange={(e) => updateInvoiceItem(index, 'product_name', e.target.value)}
                        placeholder="Name *"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.quantity === '' ? undefined : item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', e.target.value)}
                        placeholder="Qty *"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price === '' ? undefined : item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, 'unit_price', e.target.value)}
                        placeholder="Price *"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <p className="text-sm font-semibold text-center">Rs {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</p>
                    </div>
                    <div className="col-span-1">
                      {invoiceForm.items.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => removeInvoiceItem(index)}
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
                      <p className="text-2xl font-bold text-green-600">Rs {calculateTotal(invoiceForm.items).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Textarea
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Invoice Dialog */}
        {selectedInvoice && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Invoice Number</p>
                      <p className="font-bold text-lg">{selectedInvoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Customer</p>
                      <p className="font-semibold">{selectedInvoice.customer?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">{selectedInvoice.invoice_date}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 text-sm">Item</th>
                        <th className="text-right p-2 text-sm">Qty</th>
                        <th className="text-right p-2 text-sm">Price</th>
                        <th className="text-right p-2 text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{item.product_name}</td>
                          <td className="text-right p-2">{item.quantity}</td>
                          <td className="text-right p-2">Rs {item.unit_price.toFixed(2)}</td>
                          <td className="text-right p-2">Rs {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 font-bold">
                      <tr>
                        <td colSpan="3" className="text-right p-2">Total</td>
                        <td className="text-right p-2 text-green-600">Rs {selectedInvoice.total.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-right p-2">Paid</td>
                        <td className="text-right p-2">Rs {selectedInvoice.amount_paid.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td colSpan="3" className="text-right p-2">Balance</td>
                        <td className="text-right p-2 text-red-600">Rs {(selectedInvoice.total - selectedInvoice.amount_paid).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Payment History</h3>
                    <div className="space-y-2">
                      {selectedInvoice.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-semibold">Rs {payment.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">{payment.payment_method} - {payment.payment_date}</p>
                          </div>
                          {payment.notes && <p className="text-sm text-gray-600">{payment.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Payment Dialog */}
        {selectedInvoice && (
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Payment - {selectedInvoice.invoice_number}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="Amount (Rs) *"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Outstanding: Rs {(selectedInvoice.total - selectedInvoice.amount_paid).toFixed(2)}</p>
                </div>
                <div>
                  <Input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    placeholder="Payment Date *"
                    required
                  />
                </div>
                <div>
                  <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Method *" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Payment Notes (Optional)"
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Payment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

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

        {/* Add Product Dialog (Inline) */}
        <Dialog open={addProductDialogOpen} onOpenChange={(open) => {
          setAddProductDialogOpen(open);
          if (!open) {
            // Reset form when closing
            setNewProductData({ name: '', description: '', price: '', unit: 'pcs', stock_quantity: '', category_id: '' });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNewProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <Input
                  value={newProductData.name}
                  onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select 
                  value={newProductData.category_id || "none"} 
                  onValueChange={(value) => {
                    if (value === 'add_new') {
                      setAddCategoryDialogOpen(true);
                    } else {
                      setNewProductData({ ...newProductData, category_id: value === "none" ? "" : value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_new" className="text-blue-600 font-semibold">
                      + Add New Category
                    </SelectItem>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={newProductData.description}
                  onChange={(e) => setNewProductData({ ...newProductData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (Rs) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProductData.price}
                    onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit *</label>
                  <Select value={newProductData.unit} onValueChange={(value) => setNewProductData({ ...newProductData, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="hrs">Hours</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="set">Set</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newProductData.stock_quantity === '' ? undefined : newProductData.stock_quantity}
                    onChange={(e) => setNewProductData({ ...newProductData, stock_quantity: e.target.value })}
                    placeholder="Enter stock quantity"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddProductDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Add Product</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Category Dialog (Inline) */}
        <Dialog open={addCategoryDialogOpen} onOpenChange={setAddCategoryDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddNewCategory} className="space-y-4">
              <div>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category Name *"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddCategoryDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Add Category</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
