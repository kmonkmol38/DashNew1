import React, { useRef } from 'react';
import type { DriverOperatorData } from '../types';

declare const XLSX: any;
declare const jspdf: any;
declare const html2canvas: any;


interface EmployeeSalaryCardProps {
  data: DriverOperatorData | null;
  onClose: () => void;
}

// Helper to safely access possibly missing data properties
const getValue = (data: any, key: string, fallback: any = ''): any => {
    return data?.[key] ?? fallback;
};

// Helper to format numbers to 2 decimal places
const formatNumber = (value: any): string => {
    const num = Number(value);
    if (typeof num === 'number' && !isNaN(num)) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    // For values that aren't numbers (or are invalid), return them as is, or an empty string if null/undefined.
    if (value === null || typeof value === 'undefined') return '';
    return String(value);
};


const InfoField: React.FC<{ label: string; value: React.ReactNode; className?: string }> = ({ label, value, className = '' }) => (
    <div className={`flex flex-col ${className}`}>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">{label}</span>
        <div className="bg-white border border-gray-400 p-2 min-h-[38px] flex items-center text-sm text-black">{value}</div>
    </div>
);

const AmountRow: React.FC<{ label: string; hours: any; price: any; amount: any }> = ({ label, hours, price, amount }) => (
    <tr>
        <td className="border border-gray-400 p-2 text-left text-black">{label}</td>
        <td className="border border-gray-400 p-2 text-right text-black">{hours}</td>
        <td className="border border-gray-400 p-2 text-right text-black">{price}</td>
        <td className="border border-gray-400 p-2 text-right text-black">{amount}</td>
    </tr>
);

const CostGridItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col">
        <div className="text-center border border-b-0 border-gray-400 bg-gray-200 p-1 text-sm font-semibold text-black">{label}</div>
        <div className="text-center border border-gray-400 bg-white p-2 min-h-[40px] flex items-center justify-center text-black">{value}</div>
    </div>
);


const EmployeeSalaryCard: React.FC<EmployeeSalaryCardProps> = ({ data, onClose }) => {
  const cardContentRef = useRef<HTMLDivElement>(null);
  
  if (!data) return null;

  const anyData = data as any;

  const basicSalary = Number(getValue(anyData, 'Basic Salary', 0));
  const otherAllowance = Number(getValue(anyData, 'Other Allowance', 0));
  const totalSalary = basicSalary + otherAllowance;
  
  const ctcCostKeys = [
    'Leave', 'TKT', 'ESB', 'Accom', 'FOOD', 'Uniform', 
    'RP+HC', 'MED INS', 'SAL TRF', 'WC INS', 'HO'
  ];

  const totalCtcCost = ctcCostKeys.reduce((sum, key) => {
      const value = Number(getValue(anyData, key, 0));
      return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const handleExportPdf = async () => {
    const content = cardContentRef.current;
    if (!content) {
        alert("Could not find the card content to export.");
        return;
    }
    
    const buttonsContainer = content.querySelector('.pdf-export-hide');
    if (buttonsContainer) (buttonsContainer as HTMLElement).style.display = 'none';

    try {
        const canvas = await html2canvas(content, { 
            scale: 2,
            backgroundColor: '#f3f4f6' // Match the modal background
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Use a standard page size like A4 portrait
        const pdf = new jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const canvasAspectRatio = canvasWidth / canvasHeight;
        const pageAspectRatio = pdfWidth / pdfHeight;

        let renderWidth, renderHeight;
        if (canvasAspectRatio > pageAspectRatio) {
            renderWidth = pdfWidth;
            renderHeight = pdfWidth / canvasAspectRatio;
        } else {
            renderHeight = pdfHeight;
            renderWidth = pdfHeight * canvasAspectRatio;
        }
        
        const xOffset = (pdfWidth - renderWidth) / 2;
        const yOffset = (pdfHeight - renderHeight) / 2;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight);
        
        const employeeName = getValue(anyData, 'EMPLOYEE NAME', 'Employee');
        const month = getValue(anyData, 'Month', '');
        const year = getValue(anyData, 'Year', '');
        pdf.save(`Salary_Card_${employeeName}_${month}_${year}.pdf`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("An error occurred while creating the PDF.");
    } finally {
        if (buttonsContainer) (buttonsContainer as HTMLElement).style.display = 'flex';
    }
  };

  const handleExportExcel = () => {
    const employeeName = getValue(anyData, 'EMPLOYEE NAME', 'Employee');
    const month = getValue(anyData, 'Month', '');
    const year = getValue(anyData, 'Year', '');

    const excelData = [
        { Section: "Employee Info", Field: "Employee Name", Value: employeeName },
        { Section: "Employee Info", Field: "SAP No.", Value: getValue(anyData, 'SAP NO.') ?? getValue(anyData, 'SAP NO:') },
        { Section: "Employee Info", Field: "Designation", Value: getValue(anyData, 'DESIGNATION') },
        { Section: "Employee Info", Field: "Business Units", Value: getValue(anyData, 'BUSINESS UNITS') },
        { Section: "Employee Info", Field: "Month", Value: month },
        { Section: "Employee Info", Field: "Year", Value: year },
        {}, // Spacer
        { Section: "EHRC Earnings", Field: "Total EHRC Earnings", Value: formatNumber(getValue(anyData, 'Net Amount')) },
        { Section: "EHRC Earnings", Field: "Rate", Value: formatNumber(getValue(anyData, 'Monthly')) },
        { Section: "EHRC Earnings", Field: "N-Hours", Value: formatNumber(getValue(anyData, 'N-Hours')) },
        { Section: "EHRC Earnings", Field: "N-Price", Value: formatNumber(getValue(anyData, 'N-Price')) },
        { Section: "EHRC Earnings", Field: "N-Amount", Value: formatNumber(getValue(anyData, 'N-Amount')) },
        { Section: "EHRC Earnings", Field: "N-OTHours", Value: formatNumber(getValue(anyData, 'N-OTHours')) },
        { Section: "EHRC Earnings", Field: "N-OTPrice", Value: formatNumber(getValue(anyData, 'N-OTPrice')) },
        { Section: "EHRC Earnings", Field: "N-OTAmount", Value: formatNumber(getValue(anyData, 'N-OTAmount')) },
        { Section: "EHRC Earnings", Field: "H-OTHours", Value: formatNumber(getValue(anyData, 'H-OTHours')) },
        { Section: "EHRC Earnings", Field: "H-OTPrice", Value: formatNumber(getValue(anyData, 'H-OTPrice')) },
        { Section: "EHRC Earnings", Field: "H-OTAmount", Value: formatNumber(getValue(anyData, 'H-OTAmount')) },
        {}, // Spacer
        { Section: "Payroll Breakdowns", Field: "Total Payroll", Value: formatNumber(getValue(anyData, 'Net Amount2')) },
        { Section: "Payroll Breakdowns", Field: "Basic Salary", Value: formatNumber(basicSalary) },
        { Section: "Payroll Breakdowns", Field: "Other Allowance", Value: formatNumber(otherAllowance) },
        { Section: "Payroll Breakdowns", Field: "Total Salary", Value: formatNumber(totalSalary) },
        { Section: "Payroll Breakdowns", Field: "N-Hours2", Value: formatNumber(getValue(anyData, 'N-Hours2')) },
        { Section: "Payroll Breakdowns", Field: "N-Price2", Value: formatNumber(getValue(anyData, 'N-Price2')) },
        { Section: "Payroll Breakdowns", Field: "N-Amount2", Value: formatNumber(getValue(anyData, 'N-Amount2')) },
        { Section: "Payroll Breakdowns", Field: "N-OTHours2", Value: formatNumber(getValue(anyData, 'N-OTHours2')) },
        { Section: "Payroll Breakdowns", Field: "N-OTPrice2", Value: formatNumber(getValue(anyData, 'N-OTPrice2')) },
        { Section: "Payroll Breakdowns", Field: "N-OTAmount2", Value: formatNumber(getValue(anyData, 'N-OTAmount2')) },
        { Section: "Payroll Breakdowns", Field: "H-OTHours2", Value: formatNumber(getValue(anyData, 'H-OTHours2')) },
        { Section: "Payroll Breakdowns", Field: "H-OTPrice2", Value: formatNumber(getValue(anyData, 'H-OTPrice2')) },
        { Section: "Payroll Breakdowns", Field: "H-OTAmount2", Value: formatNumber(getValue(anyData, 'H-OTAmount2')) },
        {}, // Spacer
        { Section: "CTC Costs", Field: "Total CTC Costs", Value: formatNumber(totalCtcCost) },
        ...ctcCostKeys.map(key => ({ Section: "CTC Costs", Field: key, Value: formatNumber(getValue(anyData, key)) })),
    ];
    
    const ws = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
    // Set column widths for better readability
    ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Card");
    XLSX.writeFile(wb, `Salary_Card_${employeeName}_${month}_${year}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 font-sans" onClick={onClose}>
      <div 
        className="bg-gray-100 text-black p-8 rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto relative border-4 border-gray-600"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the card
      >
        <div ref={cardContentRef}>
            <button 
              onClick={onClose} 
              className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-4xl font-bold transition-colors pdf-export-hide"
              aria-label="Close"
            >
              &times;
            </button>
            
            <div className="grid grid-cols-4 gap-x-4 gap-y-2 mb-4">
              <InfoField label="Employee Name" value={getValue(anyData, 'EMPLOYEE NAME')} className="col-span-2" />
              <InfoField label="Month" value={getValue(anyData, 'Month')} />
              <InfoField label="Year" value={getValue(anyData, 'Year')} />
              <InfoField label="SAP No." value={getValue(anyData, 'SAP NO.') ?? getValue(anyData, 'SAP NO:')} />
              <InfoField label="Designation" value={getValue(anyData, 'DESIGNATION')} />
              <InfoField label="Business Units" value={getValue(anyData, 'BUSINESS UNITS')} className="col-span-2" />
            </div>

            {/* --- EHRC Earnings --- */}
            <div className="grid grid-cols-[1fr_3fr] gap-x-4 items-start mt-6">
              <div className="flex flex-col gap-4">
                  <InfoField label="EHRC Earnings" value={formatNumber(getValue(anyData, 'Net Amount'))} />
                  <InfoField label="Rate" value={formatNumber(getValue(anyData, 'Monthly'))} />
              </div>
              <div>
                <table className="w-full border-collapse border border-gray-400 bg-white text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 w-1/4 text-left font-semibold text-black">As per 10 Hrs</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">N-Hours</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">N-Price</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AmountRow label="N-Hours" hours={formatNumber(getValue(anyData, 'N-Hours'))} price={formatNumber(getValue(anyData, 'N-Price'))} amount={formatNumber(getValue(anyData, 'N-Amount'))} />
                    <AmountRow label="N-OTHours" hours={formatNumber(getValue(anyData, 'N-OTHours'))} price={formatNumber(getValue(anyData, 'N-OTPrice'))} amount={formatNumber(getValue(anyData, 'N-OTAmount'))} />
                    <AmountRow label="H-OTHours" hours={formatNumber(getValue(anyData, 'H-OTHours'))} price={formatNumber(getValue(anyData, 'H-OTPrice'))} amount={formatNumber(getValue(anyData, 'H-OTAmount'))} />
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- Payroll Breakdowns --- */}
            <div className="grid grid-cols-[1fr_3fr] gap-x-4 items-start mt-6">
              <div className="flex flex-col gap-2">
                  <InfoField label="Payroll Breakdowns" value={formatNumber(getValue(anyData, 'Net Amount2'))} />
                  <InfoField label="BASIC SALARY" value={formatNumber(basicSalary)} />
                  <InfoField label="Other Allowance" value={formatNumber(otherAllowance)} />
                  <InfoField label="Total Salary" value={formatNumber(totalSalary)} />
              </div>
              <div>
                <table className="w-full border-collapse border border-gray-400 bg-white text-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border border-gray-400 p-2 w-1/4 text-left font-semibold text-black">As per 8 Hrs</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">N-Hours2</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">N-Price2</th>
                      <th className="border border-gray-400 p-2 text-left font-semibold text-black">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AmountRow label="N-Hours2" hours={formatNumber(getValue(anyData, 'N-Hours2'))} price={formatNumber(getValue(anyData, 'N-Price2'))} amount={formatNumber(getValue(anyData, 'N-Amount2'))} />
                    <AmountRow label="N-OTHours2" hours={formatNumber(getValue(anyData, 'N-OTHours2'))} price={formatNumber(getValue(anyData, 'N-OTPrice2'))} amount={formatNumber(getValue(anyData, 'N-OTAmount2'))} />
                    <AmountRow label="H-OTHours2" hours={formatNumber(getValue(anyData, 'H-OTHours2'))} price={formatNumber(getValue(anyData, 'H-OTPrice2'))} amount={formatNumber(getValue(anyData, 'H-OTAmount2'))} />
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* --- CTC & Uniform Costs --- */}
            <div className="mt-6">
                <h2 className="font-bold text-lg mb-2 flex justify-between items-baseline text-black">
                    <span>CTC Costs</span>
                    <span className="text-base font-mono bg-gray-200 px-2 py-1 rounded">{formatNumber(totalCtcCost)}</span>
                </h2>
                <div className="grid grid-cols-5 gap-px bg-gray-400">
                    <CostGridItem label="Leave" value={formatNumber(getValue(anyData, 'Leave'))} />
                    <CostGridItem label="TKT" value={formatNumber(getValue(anyData, 'TKT'))} />
                    <CostGridItem label="ESB" value={formatNumber(getValue(anyData, 'ESB'))} />
                    <CostGridItem label="Accom" value={formatNumber(getValue(anyData, 'Accom'))} />
                    <CostGridItem label="FOOD" value={formatNumber(getValue(anyData, 'FOOD'))} />
                </div>
                <div className="grid grid-cols-6 gap-px bg-gray-400 mt-px">
                    <CostGridItem label="Uniform" value={formatNumber(getValue(anyData, 'Uniform'))} />
                    <CostGridItem label="RP+HC" value={formatNumber(getValue(anyData, 'RP+HC'))} />
                    <CostGridItem label="MED INS" value={formatNumber(getValue(anyData, 'MED INS'))} />
                    <CostGridItem label="SAL TRF" value={formatNumber(getValue(anyData, 'SAL TRF'))} />
                    <CostGridItem label="WC INS" value={formatNumber(getValue(anyData, 'WC INS'))} />
                    <CostGridItem label="HO" value={formatNumber(getValue(anyData, 'HO'))} />
                </div>
            </div>

            {/* Calculation Note */}
            <div className="mt-6">
                <div className="text-xs text-gray-600 italic p-3 bg-gray-200 rounded-lg border border-gray-300 text-left">
                    <p className="font-bold mb-1">Note on Price Calculation: (If using a Monthly Rate)</p>
                    <p className="ml-2">The <strong>N-Price</strong> is calculated as (Rate / Working Days) / 10.</p>
                    <p className="ml-2">The <strong>N-OT Price</strong> is ((Monthly Rate X 12) / 365 / 10) X 1.25</p>
                    <p className="ml-2">The <strong>H-OT Price</strong> is ((Monthly Rate X 12) / 365 / 10) X 1.50</p>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-300 flex justify-end gap-3 pdf-export-hide">
                <button
                    onClick={handleExportExcel}
                    className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 text-sm"
                >
                    Save to Excel
                </button>
                <button
                    onClick={handleExportPdf}
                    className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 text-sm"
                >
                    Save to PDF
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSalaryCard;