import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Package, FolderPlus, Archive } from 'lucide-react';

export default function InvoiceProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const showDeleted = searchParams.get('view') === 'deleted';
  
  const [products, setProducts] = useState([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    price: '',
    unit: 'pcs',
    stock_quantity: ''
  });
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    if (!showDeleted) {
      fetchDeletedCount();
    }
  }, [showDeleted]);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/products?include_deleted=${showDeleted}`);
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedCount = async () => {
    try {
      const response = await api.get('/products?include_deleted=true');
      const deleted = response.data.filter(p => p.deleted === true);
      setDeletedCount(deleted.length);
    } catch (error) {
      console.error('Failed to fetch deleted count');
    }
  };

  const handleRestore = async (productId) => {
    if (!window.confirm('Are you sure you want to restore this product?')) return;
    try {
      await api.put(`/products/${productId}/restore`);
      toast.success('Product restored successfully', {
        style: { background: '#10b981', color: 'white' }
      });
      setProducts(products.filter(p => p.id !== productId));
      setDeletedCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error('Failed to restore product', {
        style: { background: '#ef4444', color: 'white' }
      });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        stock_quantity: parseFloat(formData.stock_quantity)
      };
      
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, data);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', data);
        toast.success('Product created successfully');
      }
      setDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post('/product-categories', { name: categoryName });
      toast.success('Category created successfully');
      setCategoryDialogOpen(false);
      setCategoryName('');
      fetchCategories();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      description: product.description || '',
      price: product.price.toString(),
      unit: product.unit,
      stock_quantity: product.stock_quantity.toString()
    });
    setDialogOpen(true);
  };

  const handleQuickPriceUpdate = async (productId, newPrice) => {
    try {
      await api.put(`/products/${productId}`, { price: parseFloat(newPrice) });
      toast.success('Price updated');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update price');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category_id: '', description: '', price: '', unit: 'pcs', stock_quantity: '' });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || product.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
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
            {showDeleted ? 'Deleted Products' : 'Products'}
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
                title={showDeleted ? "View Active Products" : `View Deleted Products (${deletedCount})`}
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <FolderPlus className="w-4 h-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category Name *</label>
                    <Input
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Product Name *"
                        required
                      />
                    </div>
                    <div className="col-span-6">
                      <Select value={formData.category_id || "none"} onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Product Description"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Price (Rs) *"
                        required
                      />
                    </div>
                    <div className="col-span-4">
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unit *" />
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
                    <div className="col-span-4">
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.stock_quantity === '' ? undefined : formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                        placeholder="Stock Qty"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProduct ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {products.length >= 5 && (
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{product.name}</h3>
                        <p className="text-xs text-gray-500">{getCategoryName(product.category_id)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {product.description && (
                    <p className="text-sm text-gray-600">{product.description}</p>
                  )}
                  
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Price (Rs)</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={product.price}
                        onChange={(e) => handleQuickPriceUpdate(product.id, e.target.value)}
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Stock</label>
                      <p className="font-bold text-gray-900 mt-1">{product.stock_quantity} {product.unit}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2 border-t">
                    {showDeleted ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleRestore(product.id)}
                        >
                          Restore
                        </Button>
                        <div className="text-xs text-gray-500 flex flex-col items-end">
                          <span>Deleted: {product.deleted_at ? new Date(product.deleted_at).toLocaleDateString() : ''}</span>
                          {product.deleted_by && <span>By: {product.deleted_by}</span>}
                        </div>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(product.id)}
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

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              {searchTerm || filterCategory !== 'all' ? 'No products found matching your filters' : 'No products yet. Click "Add Product" to get started.'}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
