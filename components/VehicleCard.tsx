import React from 'react';
import type { InternalFleetData } from '../types';

declare const jspdf: any;
declare const html2canvas: any;
declare const XLSX: any;


interface VehicleCardProps {
  data: InternalFleetData | null;
  onClose: () => void;
}

const getValue = (data: any, key: string, fallback: any = ''): any => {
    // Check for the exact key first
    if (data?.[key] !== undefined && data?.[key] !== null) {
        return data[key];
    }
    // Fallback for common inconsistencies, e.g., 'MONTH' vs 'Month'
    const upperKey = key.toUpperCase();
    const titleCaseKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    if (data?.[upperKey] !== undefined && data?.[upperKey] !== null) return data[upperKey];
    if (data?.[titleCaseKey] !== undefined && data?.[titleCaseKey] !== null) return data[titleCaseKey];
    
    return fallback;
};

const formatNumber = (value: any): string => {
    const num = Number(value);
    if (typeof num === 'number' && !isNaN(num)) {
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (value === null || typeof value === 'undefined') return '';
    return String(value);
};

const InfoField: React.FC<{ label: string; value: React.ReactNode; className?: string; }> = ({ label, value, className = '' }) => (
    <div className={`flex flex-col ${className}`}>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</span>
        <div className="bg-white border border-gray-400 p-2 min-h-[38px] flex items-center text-sm text-black">{value}</div>
    </div>
);

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg font-bold text-purple-700 mb-2 uppercase">{title}</h3>
);

const TotalField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col items-center">
        <span className="text-sm font-semibold uppercase mb-1 text-gray-700">{label}</span>
        <div className="bg-white border border-gray-400 p-2 min-h-[38px] w-full text-center flex items-center justify-center text-sm font-bold text-black">{value}</div>
    </div>
);

const VehicleCard: React.FC<VehicleCardProps> = ({ data, onClose }) => {
  const cardContentRef = React.useRef<HTMLDivElement>(null);
  
  if (!data) return null;
  const anyData = data as any;

  // --- Calculations ---
  const rRevenue = Number(getValue(anyData, 'R-Revenue', 0));
  const fRevenue = Number(getValue(anyData, 'F-Revenue', 0));
  const totalRevenue = rRevenue + fRevenue;
  
  const vehicleCost = Number(getValue(anyData, 'Vehicle Cost', 0));
  const mCost = Number(getValue(anyData, 'M-Cost', 0));
  const rTotalCost = Number(getValue(anyData, 'R-Total Cost', 0));
  const fCost = Number(getValue(anyData, 'Act Fuel (F-Cost)', 0));
  const totalCost = rTotalCost + fCost;

  const totalProfit = totalRevenue - totalCost;

  const isExternalFleet = getValue(anyData, 'Fleet_Category') === 'External Fleets';
  const backCharged = getValue(anyData, 'Back Charged');
  const paidAmount = getValue(anyData, 'Paid Amount');

  const monthValue = getValue(anyData, 'MONTH');
  let monthDisplay = '';
  if (monthValue instanceof Date && !isNaN(monthValue.getTime())) {
    const monthIndex = monthValue.getUTCMonth();
    monthDisplay = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][monthIndex];
  } else {
    monthDisplay = String(monthValue || '').toUpperCase().substring(0, 3);
  }

  const yearDisplay = getValue(anyData, 'YEAR');

  const handleExportPdf = async () => {
    const content = cardContentRef.current;
    if (!content) return;
    const buttons = content.querySelector('.pdf-export-hide');
    if (buttons) (buttons as HTMLElement).style.display = 'none';

    try {
        const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#f3f4f6' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pdfWidth - margin * 2;
        const contentHeight = (contentWidth / canvas.width) * canvas.height;
        const yOffset = (pdfHeight - contentHeight) / 2;

        pdf.addImage(imgData, 'PNG', margin, yOffset > margin ? yOffset : margin, contentWidth, contentHeight);
        pdf.save(`Vehicle_Card_${getValue(anyData, 'Reg No:', 'export')}.pdf`);
    } finally {
        if (buttons) (buttons as HTMLElement).style.display = 'flex';
    }
  };

  const handleExportExcel = () => {
    const excelData = [
        { Group: "Vehicle Info", Key: "Reg No:", Value: getValue(anyData, 'Reg No:') },
        { Group: "Vehicle Info", Key: "YOM", Value: getValue(anyData, 'YOM') },
        { Group: "Vehicle Info", Key: "Fleet No:", Value: getValue(anyData, 'Fleet No:') },
        { Group: "Vehicle Info", Key: "Vehicle Description", Value: getValue(anyData, 'Vehicle Description') },
        { Group: "Vehicle Info", Key: "Fleet_Category", Value: getValue(anyData, 'Fleet_Category') },
        { Group: "Vehicle Info", Key: "Supplier Name", Value: getValue(anyData, 'Supplier Name') },
        { Group: "Vehicle Info", Key: "Business Units", Value: getValue(anyData, 'Business Units') },
        { Group: "Vehicle Info", Key: "Month", Value: monthDisplay },
        { Group: "Vehicle Info", Key: "Year", Value: yearDisplay },
        {},
        { Group: "Totals", Key: "Total Revenue", Value: totalRevenue },
        { Group: "Totals", Key: "Total Cost", Value: totalCost },
        { Group: "Totals", Key: "Total Profit", Value: totalProfit },
        {},
        { Group: "Rent", Key: "W Days", Value: getValue(anyData, 'W Days') },
        { Group: "Rent", Key: "Tot Rent", Value: getValue(anyData, 'Tot Rent') },
        { Group: "Rent", Key: "R-Revenue", Value: rRevenue },
        { Group: "Rent", Key: "Vehicle Cost", Value: vehicleCost },
        { Group: "Rent", Key: "M-Cost", Value: mCost },
        { Group: "Rent", Key: "R-Total Cost", Value: rTotalCost },
        {},
        { Group: "Fuel", Key: "Act Fuel (F-Cost)", Value: fCost },
        { Group: "Fuel", Key: "Fuel W% F-Profit", Value: getValue(anyData, 'Fuel W% F-Profit') },
        { Group: "Fuel", Key: "F-Revenue", Value: fRevenue },
    ];

    if (isExternalFleet) {
        excelData.push({}); // spacer
        excelData.push({ Group: "External Fleet Details", Key: "Back Charged", Value: backCharged });
        excelData.push({ Group: "External Fleet Details", Key: "Paid Amount", Value: paidAmount });
    }

    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vehicle Card");
    XLSX.writeFile(wb, `Vehicle_Card_${getValue(anyData, 'Reg No:', 'export')}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
            className="bg-gray-100 text-black p-6 rounded-lg shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto font-sans relative border-4 border-gray-600"
            onClick={(e) => e.stopPropagation()}
        >
            <div ref={cardContentRef}>
                <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 hover:text-red-600 text-4xl font-bold transition-colors pdf-export-hide">&times;</button>
                
                {/* Header Section */}
                <div className="relative mb-4">
                    <h2 className="text-xl font-bold text-purple-700">Vehicle Card</h2>
                    <div className="absolute top-0 right-0 flex gap-2">
                        <InfoField label="Month" value={monthDisplay} className="w-24" />
                        <InfoField label="Year" value={yearDisplay} className="w-24" />
                    </div>
                </div>

                {/* Details Section */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                    <InfoField label="Reg No:" value={getValue(anyData, 'Reg No:')} />
                    <InfoField label="YOM" value={getValue(anyData, 'YOM')} />
                    <InfoField label="Fleet No:" value={getValue(anyData, 'Fleet No:')} />
                </div>
                <InfoField label="Vehicle Description" value={getValue(anyData, 'Vehicle Description')} className="mb-2" />
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <InfoField label="Fleet_Category" value={getValue(anyData, 'Fleet_Category')} />
                    <InfoField label="Supplier Name" value={getValue(anyData, 'Supplier Name')} />
                </div>
                <InfoField label="Business Units" value={getValue(anyData, 'Business Units')} className="mb-6" />

                {/* Totals Section */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <TotalField label="Total Revenue" value={formatNumber(totalRevenue)} />
                    <TotalField label="Total Cost" value={formatNumber(totalCost)} />
                    <TotalField label="Total Profit" value={formatNumber(totalProfit)} />
                </div>
                
                {/* Rent & Fuel Sections */}
                <div className="grid grid-cols-[2fr_1fr] gap-6">
                    {/* Rent Section */}
                    <div className="space-y-3">
                        <SectionTitle title="Rent" />
                        <div className="grid grid-cols-3 gap-2">
                            <InfoField label="W Days" value={formatNumber(getValue(anyData, 'W Days'))} />
                            <InfoField label="Tot Rent" value={formatNumber(getValue(anyData, 'Tot Rent'))} />
                            <InfoField label="R-Revenue" value={formatNumber(rRevenue)} />
                            <InfoField label="Vehicle Cost" value={formatNumber(vehicleCost)} />
                            <InfoField label="M-Cost" value={formatNumber(mCost)} />
                            <InfoField label="R-Total Cost" value={formatNumber(rTotalCost)} />
                        </div>
                    </div>
                    {/* Fuel Section */}
                    <div className="space-y-3">
                        <SectionTitle title="Fuel" />
                        <div className="flex flex-col gap-2">
                            <InfoField label="Act Fuel (F-Cost)" value={formatNumber(fCost)} />
                            <InfoField label="Fuel W% F-Profit" value={formatNumber(getValue(anyData, 'Fuel W% F-Profit'))} />
                            <InfoField label="F-Revenue" value={formatNumber(fRevenue)} />
                        </div>
                    </div>
                </div>

                {/* Job Card Section */}
                <div className="mt-6">
                    <SectionTitle title="Job Card" />
                    <div className="grid grid-cols-3 gap-4">
                        <InfoField label="Total Amount" value={formatNumber(getValue(anyData, 'jobCardAmount', 0))} className="col-span-1" />
                    </div>
                </div>

                {isExternalFleet && (
                    <div className="mt-6">
                        <SectionTitle title="External Fleet Details" />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoField label="Back Charged" value={formatNumber(backCharged)} />
                            <InfoField label="Paid Amount" value={formatNumber(paidAmount)} />
                        </div>
                    </div>
                )}

                 <div className="mt-8 pt-4 border-t border-gray-300 flex justify-end gap-3 pdf-export-hide">
                    <button onClick={handleExportExcel} className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Save to Excel</button>
                    <button onClick={handleExportPdf} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg">Save to PDF</button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default VehicleCard;