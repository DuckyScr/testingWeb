import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, HelpCircle } from "lucide-react";

type StatusIndicatorProps = {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  className?: string;
};

export function StatusIndicator({
  value,
  trueLabel = "Ano",
  falseLabel = "Ne",
  className,
}: StatusIndicatorProps) {
  if (value === null || value === undefined) {
    return (
      <div className={cn("flex items-center text-muted-foreground", className)}>
        <HelpCircle className="mr-1 h-4 w-4" />
        <span>Neuvedeno</span>
      </div>
    );
  }

  return value ? (
    <div className={cn("flex items-center text-green-600 dark:text-green-500", className)}>
      <CheckCircle className="mr-1 h-4 w-4" />
      <span>{trueLabel}</span>
    </div>
  ) : (
    <div className={cn("flex items-center text-red-600 dark:text-red-500", className)}>
      <XCircle className="mr-1 h-4 w-4" />
      <span>{falseLabel}</span>
    </div>
  );
}

export function StatusIndicatorIcon({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) {
    return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
  
  return value ? (
    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
  );
}