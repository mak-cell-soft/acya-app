"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "group toast font-medium border shadow-2xl backdrop-blur-xl rounded-xl transition-all duration-300",
          description: "text-sm opacity-90",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          success: "!bg-emerald-500/30 !border-emerald-500/30 text-emerald-950 dark:text-emerald-50 [&>svg]:text-emerald-700 dark:[&>svg]:text-emerald-300",
          error: "!bg-red-500/30 !border-red-500/30 text-red-950 dark:text-red-50 [&>svg]:text-red-700 dark:[&>svg]:text-red-300",
          warning: "!bg-amber-500/30 !border-amber-500/30 text-amber-950 dark:text-amber-50 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300",
          info: "!bg-blue-500/30 !border-blue-500/30 text-blue-950 dark:text-blue-50 [&>svg]:text-blue-700 dark:[&>svg]:text-blue-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

