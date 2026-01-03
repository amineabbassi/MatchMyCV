"use client";

interface StepsProps {
  currentStep: number;
  steps: string[];
}

export function Steps({ currentStep, steps }: StepsProps) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step} className="flex items-center">
            <div className="flex items-center gap-1.5">
              {/* Step dot/check */}
              <div
                className={`
                  w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold
                  transition-all duration-300
                  ${isCompleted 
                    ? "bg-[#0a0a0a] text-white" 
                    : isCurrent 
                      ? "bg-[#0a0a0a] text-white shadow-sm" 
                      : "bg-[#f5f5f5] text-[#a3a3a3]"
                  }
                `}
              >
                {isCompleted ? (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              
              {/* Label - desktop only */}
              <span
                className={`
                  text-[12px] font-medium hidden lg:block transition-colors duration-300
                  ${isCompleted || isCurrent ? "text-[#0a0a0a]" : "text-[#a3a3a3]"}
                `}
              >
                {step}
              </span>
            </div>

            {/* Connector */}
            {index < steps.length - 1 && (
              <div 
                className={`
                  w-4 lg:w-6 h-px mx-1.5 transition-colors duration-300
                  ${index < currentStep ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"}
                `} 
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
