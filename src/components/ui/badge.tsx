import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-transparent bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800",
        className
      )}
      {...props}
    />
  );
}
