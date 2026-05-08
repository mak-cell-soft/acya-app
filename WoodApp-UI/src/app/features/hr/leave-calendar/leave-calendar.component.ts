import { Component, OnInit } from '@angular/core';
import { LeaveService } from '../../../../app/services/components/leave.service';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { fr } from 'date-fns/locale';

@Component({
  selector: 'app-leave-calendar',
  templateUrl: './leave-calendar.component.html',
  styleUrl: './leave-calendar.component.scss'
})
export class LeaveCalendarComponent implements OnInit {
  viewDate: Date = new Date();
  calendarDays: any[] = [];
  leaves: any[] = [];
  loading = false;

  constructor(private leaveService: LeaveService) {}

  ngOnInit(): void {
    this.loadLeaves();
  }

  loadLeaves(): void {
    this.loading = true;
    this.leaveService.getAll().subscribe({
      next: (res) => {
        this.leaves = res;
        this.generateCalendar();
        this.loading = false;
      },
      error: () => {
        this.generateCalendar();
        this.loading = false;
      }
    });
  }

  generateCalendar(): void {
    const start = startOfWeek(startOfMonth(this.viewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(this.viewDate), { weekStartsOn: 1 });
    
    const days = eachDayOfInterval({ start, end });
    
    this.calendarDays = days.map(day => {
      const dayLeaves = this.leaves.filter(l => {
        const leaveStart = new Date(l.startdate);
        const leaveEnd = new Date(l.enddate);
        return day >= leaveStart && day <= leaveEnd && l.status === 'Approved';
      });

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, this.viewDate),
        isToday: isSameDay(day, new Date()),
        leaves: dayLeaves
      };
    });
  }

  prevMonth(): void {
    this.viewDate = subMonths(this.viewDate, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.viewDate = addMonths(this.viewDate, 1);
    this.generateCalendar();
  }

  getMonthName(): string {
    return format(this.viewDate, 'MMMM yyyy', { locale: fr });
  }

  getLeaveColor(type: string): string {
    switch (type) {
      case 'Congé Payé': return '#4f46e5'; // Indigo
      case 'Maladie': return '#ef4444'; // Red
      case 'Congé sans solde': return '#f59e0b'; // Amber
      default: return '#10b981'; // Emerald
    }
  }
}
