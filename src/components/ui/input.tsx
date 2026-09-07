import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 shadow-sm shadow-slate-900/[0.04] transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 hover:shadow-md hover:shadow-slate-900/[0.06] focus-visible:border-indigo-500 focus-visible:ring-[3px] focus-visible:ring-indigo-500/10 focus-visible:shadow-md focus-visible:shadow-indigo-500/[0.08] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:opacity-60 disabled:shadow-none aria-invalid:border-red-400 aria-invalid:ring-[3px] aria-invalid:ring-red-500/10 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-900/80 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-400/15 dark:disabled:bg-slate-800/50 dark:disabled:text-slate-500 dark:aria-invalid:border-red-500/60 dark:aria-invalid:ring-red-500/20 [&[type=number]]:font-semibold [&[type=number]]:tabular-nums [&[type=number]]:tracking-tight",
        className
      )}
      {...props}
    />
  )
}

export { Input }
