import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  BaseComponentProps,
  registerFlattener,
  registerSimulation,
  uniform,
} from '@adriansteffan/reactive';
import { PickingBar, AnswerCard, SubmitButton, ContinuePrompt, FeedbackContainer, CARD_REVEAL_INITIAL, CARD_REVEAL_ANIMATE, CARD_REVEAL_TRANSITION } from './shared';

registerFlattener('Feedback', 'feedback');

registerSimulation(
  'Feedback',
  (trialProps, _experimentState, simulators, participant) => {
    const isUserCorrect = trialProps.isUserCorrect ?? false;
    const result = simulators.pickConfidence(trialProps, participant);
    const pickingRT = result.value.pickingRT;
    const continueRT = uniform(200, 700);

    const data: Record<string, unknown> = {
      isUserCorrect,
      totalRT: pickingRT + continueRT,
    };
    if (trialProps.showConfidencePicker) {
      data.userConfidence = result.value.userConfidence;
      data.pickingRT = pickingRT;
    }
    return {
      responseData: data,
      participantState: result.participantState,
      duration: pickingRT + continueRT,
    };
  },
  {
    pickConfidence: (_trialProps: any, participant: any) => ({
      value: { userConfidence: Math.floor(uniform(0, 101)), pickingRT: uniform(1000, 4000) },
      participantState: participant,
    }),
  },
);

export interface FeedbackProps extends BaseComponentProps {
  isUserCorrect: boolean;
  showConfidencePicker?: boolean;
  defaultConfidence?: number;
  revealDelay?: number;
  containerClass?: string;
}

export const Feedback = ({
  next,
  isUserCorrect,
  showConfidencePicker = false,
  defaultConfidence = 50,
  revealDelay = 500,
  containerClass,
}: FeedbackProps) => {
  const [confidence, setConfidence] = useState(defaultConfidence);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const pickingStartRef = useRef(performance.now());
  const pickingRTRef = useRef(0);
  const totalStartTimeRef = useRef(performance.now());

  const handleSubmit = useCallback(() => {
    pickingRTRef.current = performance.now() - pickingStartRef.current;
    setSubmitted(true);
  }, []);

  const showingFeedback = !showConfidencePicker || submitted;

  // Reveal answer after delay once feedback phase starts
  useEffect(() => {
    if (!showingFeedback) return;
    const timer = setTimeout(() => setRevealed(true), revealDelay);
    return () => clearTimeout(timer);
  }, [showingFeedback, revealDelay]);

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
          data.userConfidence = confidence;
          data.pickingRT = pickingRTRef.current;
        }
        next(data);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, next, isUserCorrect, showConfidencePicker, confidence]);

  return (
    <FeedbackContainer containerClass={containerClass}>
      <h2 className='text-2xl font-black mb-6 text-center'>
        {!showingFeedback && 'How confident are you that your answer was correct?'}
        {showingFeedback && !revealed && 'Revealing your result...'}
        {showingFeedback && revealed && (
          <>
            Your answer was{' '}
            <span className={isUserCorrect ? 'text-green-400' : 'text-red-400'}>
              {isUserCorrect ? 'CORRECT' : 'INCORRECT'}
            </span>
          </>
        )}
      </h2>

      {!showingFeedback && (
        <>
          <PickingBar confidence={confidence} onConfidenceChange={setConfidence} />
          <SubmitButton onClick={handleSubmit} />
        </>
      )}

      {showingFeedback && (
        <motion.div
          layout
          initial={CARD_REVEAL_INITIAL}
          animate={CARD_REVEAL_ANIMATE}
          transition={CARD_REVEAL_TRANSITION}
        >
          <AnswerCard revealed={revealed} isCorrect={isUserCorrect} showLabel={false} />
        </motion.div>
      )}

      {revealed && <ContinuePrompt />}
    </FeedbackContainer>
  );
};
