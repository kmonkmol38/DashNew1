
import React, { useMemo, useRef } from 'react';
import type { DriverOperatorData } from '../types';
import { SheetNames } from '../types';
import DataTable from './DataTable';

declare const XLSX: any;
declare const jspdf: any;
declare const html2canvas: any;

const exportToExcel = (data: any[], fileName: string) => {
    if (typeof XLSX === 'undefined') {
        console.error("XLSX library is not loaded.");
        alert("Excel export functionality is currently unavailable.");
        return;
    }
    try {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert("An error occurred while exporting the data.");
    }
};

interface CostDetailViewProps {
  data: DriverOperatorData[];
  title: string;
  headers: string[];
  parentView: SheetNames;
  setActiveView: (view: SheetNames) => void;
}

const CostDetailView: React.FC<CostDetailViewProps> = ({ data, title, headers, parentView, setActiveView }) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const tableData = useMemo(() => {
        // The data is already filtered, just need to map it to include only the required headers
        return data.map(item => {
            const row: {[key: string]: any} = {};
            for (const header of headers) {
                row[header] = item[header as keyof DriverOperatorData];
            }
            return row;
        });
    }, [data, headers]);

    const handleExportExcel = () => {
        exportToExcel(tableData, title.replace(/\s+/g, '_'));
    };

    const handleExportPdf = async () => {
        const tableContainer = tableContainerRef.current;
        if (!tableContainer) {
            alert("Could not find the table to export.");
            return;
        }

        const tableTitle = (tableContainer.querySelector('h3') as HTMLElement)?.innerText || 'Exported Data';
        const fileName = `${tableTitle.replace(/\s+/g, '_')}.pdf`;
        
        const originalTable = tableContainer.querySelector('table');
        if (!originalTable) {
            alert("Could not find a table to export.");
            return;
        }

        const pdf = new jspdf.jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a3'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pdfWidth - margin * 2;
        const contentHeight = pdfPageHeight - margin * 2;

        const header = originalTable.querySelector('thead');
        const rows = Array.from(originalTable.querySelectorAll('tbody tr'));
        if (!header || rows.length === 0) {
            alert("No data to export.");
            return;
        }
        
        let rowsPerPage = 35;
        
        const tempMeasureContainer = document.createElement('div');
        tempMeasureContainer.style.position = 'absolute';
        tempMeasureContainer.style.left = '-9999px';
        tempMeasureContainer.style.width = `${originalTable.offsetWidth}px`;
        document.body.appendChild(tempMeasureContainer);

        if (rows.length > 0) {
            const measureTable = originalTable.cloneNode(false) as HTMLTableElement;
            tempMeasureContainer.appendChild(measureTable);
            
            const headerClone = (header as HTMLElement).cloneNode(true) as HTMLElement;
            measureTable.appendChild(headerClone);
            const headerHeightPx = headerClone.offsetHeight;
            
            const tbodyClone = document.createElement('tbody');
            const rowClone = (rows[0] as HTMLElement).cloneNode(true) as HTMLElement;
            tbodyClone.appendChild(rowClone);
            measureTable.appendChild(tbodyClone);
            const rowHeightPx = rowClone.offsetHeight;
            const tableWidthPx = originalTable.offsetWidth;
            
            if (rowHeightPx > 0 && tableWidthPx > 0) {
                const pdfRowHeight = contentWidth * (rowHeightPx / tableWidthPx);
                const titleHeightPt = 25;
                const availableTableHeight = contentHeight - titleHeightPt;

                if (pdfRowHeight > 0) {
                    let calculatedRows = Math.floor(availableTableHeight / pdfRowHeight);
                    rowsPerPage = Math.max(30, calculatedRows);
                }
            }
        }
        document.body.removeChild(tempMeasureContainer);
        
        const numPages = Math.ceil(rows.length / rowsPerPage);

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = `${originalTable.offsetWidth}px`;
        document.body.appendChild(tempContainer);

        for (let i = 0; i < numPages; i++) {
            if (i > 0) {
                pdf.addPage();
            }
            
            const printContainer = document.createElement('div');
            printContainer.style.padding = '20px';
            printContainer.style.backgroundColor = 'white';
            printContainer.style.width = `${originalTable.offsetWidth}px`;
            printContainer.style.fontFamily = 'Helvetica, sans-serif';

            const titleElement = document.createElement('h3');
            titleElement.innerText = tableTitle;
            titleElement.style.fontSize = '14px';
            titleElement.style.fontWeight = 'bold';
            titleElement.style.color = 'black';
            titleElement.style.marginBottom = '15px';
            printContainer.appendChild(titleElement);
            
            const pageTable = document.createElement('table');
            pageTable.className = originalTable.className;
            pageTable.style.width = '100%';
            pageTable.style.borderCollapse = 'collapse';

            pageTable.appendChild(header.cloneNode(true));
            const pageTbody = document.createElement('tbody');
            const pageRows = rows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
            pageRows.forEach(row => pageTbody.appendChild((row as HTMLElement).cloneNode(true)));
            pageTable.appendChild(pageTbody);

            printContainer.appendChild(pageTable);
            tempContainer.innerHTML = '';
            tempContainer.appendChild(printContainer);
            
            printContainer.querySelectorAll('*').forEach((el) => {
                const htmlEl = el as HTMLElement;
                htmlEl.style.backgroundColor = 'white';
                htmlEl.style.color = 'black';
                if (htmlEl.tagName === 'TH' || htmlEl.tagName === 'TD') {
                    htmlEl.style.border = '1px solid #dddddd';
                    htmlEl.style.padding = '6px';
                    htmlEl.style.fontSize = '8px';
                }
                 if (htmlEl.tagName === 'TH') {
                    htmlEl.style.fontWeight = 'bold';
                }
            });
            printContainer.querySelectorAll('.data-table-sort-icon').forEach((el) => (el as HTMLElement).style.display = 'none');

            const canvas = await html2canvas(printContainer, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, 0, undefined, 'FAST');
            const pageNumText = `Page ${i + 1} of ${numPages}`;
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text(pageNumText, pdfWidth - margin - pdf.getTextWidth(pageNumText), pdfPageHeight - margin + 10);
        }

        pdf.save(fileName);
        document.body.removeChild(tempContainer);
    };

    const exportButtons = (
        <div className="flex gap-2 pdf-export-hide">
          <button onClick={handleExportExcel} disabled={tableData.length === 0} className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm">Save as Excel</button>
          <button onClick={handleExportPdf} disabled={tableData.length === 0} className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg cursor-pointer transition-colors duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm">Save as PDF</button>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-secondary p-2 flex items-center justify-start gap-4">
                <button 
                    onClick={() => setActiveView(parentView)}
                    className="flex items-center justify-center bg-secondary text-white font-bold py-2 px-4 rounded-lg shadow-lg border-b-4 border-primary hover:bg-primary active:translate-y-0.5 active:border-b-2 active:shadow-md transition-all duration-150"
                    title={`Return to ${parentView}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Back</span>
                </button>
                <h1 className="text-lg font-bold text-white whitespace-nowrap">{title}</h1>
            </div>
            
            <div className="flex-grow mt-4">
                <DataTable
                    ref={tableContainerRef}
                    data={tableData}
                    title={title}
                    headers={headers}
                    actionButton={exportButtons}
                />
            </div>
        </div>
    );
};

export default CostDetailView;
