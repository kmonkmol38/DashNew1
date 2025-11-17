

export interface DashboardData {
  [key: string]: any;
}

export interface FleetManagementData {
  // FIX: Changed Month from string to any to accommodate Date objects from Excel parsing.
  Month: any;
  'Business Units': string;
  'Short Name'?: string;
  'Fleets Qty': number;
  'Splited Amount': number;
}

export interface DriverOperatorData {
  'CTC NO.'?: string;
  'SAP NO.'?: number;
  'EMPLOYEE NAME'?: string;
  'DESIGNATION'?: string;
  'BUSINESS UNITS'?: string;
  Month?: string;
  Year?: number | string;
  Monthly?: number;
  Hourly?: number;
  'N-Price'?: number;
  'N-Hours'?: number;
  'N-Amount'?: number;
  'N-OTPrice'?: number;
  'N-OTHours'?: number;
  'N-OTAmount'?: number;
  'H-OTPrice'?: number;
  'H-OTHours'?: number;
  'H-OTAmount'?: number;
  'Net Amount'?: number;
  'Basic Salary'?: number;
  'Other Allowance'?: number;
  'N-Price2'?: number;
  'N-Hours2'?: number;
  'N-Amount2'?: number;
  'N-OTPrice2'?: number;
  'N-OTHours2'?: number;
  'N-OTAmount2'?: number;
  'H-OTPrice2'?: number;
  'H-OTHours2'?: number;
  'H-OTAmount2'?: number;
  'Net Amount2'?: number;
  Leave?: number;
  TKT?: number;
  ESB?: number;
  Accom?: number;
  FOOD?: number;
  Uniform?: number;
  'RP+HC'?: number;
  'MED INS'?: number;
  'SAL TRF'?: number;
  'WC INS'?: number;
  HO?: number;
  Total?: number;
  Revenue?: number;
  Expense?: number;
  Profit?: number;
}


export interface JobCardData {
  Month: string;
  Year: number | string;
  Service?: string;
  'JobCard No': string;
  'Business Units': string;
  'Plate #'?: string;
  'Total Amount w%'?: number;
  Expense?: number;
  Profit: number;
  'I & C'?: string;
  Cluster?: string;
  // Extra fields from observation of JobCardView.tsx usage and to allow for inconsistencies
  DATE?: any;
  'Reg / Fleet No:'?: string;
  'Total amount with Service Charge'?: number;
}

export interface InternalFleetData {
  'Reg No:': string;
  'Fleet No:'?: string;
  'Vehicle Description'?: string;
  'YOM'?: number;
  'Supplier Name'?: string;
  'Business Units'?: string;
  'Fleet_Category'?: string;
  'W Days'?: number;
  // FIX: Changed Month from string to any as it can be a Date object.
  'Month'?: any; // Month can be a Date object or a month string, e.g., "JAN"
  'Year'?: number | string; // Year, e.g., 2024
  'Rental/Prc'?: number;
  'Rent Or %'?: number;
  'Tot Rent'?: number;
  'F-Revenue'?: number;
  'Act Fuel (F-Cost)'?: number;
  'Fuel WPrC (F-Profit)'?: number;
  'R-Revenue'?: number;
  'Vehicle Cost'?: number;
  'M-Cost'?: number;
  'R-Total Cost'?: number;
  'R-Profit'?: number;
  // Fields to hold data from External Fleets sheet when Fleet_Category is 'External Fleets'
  'Back Charged'?: number;
  'Paid Amount'?: number;
  Cluster?: string;
  // Field to hold aggregated Job Card Total Amount
  jobCardAmount?: number;
}


export interface ExternalFleetData {
  'Reg No:': string;
  'Vehicle Description': string;
  REVENUE: number;
  COST: number;
  PROFIT: number;
  Month: string;
  Year: number;
  'Supplier Name'?: string;
  'Business Units'?: string;
  Cluster?: string;
  'Date:'?: any;
  'Invoice Number:'?: string | number;
  'Type of Service'?: string;
  'Transmittal'?: string;
}

export interface ExcelData {
  Dashboard: DashboardData[];
  'Fleet Management': FleetManagementData[];
  'Driver & Operator': DriverOperatorData[];
  'Job Card': JobCardData[];
  'Internal Fleets': InternalFleetData[];
  'External Fleets': ExternalFleetData[];
}

export enum SheetNames {
    Dashboard = 'Dashboard',
    FleetManagement = 'Fleet Management',
    DriverOperator = 'Driver & Operator',
    JobCard = 'Job Card',
    InternalFleets = 'Internal Fleets',
    ExternalFleets = 'External Fleets',
    Summary = 'Summary',
    SalaryCostDetail = 'Salary Cost Detail',
    CtcCostDetail = 'CTC Cost Detail'
}