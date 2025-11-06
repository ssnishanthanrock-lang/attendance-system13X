import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Archive } from 'lucide-react';

export default function InvoiceCustomers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showDeleted = searchParams.get('view') === 'deleted';
  
  const [customers, setCustomers] = useState([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    city: '',
    address: ''
  });

  useEffect(() => {
    fetchCustomers();
    if (!showDeleted) {
      fetchDeletedCount();
    }
  }, [showDeleted]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get(`/customers?include_deleted=${showDeleted}`);
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedCount = async () => {
    try {
      const response = await api.get('/customers?include_deleted=true');
      const deleted = response.data.filter(c => c.deleted === true);
      setDeletedCount(deleted.length);
    } catch (error) {
      console.error('Failed to fetch deleted count');
    }
  };

  const handleRestore = async (customerId) => {
    if (!window.confirm('Are you sure you want to restore this customer?')) return;
    try {
      await api.put(`/customers/${customerId}/restore`);
      toast.success('Customer restored successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      // Remove from current list immediately
      setCustomers(customers.filter(c => c.id !== customerId));
      // Update deleted count
      setDeletedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to restore customer', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        toast.success('Customer updated successfully', {
          style: { background: '#10b981', color: 'white' }
        });
      } else {
        await api.post('/customers', formData);
        toast.success('Customer created successfully', {
          style: { background: '#10b981', color: 'white' }
        });
      }
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save customer', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      company_name: customer.company_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      city: customer.city || '',
      address: customer.address || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await api.delete(`/customers/${customerId}`);
      toast.success('Customer deleted successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer', {
        style: { background: '#ef4444', color: 'white' }
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', company_name: '', email: '', phone: '', whatsapp: '', city: '', address: '' });
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            {showDeleted ? 'Deleted Customers' : 'Customers'}
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
                title={showDeleted ? "View Active Customers" : `View Deleted Customers (${deletedCount})`}
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Customer Name *"
                        required
                      />
                    </div>
                    <div className="col-span-6">
                      <Input
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        placeholder="Company Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Email"
                      />
                    </div>
                    <div className="col-span-6">
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="Phone Number (10 digits)"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Input
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="WhatsApp Number (10 digits)"
                        maxLength={10}
                      />
                    </div>
                    <div className="col-span-6">
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                  </div>

                  <div>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Full Address"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCustomer ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {customers.length >= 5 && (
          <div className="mb-4">
            <Input
              placeholder="Search customers by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900">{customer.name}</h3>
                      {customer.company_name && (
                        <p className="text-xs text-gray-500">{customer.company_name}</p>
                      )}
                    </div>
                  </div>
                  
                  {customer.email && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Email:</span> {customer.email}
                    </p>
                  )}
                  
                  {customer.phone && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {customer.phone}
                    </p>
                  )}

                  {customer.whatsapp && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">WhatsApp:</span> {customer.whatsapp}
                    </p>
                  )}

                  {customer.city && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">City:</span> {customer.city}
                    </p>
                  )}
                  
                  {customer.address && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Address:</span> {customer.address}
                    </p>
                  )}
                  
                  <div className="flex gap-2 pt-2 border-t">
                    {showDeleted ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleRestore(customer.id)}
                        >
                          Restore
                        </Button>
                        <div className="text-xs text-gray-500 flex flex-col items-end">
                          <span>Deleted: {customer.deleted_at ? new Date(customer.deleted_at).toLocaleDateString() : ''}</span>
                          {customer.deleted_by && <span>By: {customer.deleted_by}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(customer.id)}
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

        {filteredCustomers.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              {searchTerm ? 'No customers found matching your search' : 'No customers yet. Click "Add Customer" to get started.'}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
