import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600 text-white',
        secondary: 'border-transparent bg-slate-600 text-slate-100',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'border-slate-600 text-slate-300',
        success: 'border-transparent bg-green-700 text-white',
        warning: 'border-transparent bg-amber-600 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>
>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
