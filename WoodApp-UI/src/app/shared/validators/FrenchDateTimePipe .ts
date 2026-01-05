import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

@Pipe({
  name: 'frenchDateTime'
})
export class FrenchDateTimePipe implements PipeTransform {
  transform(value: any): string {
    if (!value) return '';
    
    const datePipe = new DatePipe('fr-FR');
    const formatted = datePipe.transform(value, 'dd MMMM yyyy:HH:mm:ss');
    
    // Convert month name to lowercase
    return formatted ? formatted.replace(/\b\w/g, (char, index) => {
      // Only lowercase the month name (after the day number)
      return index > 2 ? char.toLowerCase() : char;
    }) : '';
  }
}