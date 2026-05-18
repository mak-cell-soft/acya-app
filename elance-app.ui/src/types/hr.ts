export interface Leave {
  id: number;
  employeeid: number;
  leavetype: string;
  startdate: string;
  enddate: string;
  durationdays: number;
  status: string;
  createdat?: string;
  updatedat?: string;
  employeename?: string;
}

export interface Payslip {
  id: number;
  employeeid: number;
  periodmonth: number;
  periodyear: number;
  basesalary: number;
  brutsalary: number;
  cnssamount: number;
  irppamount: number;
  cssamount: number;
  bonuses: number;
  deductions: number;
  netsalary: number;
  generatedat?: string;
}

export interface Advance {
  id: number;
  employeeid: number;
  amount: number;
  requestdate: string;
  repaymentschedule?: string;
  amountrepaid: number;
  status: string;
  createdat?: string;
  updatedat?: string;
}
