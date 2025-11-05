import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { User, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef } from 'react';

export default function EmployeeSalarySlip({ employee, month, onClose }) {
  const slipRef = useRef(null);

  const formatMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return {
      monthName: date.toLocaleDateString('en-US', { month: 'long' }),
      year: year
    };
  };

  const handleDownloadPDF = async () => {
    if (!slipRef.current) return;

    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${employee.employee_name}_Salary_${month}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleCopyAsImage = async () => {
    if (!slipRef.current) return;

    try {
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('Salary slip copied to clipboard! You can now paste it anywhere.');
        } catch (err) {
          console.error('Failed to copy image:', err);
          alert('Failed to copy image. Please try right-click > Save Image As instead.');
        }
      });
    } catch (error) {
      console.error('Error copying image:', error);
    }
  };

  const monthName = formatMonthName(month);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-between items-center sticky top-0 bg-white z-10 pb-4 border-b">
            <h2 className="text-lg font-bold">Salary Slip</h2>
            <div className="flex gap-2">
              <Button onClick={handleCopyAsImage} variant="outline" size="sm">
                Copy as Image
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Salary Slip Card */}
          <div ref={slipRef} className="bg-white p-8">
            <Card className="border-2 border-gray-300 shadow-lg">
              <CardContent className="p-8">
                {/* Header */}
                <div className="text-center mb-6 pb-6 border-b-2 border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">SALARY SLIP</h1>
                  <p className="text-lg text-gray-600">
                    {monthName.monthName} {monthName.year}
                  </p>
                </div>

                {/* Employee Details */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full flex-shrink-0">
                      {employee.profile_picture && employee.profile_picture.trim() !== '' ? (
                        <img 
                          src={employee.profile_picture} 
                          alt={employee.employee_name} 
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{employee.employee_name}</h2>
                      <p className="text-gray-600">{employee.position || 'Employee'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Employee ID:</span>
                      <span className="ml-2 font-semibold">{employee.employee_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Working Days:</span>
                      <span className="ml-2 font-semibold">{employee.working_days || 26}</span>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Earnings</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Basic Salary</span>
                      <span className="font-semibold">Rs {employee.basic_salary?.toLocaleString()}</span>
                    </div>
                    {employee.allowances > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Allowances</span>
                        <span className="font-semibold">Rs {employee.allowances?.toLocaleString()}</span>
                      </div>
                    )}
                    {employee.extra_payment > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Extra Payment</span>
                        <span className="font-semibold text-green-600">Rs {employee.extra_payment?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 bg-blue-50 px-3 rounded">
                      <span className="font-bold text-gray-900">Gross Salary</span>
                      <span className="font-bold text-blue-700">Rs {employee.gross_salary?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Info */}
                <div className="mb-6 bg-gray-50 p-4 rounded">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Attendance</h3>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Present:</span>
                      <span className="ml-2 font-semibold text-green-600">{employee.present_days || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Leave:</span>
                      <span className="ml-2 font-semibold text-orange-600">{employee.leave_days || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Late (min):</span>
                      <span className="ml-2 font-semibold text-red-600">{employee.late_minutes || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Deductions</h3>
                  <div className="space-y-2">
                    {employee.late_deduction > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Late Deduction</span>
                        <span className="font-semibold text-red-600">- Rs {employee.late_deduction?.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
                      </div>
                    )}
                    {employee.advances > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Advance</span>
                        <span className="font-semibold text-red-600">- Rs {employee.advances?.toLocaleString()}</span>
                      </div>
                    )}
                    {employee.loan_deduction > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Loan Deduction</span>
                        <span className="font-semibold text-red-600">- Rs {employee.loan_deduction?.toLocaleString()}</span>
                      </div>
                    )}
                    {employee.other_deductions > 0 && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Other Deductions</span>
                        <span className="font-semibold text-red-600">- Rs {employee.other_deductions?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 bg-red-50 px-3 rounded">
                      <span className="font-bold text-gray-900">Total Deductions</span>
                      <span className="font-bold text-red-700">Rs {employee.total_deductions?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">NET SALARY</span>
                    <span className="text-3xl font-bold text-green-700">Rs {employee.net_salary?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                  <p>This is a computer-generated salary slip and does not require a signature.</p>
                  <p className="mt-1">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
