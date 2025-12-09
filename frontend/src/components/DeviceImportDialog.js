import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Upload, Loader, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import axios from 'axios';

const DeviceImportDialog = ({ open, onClose, employees, onImportComplete }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Parsing, 3: Mapping, 4: Duplicate, 5: Importing
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [mappings, setMappings] = useState({});
  const [duplicateAction, setDuplicateAction] = useState('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    
    // Check if it's an Excel file
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    
    if (isExcel) {
      // For Excel files, read as binary and convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        // Send indication that it's Excel format
        setFileContent(`[EXCEL_FILE]\n${file.name}\n${event.target.result}`);
      };
      reader.readAsDataURL(file);
    } else {
      // For text files, read as text
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleParse = async () => {
    if (!fileContent) {
      alert('Please upload a file first');
      return;
    }

    setStep(2); // Parsing step

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      const response = await axios.post(
        `${backendUrl}/api/attendance/parse-device-import`,
        {
          file_content: fileContent,
          company_id: currentUser.company_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setParsedData(response.data.data);
      
      // Initialize mappings
      const initialMappings = {};
      response.data.data.unique_vendor_ids?.forEach(vendorId => {
        initialMappings[vendorId] = '';
      });
      setMappings(initialMappings);
      
      setStep(3); // Move to mapping step
    } catch (error) {
      console.error('Parse error:', error);
      alert('Failed to parse file: ' + (error.response?.data?.detail || error.message));
      setStep(1);
    }
  };

  const handleMappingChange = (vendorId, employeeId) => {
    setMappings(prev => ({
      ...prev,
      [vendorId]: employeeId
    }));
  };

  const handleContinueToImport = () => {
    // Check if all vendor IDs are mapped
    const unmapped = Object.entries(mappings).filter(([_, empId]) => !empId);
    if (unmapped.length > 0) {
      alert(`Please map all vendor IDs. ${unmapped.length} IDs are not mapped.`);
      return;
    }
    setStep(4); // Duplicate handling step
  };

  const handleImport = async () => {
    setStep(5); // Importing step
    setImporting(true);

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      // Build mappings array
      const mappingsArray = Object.entries(mappings).map(([vendorId, employeeId]) => {
        const employee = employees.find(e => e.id === employeeId);
        return {
          vendor_id: vendorId,
          employee_id: employeeId,
          employee_name: employee?.name || 'Unknown'
        };
      });

      const response = await axios.post(
        `${backendUrl}/api/attendance/import-device-data`,
        {
          company_id: currentUser.company_id,
          mappings: mappingsArray,
          parsed_records: parsedData.records,
          duplicate_action: duplicateAction
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(response.data);
      setImporting(false);
      
      // Call parent callback
      if (onImportComplete) {
        onImportComplete(response.data);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import: ' + (error.response?.data?.detail || error.message));
      setImporting(false);
      setStep(4);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFileContent('');
    setFileName('');
    setParsedData(null);
    setMappings({});
    setDuplicateAction('skip');
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Attendance from Device</DialogTitle>
        </DialogHeader>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Upload your fingerprint device export file (.dat, .txt, .csv, .xlsx, .xls)</p>
              <input
                type="file"
                accept=".dat,.txt,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button asChild>
                  <span className="cursor-pointer">Choose File</span>
                </Button>
              </label>
              {fileName && (
                <p className="mt-4 text-sm text-green-600 flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" />
                  {fileName}
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleParse} disabled={!fileContent}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: AI Parsing */}
        {step === 2 && (
          <div className="space-y-4 text-center py-12">
            <Loader className="w-16 h-16 mx-auto text-blue-600 animate-spin" />
            <p className="text-lg font-medium">AI is analyzing your file...</p>
            <p className="text-sm text-gray-600">This may take a few moments</p>
          </div>
        )}

        {/* Step 3: ID Mapping */}
        {step === 3 && parsedData && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">File Analysis Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Format:</span> {parsedData.format_detected}
                </div>
                <div>
                  <span className="text-gray-600">Total Records:</span> {parsedData.total_records}
                </div>
                <div>
                  <span className="text-gray-600">Date Range:</span> {parsedData.date_range?.start} to {parsedData.date_range?.end}
                </div>
                <div>
                  <span className="text-gray-600">Unique IDs:</span> {parsedData.unique_vendor_ids?.length}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Map Device IDs to Employees</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parsedData.unique_vendor_ids?.map(vendorId => {
                  const recordCount = parsedData.records.filter(r => r.vendor_id === vendorId).length;
                  return (
                    <div key={vendorId} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 w-24">
                        <p className="text-sm font-medium text-gray-700">Device ID:</p>
                        <p className="text-lg font-bold text-blue-600">{vendorId}</p>
                        <p className="text-xs text-gray-500">{recordCount} records</p>
                      </div>
                      <div className="flex-1">
                        <Select
                          value={mappings[vendorId] || ''}
                          onValueChange={(value) => handleMappingChange(vendorId, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} - {emp.position || emp.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleContinueToImport}>
                Continue to Import
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Duplicate Handling */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-4">Handle Duplicate Records</h3>
              <p className="text-sm text-gray-600 mb-4">
                If attendance already exists for an employee on a specific date, what should we do?
              </p>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="duplicate"
                    value="skip"
                    checked={duplicateAction === 'skip'}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Skip existing records (Recommended)</p>
                    <p className="text-sm text-gray-600">Keep current attendance data, only add new records</p>
                  </div>
                </label>
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="duplicate"
                    value="overwrite"
                    checked={duplicateAction === 'overwrite'}
                    onChange={(e) => setDuplicateAction(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Overwrite existing records</p>
                    <p className="text-sm text-gray-600">Replace current attendance data with device data</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleImport}>
                Start Import
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Importing / Result */}
        {step === 5 && (
          <div className="space-y-4">
            {importing ? (
              <div className="text-center py-12">
                <Loader className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
                <p className="text-lg font-medium">Importing attendance records...</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                  <h3 className="text-2xl font-bold text-green-600 mb-2">Import Complete!</h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{result.imported}</p>
                    <p className="text-sm text-gray-600">Imported</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                    <p className="text-sm text-gray-600">Skipped</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{result.overwritten}</p>
                    <p className="text-sm text-gray-600">Overwritten</p>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-700 mb-2">Errors ({result.errors.length})</p>
                        <ul className="text-sm text-red-600 space-y-1 max-h-40 overflow-y-auto">
                          {result.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleClose}>Close</Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceImportDialog;
