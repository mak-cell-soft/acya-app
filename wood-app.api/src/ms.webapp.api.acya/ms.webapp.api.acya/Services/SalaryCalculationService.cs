using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;

namespace ms.webapp.api.acya.Services
{
    public interface ISalaryCalculationService
    {
        EmployeePayslipDto CalculatePayslip(Person employee, int month, int year, decimal bonuses, decimal additionalDeductions);
    }

    public class SalaryCalculationService : ISalaryCalculationService
    {
        public EmployeePayslipDto CalculatePayslip(Person employee, int month, int year, decimal bonuses, decimal additionalDeductions)
        {
            decimal baseSalary = employee.BaseSalary;
            decimal overtimeHours = employee.OvertimeHours;

            // 1. Calculate Brut
            // Standard hourly rate calculation: BaseSalary / 173.33 (approx 40h/week)
            decimal hourlyRate = baseSalary / 173.33m;
            decimal overtimePay = overtimeHours * hourlyRate * 1.75m; // 75% increase for OT in Tunisia (simplified)
            
            decimal brutSalary = baseSalary + overtimePay + bonuses;

            // 2. CNSS (9.18%)
            decimal cnss = Math.Round(brutSalary * 0.0918m, 3);

            // 3. SI = Salaire Imposable
            decimal SI_mensuel = brutSalary - cnss;
            decimal SI_annuel = SI_mensuel * 12;
            
            // Professional deductions (10%, max 2000 TND)
            decimal profDeduction = Math.Min(SI_annuel * 0.1m, 2000);
            SI_annuel -= profDeduction;

            // IRPP Brackets 2024 (Annual)
            decimal irppAnnuel = 0;
            if (SI_annuel > 50000)
            {
                irppAnnuel += (SI_annuel - 50000) * 0.35m;
                SI_annuel = 50000;
            }
            if (SI_annuel > 30000)
            {
                irppAnnuel += (SI_annuel - 30000) * 0.32m;
                SI_annuel = 30000;
            }
            if (SI_annuel > 20000)
            {
                irppAnnuel += (SI_annuel - 20000) * 0.28m;
                SI_annuel = 20000;
            }
            if (SI_annuel > 5000)
            {
                irppAnnuel += (SI_annuel - 5000) * 0.26m;
            }
            
            decimal irppMensuel = Math.Round(irppAnnuel / 12, 3);
            
            // 4. CSS (1%)
            decimal cssMensuel = Math.Round(SI_mensuel * 0.01m, 3);

            decimal totalDeductions = cnss + irppMensuel + cssMensuel + additionalDeductions;
            decimal netSalary = brutSalary - totalDeductions;

            return new EmployeePayslipDto
            {
                employeeid = employee.Id,
                periodmonth = month,
                periodyear = year,
                basesalary = baseSalary,
                brutsalary = brutSalary,
                cnssamount = cnss,
                irppamount = irppMensuel,
                cssamount = cssMensuel,
                bonuses = bonuses,
                deductions = totalDeductions,
                netsalary = netSalary,
                generatedat = DateTime.UtcNow
            };
        }
    }
}
