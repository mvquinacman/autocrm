import * as React from "react";
import { cn } from "@/lib/utils";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        // 16px font + 44px height on mobile (prevents iOS zoom, thumb-sized)
        "flex h-11 w-full rounded-md border border-input bg-card px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:h-9 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
