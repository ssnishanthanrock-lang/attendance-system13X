import { useState, useEffect } from 'react';
import { api } from '../App';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Settings, Clock, Calendar, Plus, Trash2 } from 'lucide-react';

export default function CompanySettings() {
  const [settings, setSettings] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '', type: 'public' });

  useEffect(() => {
    fetchSettings();
    fetchCompanyInfo();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyInfo = async () => {
    try {
      const response = await api.get('/company');
      setCompany(response.data);
    } catch (error) {
      console.error('Failed to fetch company info');
    }
  };

  const handleUpdateSettings = async (updates) => {
    try {
      await api.put('/settings', updates);
      toast.success('Settings updated successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/holidays', holidayForm);
      toast.success('Holiday added successfully');
      setDialogOpen(false);
      setHolidayForm({ date: '', name: '', type: 'public' });
      fetchSettings();
    } catch (error) {
      toast.error('Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (date) => {
    try {
      await api.delete(`/settings/holidays/${date}`);
      toast.success('Holiday removed');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to remove holiday');
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
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Company Settings
          </h1>
        </div>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Office Working Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="time"
                  value={settings?.office_start_time || '09:00'}
                  onChange={(e) => handleUpdateSettings({ office_start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="time"
                  value={settings?.office_end_time || '17:00'}
                  onChange={(e) => handleUpdateSettings({ office_end_time: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saturday Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Saturday Working Day</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Saturday</p>
                <p className="text-sm text-gray-600">Include Saturday as a working day</p>
              </div>
              <Switch
                checked={settings?.saturday_enabled || false}
                onCheckedChange={(checked) => handleUpdateSettings({ saturday_enabled: checked })}
              />
            </div>

            {settings?.saturday_enabled && (
              <>
                <div>
                  <label className="text-sm font-medium">Saturday Type</label>
                  <Select
                    value={settings?.saturday_type || 'full'}
                    onValueChange={(value) => handleUpdateSettings({ saturday_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Day</SelectItem>
                      <SelectItem value="half">Half Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Saturday Start</label>
                    <Input
                      type="time"
                      value={settings?.saturday_start_time || '09:00'}
                      onChange={(e) => handleUpdateSettings({ saturday_start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Saturday End</label>
                    <Input
                      type="time"
                      value={settings?.saturday_end_time || '14:00'}
                      onChange={(e) => handleUpdateSettings({ saturday_end_time: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Working Days Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Calculation - Working Days</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkingDaysCalculator settings={settings} />
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Holiday Calendar
              </CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Holiday</DialogTitle>
                    <DialogDescription>Add a public holiday or company leave day</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddHoliday} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Date *</label>
                      <Input
                        type="date"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Holiday Name *</label>
                      <Input
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        placeholder="e.g., Poya Day"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={holidayForm.type}
                        onValueChange={(value) => setHolidayForm({ ...holidayForm, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public Holiday</SelectItem>
                          <SelectItem value="poya">Poya Day</SelectItem>
                          <SelectItem value="company">Company Holiday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                      <Button type="submit">Add Holiday</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {settings?.holidays?.length > 0 ? (
              <div className="space-y-2">
                {settings.holidays.map((holiday) => (
                  <div key={holiday.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{holiday.name}</p>
                      <p className="text-sm text-gray-600">{new Date(holiday.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{holiday.type}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteHoliday(holiday.date)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No holidays added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Logo & Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Logo & Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Company Logo */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Company Logo</label>
                {settings?.company_logo && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                    <img src={settings.company_logo} alt="Company Logo" className="max-h-24 object-contain" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', 'logo');
                      try {
                        const response = await api.post('/company/branding', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        toast.success('Logo uploaded successfully');
                        fetchSettings();
                      } catch (error) {
                        toast.error('Failed to upload logo');
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">Recommended: PNG/SVG, transparent background, 200x200px</p>
              </div>

              {/* Favicon */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Favicon</label>
                {settings?.favicon && (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed">
                    <img src={settings.favicon} alt="Favicon" className="max-h-16 object-contain rounded-lg" style={{ borderRadius: '8px' }} />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('type', 'favicon');
                      try {
                        const response = await api.post('/company/branding', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        toast.success('Favicon uploaded successfully');
                        fetchSettings();
                      } catch (error) {
                        toast.error('Failed to upload favicon');
                      }
                    }
                  }}
                />
                <p className="text-xs text-gray-500">Recommended: ICO/PNG, 32x32px or 64x64px</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function WorkingDaysCalculator({ settings }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workingDaysData, setWorkingDaysData] = useState(null);
  const [allMonthsData, setAllMonthsData] = useState({});
  const [loading, setLoading] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    if (settings) {
      calculateWorkingDays();
      calculateAllMonths();
    }
  }, [selectedMonth, selectedYear, settings]);

  const calculateWorkingDays = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/settings/working-days/${selectedYear}/${selectedMonth}`);
      setWorkingDaysData(response.data);
    } catch (error) {
      toast.error('Failed to calculate working days');
    } finally {
      setLoading(false);
    }
  };

  const calculateAllMonths = async () => {
    try {
      const monthsData = {};
      // Calculate for all 12 months
      for (let month = 1; month <= 12; month++) {
        const response = await api.get(`/settings/working-days/${selectedYear}/${month}`);
        monthsData[month] = response.data;
      }
      setAllMonthsData(monthsData);
    } catch (error) {
      // Silent fail - dropdown will show without data
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Select Month</label>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-96">
                {months.map((month, index) => {
                  const monthNum = index + 1;
                  const monthData = allMonthsData[monthNum];
                  
                  return (
                    <SelectItem key={index} value={monthNum.toString()}>
                      <div className="flex items-center justify-between w-full min-w-[280px]">
                        <span className="font-medium">{month} {selectedYear}</span>
                        {monthData ? (
                          <div className="flex gap-3 text-xs ml-4">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                              {monthData.working_days} days
                            </span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                              {monthData.holidays} holidays
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              {monthData.sundays} sundays
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 ml-4">Calculating...</span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Year</label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : workingDaysData ? (
        <div className="space-y-3">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Work Sans, sans-serif' }}>
                {workingDaysData.working_days}
              </p>
              <p className="text-sm text-gray-600 mt-1">Working Days</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-center flex-1">
              <p className="text-xs text-gray-600">Total Days</p>
              <p className="text-lg font-semibold text-gray-900">{workingDaysData.total_days}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-600">Sundays</p>
              <p className="text-lg font-semibold text-gray-900">{workingDaysData.sundays}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-600">Holidays</p>
              <p className="text-lg font-semibold text-gray-900">{workingDaysData.holidays}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-gray-600">Half Days</p>
              <p className="text-lg font-semibold text-gray-900">{workingDaysData.half_days}</p>
            </div>
          </div>

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 font-medium">
              💡 This calculation is based on your Holiday Calendar and Saturday settings
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
