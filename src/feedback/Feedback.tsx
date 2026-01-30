import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BaseComponentProps } from '@adriansteffan/reactive';
import { PickingBar, AnswerCard, SubmitButton, ContinuePrompt, FeedbackContainer } from './shared';

export interface FeedbackProps extends BaseComponentProps {
  isUserCorrect: boolean;
  showConfidencePicker?: boolean;
  defaultConfidence?: number;
  decreaseKey?: string;
  increaseKey?: string;
  revealDelay?: number;
}

type Phase = 'picking' | 'feedback';

export const Feedback = ({
  next,
  isUserCorrect,
  showConfidencePicker = false,
  defaultConfidence = 50,
  decreaseKey = 'ArrowLeft',
  increaseKey = 'ArrowRight',
  revealDelay = 500,
}: FeedbackProps) => {
  const [phase, setPhase] = useState<Phase>(showConfidencePicker ? 'picking' : 'feedback');
  const [userConfidence, setUserConfidence] = useState(defaultConfidence);
  const [revealed, setRevealed] = useState(false);

  const pickingStartTimeRef = useRef(performance.now());
  const pickingRTRef = useRef(0);
  const totalStartTimeRef = useRef(performance.now());

  // Keyboard controls for picking
  useEffect(() => {
    if (phase !== 'picking') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === decreaseKey) setUserConfidence((v) => Math.max(0, v - 1));
      else if (e.key === increaseKey) setUserConfidence((v) => Math.min(100, v + 1));
      else if (e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, decreaseKey, increaseKey]);

  const handleSubmit = () => {
    pickingRTRef.current = performance.now() - pickingStartTimeRef.current;
    setPhase('feedback');
  };

  // Reveal answer after delay in feedback phase
  useEffect(() => {
    if (phase !== 'feedback') return;
    const timer = setTimeout(() => setRevealed(true), revealDelay);
    return () => clearTimeout(timer);
  }, [phase, revealDelay]);

  // Keypress to continue (only after revealed)
  useEffect(() => {
    if (!revealed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const data: Record<string, unknown> = {
          isUserCorrect,
          totalRT: performance.now() - totalStartTimeRef.current,
        };
        if (showConfidencePicker) {
          data.userConfidence = userConfidence;
          data.pickingRT = pickingRTRef.current;
        }
        next(data);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, next, isUserCorrect, showConfidencePicker, userConfidence]);

  const isPicking = phase === 'picking';
  const isFeedback = phase === 'feedback';

  return (
    <FeedbackContainer>
      <h2 className='text-2xl font-black mb-6 text-center'>
        {isPicking && 'How confident are you that your answer was correct?'}
        {isFeedback && !revealed && 'Revealing your result...'}
        {isFeedback &&
          revealed &&
          (isUserCorrect ? (
            <span className='text-green-400'>CORRECT!</span>
          ) : (
            <span className='text-red-400'>INCORRECT</span>
          ))}
      </h2>

      {isPicking && (
        <>
          <PickingBar confidence={userConfidence} onConfidenceChange={setUserConfidence} />
          <SubmitButton onClick={handleSubmit} />
        </>
      )}

      {isFeedback && (
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnswerCard revealed={revealed} isCorrect={isUserCorrect} showLabel={false} />
        </motion.div>
      )}

      {revealed && <ContinuePrompt />}
    </FeedbackContainer>
  );
};
