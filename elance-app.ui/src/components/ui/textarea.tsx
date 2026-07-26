import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[90px] w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-2xs transition-all outline-none placeholder:text-slate-400/90 font-medium hover:border-slate-400 focus-visible:border-corp-blue-600 focus-visible:ring-4 focus-visible:ring-corp-blue-600/15 disabled:cursor-not-allowed disabled:bg-slate-100/80 disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-60 aria-invalid:border-rose-500 aria-invalid:ring-4 aria-invalid:ring-rose-500/15 resize-none md:text-sm dark:bg-slate-900/60 dark:border-slate-700 dark:hover:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-corp-blue-500 dark:focus-visible:ring-corp-blue-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
