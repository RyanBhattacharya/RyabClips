import { motion } from 'framer-motion';
import { Sparkles, Scissors, Type, Layout, Film } from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  label: string;
  description: string;
}

const steps: Step[] = [
  { icon: <Sparkles size={20} />, label: 'Extracting Highlights', description: 'Identifying the best moments' },
  { icon: <Scissors size={20} />, label: 'Detecting Hooks', description: 'Finding viral-worthy openings' },
  { icon: <Film size={20} />, label: 'Generating Clips', description: 'Creating short-form content' },
  { icon: <Type size={20} />, label: 'Applying Captions', description: 'Auto-generating subtitles' },
  { icon: <Layout size={20} />, label: 'Rendering Layouts', description: 'Optimizing for each platform' },
];

interface ProcessingStepsProps {
  currentStep: number;
  progress: number;
}

export default function ProcessingSteps({ currentStep, progress }: ProcessingStepsProps) {
  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        const isPending = index > currentStep;

        return (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15 }}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
              isActive
                ? 'border-yellow bg-yellow/5'
                : isDone
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-gray-800 bg-gray-900/30'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-yellow text-black'
                  : isDone
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {isDone ? (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                step.icon
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${isActive ? 'text-yellow' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                {step.label}
              </div>
              <div className={`text-xs mt-0.5 ${isActive ? 'text-gray-300' : isDone ? 'text-gray-500' : 'text-gray-600'}`}>
                {step.description}
              </div>
            </div>
            {isActive && (
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
