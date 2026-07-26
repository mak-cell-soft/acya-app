import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 shadow-2xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-slate-400/90 hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100/80 disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:ring-4 aria-invalid:ring-rose-500/15 md:text-sm dark:bg-slate-900/60 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-corp-blue-500 dark:focus-visible:ring-corp-blue-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

