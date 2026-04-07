// Becker-DeGroot-Marschak implementation with a hopefully tracable animation

import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutGroup } from 'motion/react';
import { BaseComponentProps, registerFlattener, registerSimulation, uniform, useTheme, t, DARK_BG_CLASS } from '@adriansteffan/reactive';
import {
  PickingBar,
  SubmitButton,
  ContinuePrompt,
  useBDMPhases,
  BDMAnimationStage,
} from './shared';

registerFlattener('BDMReward', 'feedback');

registerSimulation('BDMReward', (trialProps, _experimentState, simulators, participant) => {
  const isUserCorrect = trialProps.isUserCorrect ?? false;
  const result = simulators.pickConfidence(trialProps, participant);
  const userConfidence = result.value.userConfidence;
  const pickingRT = result.value.pickingRT;

  const lotteryValue = Math.floor(uniform(0, 101));
  const source = userConfidence > lotteryValue ? 'task' : 'lottery';
  const wonReward = source === 'task' ? isUserCorrect : uniform(0, 1) < lotteryValue / 100;
  const animationDuration = trialProps.animationDuration ?? 2500;

  return {
    responseData: {
      userConfidence,
      isUserCorrect,
      lotteryValue,
      source,
      wonReward,
      pickingRT,
      totalRT: pickingRT + animationDuration + 500,
    },
    participantState: result.participantState,
    duration: pickingRT + animationDuration + 500,
  };
}, {
  pickConfidence: (_trialProps: any, participant: any) => ({
    value: { userConfidence: Math.floor(uniform(0, 101)), pickingRT: uniform(1000, 4000) },
    participantState: participant,
  }),
});

export interface BDMRewardProps extends BaseComponentProps {
  isUserCorrect: boolean;
  animationDuration?: number;
  chipGridSize?: number;
  defaultConfidence?: number;
  liveLotteryFill?: boolean;
  fastMode?: boolean;
}

export const BDMReward = ({
  next,
  isUserCorrect,
  animationDuration = 2500,
  chipGridSize = 10,
  defaultConfidence = 50,
  liveLotteryFill = true,
  fastMode = false,
}: BDMRewardProps) => {
  const [confidence, setConfidence] = useState(defaultConfidence);
  const [submitted, setSubmitted] = useState(false);
  const pickingStartRef = useRef(performance.now());
  const pickingRTRef = useRef(0);
  const totalStartTimeRef = useRef(performance.now());
  const greenChipPercent = useRef(Math.floor(Math.random() * 101)).current;

  const handleSubmit = useCallback(() => {
    pickingRTRef.current = performance.now() - pickingStartRef.current;
    setSubmitted(true);
  }, []);

  const bdmState = useBDMPhases({
    userConfidence: confidence,
    lotteryValue: greenChipPercent,
    isUserCorrect,
    animationDuration,
    started: submitted,
    fastMode,
  });

  // Keypress to continue in feedback phase
  useEffect(() => {
    if (!bdmState.isFeedback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        next({
          userConfidence: confidence,
          isUserCorrect,
          lotteryValue: greenChipPercent,
          source: bdmState.source,
          wonReward: bdmState.wonReward,
          pickingRT: pickingRTRef.current,
          totalRT: performance.now() - totalStartTimeRef.current,
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bdmState.isFeedback, next, confidence, isUserCorrect, greenChipPercent, bdmState.source, bdmState.wonReward]);

  const theme = useTheme();

  return (
    <div
      className={`${DARK_BG_CLASS} min-h-screen flex items-center justify-center p-8 select-none ${t(theme).text}`}
    >
      <LayoutGroup>
        <div className='flex flex-col items-center w-full max-w-2xl'>
          <h2 className='text-2xl font-black mb-8 text-center'>
            {!submitted && 'How confident are you that your answer was correct?'}
            {submitted && bdmState.isComparing && 'DETERMINING REWARD SOURCE...'}
            {bdmState.isDecision && bdmState.source === 'task' && 'TAKING YOUR ANSWER!'}
            {((bdmState.isDecision && bdmState.source === 'lottery') || bdmState.isResolving) && 'PLAYING THE LOTTERY...'}
            {bdmState.isFeedback &&
              bdmState.wonReward !== null &&
              (bdmState.wonReward ? (
                <span className='text-green-400'>ADDITIONAL REWARDS EARNED!</span>
              ) : (
                <span className='text-red-400'>NO EXTRA REWARD</span>
              ))}
          </h2>

          {!submitted && (
            <>
              <PickingBar confidence={confidence} onConfidenceChange={setConfidence} />
              <SubmitButton onClick={handleSubmit} />
            </>
          )}

          {submitted && <BDMAnimationStage
            phaseState={bdmState}
            userConfidence={confidence}
            lotteryValue={greenChipPercent}
            isUserCorrect={isUserCorrect}
            animationDuration={animationDuration}
            chipGridSize={chipGridSize}
            liveLotteryFill={liveLotteryFill}
            fastMode={fastMode}
            lotteryActivatingDuringComparing
          />}

          {bdmState.isFeedback && (
            <p className='text-xl font-bold mt-12 text-gray-400'>
              Your answer {bdmState.source === 'lottery' ? 'would have been' : 'was'}{' '}
              <span className={isUserCorrect ? 'text-green-400' : 'text-red-400'}>
                {isUserCorrect ? 'correct' : 'incorrect'}
              </span>
              .
            </p>
          )}

          {bdmState.isFeedback && <ContinuePrompt className={bdmState.source === 'task' ? 'mt-12' : 'mt-8'} />}
        </div>
      </LayoutGroup>
    </div>
  );
};
