"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4.5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white transition-all outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-rose-500 aria-invalid:ring-4 aria-invalid:ring-rose-500/15 data-checked:border-corp-blue-600 data-checked:bg-corp-blue-600 data-checked:text-white dark:bg-slate-900/60 dark:border-slate-700 dark:hover:border-slate-600 dark:data-checked:bg-corp-blue-600 dark:data-checked:border-corp-blue-600",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

