import { cn } from "../../../../lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "card";
  animation?: "pulse" | "wave" | "none";
}

function Skeleton({
  className,
  variant = "default",
  animation = "pulse",
  ...props
}: SkeletonProps) {
  const baseClasses = "bg-muted";

  const variantClasses = {
    default: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4",
    card: "rounded-lg",
  };

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
    none: "",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], animationClasses[animation], className)}
      {...props}
    />
  );
}

// Predefined skeleton components for common use cases
const SkeletonCard = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-3", className)} {...props}>
    <Skeleton variant="card" className="h-[200px] w-full" />
    <div className="space-y-2">
      <Skeleton variant="text" className="h-4 w-[250px]" />
      <Skeleton variant="text" className="h-4 w-[200px]" />
    </div>
  </div>
);

const SkeletonTable = ({
  rows = 5,
  cols = 4,
  className,
  ...props
}: {
  rows?: number;
  cols?: number;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-3", className)} {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} variant="text" className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="text" className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonAvatar = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton variant="circular" className={cn("h-10 w-10", className)} {...props} />
);

const SkeletonButton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <Skeleton className={cn("h-10 w-20 rounded-md", className)} {...props} />
);

const SkeletonText = ({
  lines = 3,
  className,
  ...props
}: {
  lines?: number;
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-2", className)} {...props}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={cn("h-4", i === lines - 1 ? "w-[70%]" : "w-full")}
      />
    ))}
  </div>
);

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonAvatar, SkeletonButton, SkeletonText };
