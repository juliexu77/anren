import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const GUIDANCE_STEPS = [
  {
    title: "Where the mental load rests.",
    content:
      "This is a quiet holding place. Capture something small now, and you can decide what to do with it later.",
    icon: "✧",
  },
  {
    title: "Notice something",
    content:
      "While you're in Gmail or Calendar, notice something on your mind.",
    icon: "○",
  },
  {
    title: "Capture it",
    content:
      "Highlight a bit of it (or just open this panel) and click the Anren icon.",
    icon: "◇",
  },
  {
    title: "Hold this",
    content:
      "Press Hold this. It will land in Resting here below until you're ready to act.",
    icon: "✓",
  },
];

const STORAGE_KEY = "anren_guidance_seen";

export interface AnrenGuidanceTooltipsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnrenGuidanceTooltips({
  isOpen,
  onClose,
}: AnrenGuidanceTooltipsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setVisible(true);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < GUIDANCE_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setVisible(false);
    try {
      const chromeApi = (window as unknown as { chrome?: { storage?: { local?: { set: (o: Record<string, string>) => void } } } }).chrome;
      if (chromeApi?.storage?.local) {
        chromeApi.storage.local.set({ [STORAGE_KEY]: "true" });
      } else {
        localStorage.setItem(STORAGE_KEY, "true");
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setTimeout(onClose, 300);
  };

  const step = GUIDANCE_STEPS[currentStep];
  const isLastStep = currentStep === GUIDANCE_STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="anren-guidance-wrapper"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="anren-guidance-card"
          >
            <button
              type="button"
              onClick={handleClose}
              className="anren-guidance-close"
              aria-label="Close"
            >
              <X className="anren-guidance-close-icon" />
            </button>

            <motion.div
              key={currentStep}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="anren-guidance-icon"
            >
              {step.icon}
            </motion.div>

            <motion.h3
              key={`title-${currentStep}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="anren-guidance-title"
            >
              {step.title}
            </motion.h3>

            <motion.p
              key={`content-${currentStep}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="anren-guidance-content"
            >
              {step.content}
            </motion.p>

            <div className="anren-guidance-nav">
              <div className="anren-guidance-dots">
                {GUIDANCE_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`anren-guidance-dot ${
                      i === currentStep ? "anren-guidance-dot-active" : ""
                    }`}
                  />
                ))}
              </div>

              <div className="anren-guidance-buttons">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="anren-guidance-prev"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="anren-guidance-chevron" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="anren-guidance-next"
                >
                  <span className="anren-guidance-next-text">
                    {isLastStep ? "Got it" : "Next"}
                  </span>
                  {!isLastStep && (
                    <ChevronRight className="anren-guidance-chevron" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function hasAnrenGuidanceBeenSeen(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const chromeApi = (window as unknown as { chrome?: { storage?: { local?: { get: (key: string, cb: (items: Record<string, string>) => void) => void } } } }).chrome;
      if (chromeApi?.storage?.local) {
        chromeApi.storage.local.get(STORAGE_KEY, (items: Record<string, string>) => {
          resolve(items[STORAGE_KEY] === "true");
        });
      } else {
        resolve(localStorage.getItem(STORAGE_KEY) === "true");
      }
    } catch {
      resolve(localStorage.getItem(STORAGE_KEY) === "true");
    }
  });
}
