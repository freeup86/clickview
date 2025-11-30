import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className,
  variant = 'spinner'
}) => {
  const sizeClasses = {
    small: { spinner: 'w-4 h-4', dots: 'gap-1', pulse: 'w-8 h-8' },
    medium: { spinner: 'w-8 h-8', dots: 'gap-1.5', pulse: 'w-12 h-12' },
    large: { spinner: 'w-12 h-12', dots: 'gap-2', pulse: 'w-16 h-16' },
  };

  const dotSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-2.5 h-2.5',
  };

  if (variant === 'dots') {
    return (
      <div className={clsx('flex items-center justify-center', sizeClasses[size].dots, className)}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={clsx(
              'rounded-full bg-primary-500',
              dotSizes[size],
              'animate-bounce'
            )}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={clsx('flex items-center justify-center', className)}>
        <div className={clsx('relative', sizeClasses[size].pulse)}>
          <div className="absolute inset-0 rounded-full bg-primary-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary-500/50 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary-500" />
        </div>
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx('relative', sizeClasses[size].spinner)}>
        <div className={clsx(
          'absolute inset-0 rounded-full border-2 border-gray-200',
          sizeClasses[size].spinner
        )} />
        <div className={clsx(
          'absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 animate-spin',
          sizeClasses[size].spinner
        )} />
      </div>
    </div>
  );
};

export default LoadingSpinner;
