"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ date, setDate, placeholder = "Sélectionner une date", className }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full h-11 justify-start text-left font-bold rounded-xl border-corp-blue-100",
            !date && "text-sand-400",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-corp-blue-600" />
          {date ? format(date, "PPP", { locale: fr }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-2xl border-corp-blue-100 shadow-2xl" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          autoFocus
          locale={fr}
        />
      </PopoverContent>
    </Popover>
  )
}

