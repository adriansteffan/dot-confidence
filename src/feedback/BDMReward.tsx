// Becker-DeGroot-Marschak implementation with a hopefully tracable animation

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, LayoutGroup, useMotionValue, useTransform, animate } from 'motion/react';
import { BaseComponentProps, shuffle } from '@adriansteffan/reactive';
import {
  BORDER,
  SHADOW,
  TickMarks,
  PickingBar,
  AnswerCard,
  SubmitButton,
  ContinuePrompt,
} from './shared';

export interface BDMRewardProps extends BaseComponentProps {
  isUserCorrect: boolean;
  animationDuration?: number;
  chipGridSize?: number;
  defaultConfidence?: number;
  decreaseKey?: string;
  increaseKey?: string;
  liveLotteryFill?: boolean;
}

type Phase = 'picking' | 'comparing' | 'decision' | 'resolving' | 'feedback';

interface ChipPosition {
  row: number;
  col: number;
}

// BDM-specific timing constants (in ms)
const SETTLE_DELAY = 600;
const FADE_DURATION = 600;
const POSITION_DELAY = 1800;

type GridState = 'idle' | 'activating' | 'scanning' | 'complete';

const LotteryGrid = ({
  displayPercent,
  gridSize,
  state,
  showLabel = false,
  grayedOut = false,
  onResolved,
}: {
  displayPercent: number;
  gridSize: number;
  state: GridState;
  showLabel?: boolean;
  grayedOut?: boolean;
  onResolved: (won: boolean) => void;
}) => {
  const [scanPosition, setScanPosition] = useState<ChipPosition | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipPosition | null>(null);

  const { chipOrder, finalChip } = useMemo(() => {
    const totalChips = gridSize * gridSize;
    const indices = Array.from({ length: totalChips }, (_, i) => i);
    return {
      chipOrder: shuffle(indices),
      finalChip: {
        row: Math.floor(Math.random() * gridSize),
        col: Math.floor(Math.random() * gridSize),
      },
    };
  }, [gridSize]);

  useEffect(() => {
    if (state !== 'scanning') return;

    const scanSequence: ChipPosition[] = [];
    for (let i = 0; i < 20; i++) {
      scanSequence.push({
        row: Math.floor(Math.random() * gridSize),
        col: Math.floor(Math.random() * gridSize),
      });
    }
    scanSequence.push(finalChip);

    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;

    const runScan = () => {
      if (idx >= scanSequence.length) {
        setSelectedChip(finalChip);
        setScanPosition(null);
        const totalChips = gridSize * gridSize;
        const greenCount = Math.round((displayPercent / 100) * totalChips);
        const isWin = chipOrder.indexOf(finalChip.row * gridSize + finalChip.col) < greenCount;
        onResolved(isWin);
        return;
      }
      setScanPosition(scanSequence[idx]);
      idx++;
      const delay = 80 + (idx / scanSequence.length) ** 2 * 200;
      timer = setTimeout(runScan, delay);
    };

    timer = setTimeout(runScan, SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [state, gridSize, chipOrder, finalChip, onResolved, displayPercent]);

  const totalChips = gridSize * gridSize;
  const greenCount = Math.round((displayPercent / 100) * totalChips);
  const greenSet = new Set(chipOrder.slice(0, greenCount));

  return (
    <div className='flex flex-col items-center'>
      {showLabel && <p className='text-lg font-bold text-gray-400 mb-3'>LOTTERY</p>}
      <div className={`p-4 ${BORDER}`} style={{ boxShadow: SHADOW, background: '#374151' }}>
        <div className='flex flex-col gap-1'>
          {Array.from({ length: gridSize }, (_, r) => (
            <div key={r} className='flex gap-1'>
              {Array.from({ length: gridSize }, (_, c) => {
                const idx = r * gridSize + c;
                const isGreen = greenSet.has(idx);
                const scanning = scanPosition?.row === r && scanPosition?.col === c;
                const selected = selectedChip?.row === r && selectedChip?.col === c;
                return (
                  <motion.div
                    key={c}
                    className={`w-5 h-5 border-2 border-black ${grayedOut ? 'bg-gray-500' : isGreen ? 'bg-green-400' : 'bg-red-400'} ${scanning ? 'ring-2 ring-white' : ''} ${selected ? 'ring-4 ring-white' : ''}`}
                    animate={{ scale: selected ? 1.5 : scanning ? 1.25 : 1 }}
                    transition={{ duration: 0.15 }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function ComparingBar({
  userConfidence,
  lotteryValue,
  animationDuration,
  winningSource,
  isFadingOut,
  onPositionChange,
}: {
  userConfidence: number;
  lotteryValue: number;
  animationDuration: number;
  winningSource: 'task' | 'lottery' | null;
  isFadingOut: boolean;
  onPositionChange?: (position: number) => void;
}) {
  const totalDistance = 200 + lotteryValue; // 2 full sweeps + landing
  const distance = useMotionValue(0);
  const left = useTransform(distance, (v) => `${v % 100}%`);

  useEffect(() => {
    const controls = animate(distance, totalDistance, {
      duration: animationDuration / 1000,
      ease: [0.35, 0.25, 0.05, 1],
      delay: SETTLE_DELAY / 1000,
    });
    return () => controls.stop();
  }, []);

  useEffect(() => {
    return distance.on('change', (v) => {
      onPositionChange?.(v % 100);
    });
  }, [distance, onPositionChange]);

  return (
    <motion.div
      className='w-full'
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className='w-full relative h-12 mb-2'>
        <div
          className='absolute text-2xl font-black text-yellow-400'
          style={{
            left: `${userConfidence}%`,
            transform:
              userConfidence <= 5
                ? 'translateX(0)'
                : userConfidence >= 95
                  ? 'translateX(-100%)'
                  : 'translateX(-50%)',
          }}
        >
          {userConfidence}%
        </div>
      </div>

      <motion.div
        layout={!isFadingOut}
        layoutId='confidence-bar'
        className={`relative w-full h-16 bg-gray-600 overflow-hidden ${BORDER}`}
        style={{ boxShadow: SHADOW }}
      >
        <div
          className='absolute top-0 h-full z-10'
          style={{
            left: `${userConfidence}%`,
            transform: 'translateX(-50%)',
            width: 6,
            backgroundColor: '#facc15',
            boxShadow: '0 0 8px rgba(250,204,21,0.6)',
          }}
        />

        <motion.div
          className='absolute top-0 h-full w-1.5 bg-blue-400 z-20'
          style={{
            left,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 8px rgba(96,165,250,0.6)',
          }}
        />

        {winningSource && (
          <motion.div
            className='absolute top-0 h-full bg-blue-400'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              left: winningSource === 'task' ? 0 : `${userConfidence}%`,
              width: winningSource === 'task' ? `${userConfidence}%` : `${100 - userConfidence}%`,
            }}
          />
        )}
      </motion.div>

      <TickMarks />
    </motion.div>
  );
}

export const BDMReward = ({
  next,
  isUserCorrect,
  animationDuration = 2500,
  chipGridSize = 10,
  defaultConfidence = 50,
  decreaseKey = 'ArrowLeft',
  increaseKey = 'ArrowRight',
  liveLotteryFill = true,
}: BDMRewardProps) => {
  const [phase, setPhase] = useState<Phase>('picking');
  const [userConfidence, setUserConfidence] = useState(defaultConfidence);
  const [source, setSource] = useState<'task' | 'lottery' | null>(null);
  const [wonReward, setWonReward] = useState<boolean | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [indicatorPosition, setIndicatorPosition] = useState(0);

  const pickingStartTimeRef = useRef(performance.now());
  const pickingRTRef = useRef(0);
  const totalStartTimeRef = useRef(performance.now());

  const greenChipPercent = useRef(Math.floor(Math.random() * 101)).current;

  const handleLotteryResolved = useCallback((won: boolean) => {
    setWonReward(won);
    setPhase('feedback');
  }, []);

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
    setPhase('comparing');
  };

  useEffect(() => {
    if (phase !== 'comparing') return;
    // Light up winning half as soon as animation lands, then wait before transitioning
    const highlightTimer = setTimeout(() => {
      const taskWins = userConfidence > greenChipPercent;
      setSource(taskWins ? 'task' : 'lottery');
    }, SETTLE_DELAY + animationDuration);
    const endTimer = setTimeout(
      () => setPhase('decision'),
      SETTLE_DELAY + animationDuration + 1000,
    );
    return () => {
      clearTimeout(highlightTimer);
      clearTimeout(endTimer);
    };
  }, [phase, animationDuration, userConfidence, greenChipPercent]);

  useEffect(() => {
    if (phase !== 'decision') return;

    const revealTimer = setTimeout(() => setWinnerRevealed(true), FADE_DURATION);

    if (source === 'task') {
      const revealResultTimer = setTimeout(() => {
        setCardRevealed(true);
        setWonReward(isUserCorrect);
        setPhase('feedback');
      }, POSITION_DELAY);

      return () => {
        clearTimeout(revealTimer);
        clearTimeout(revealResultTimer);
      };
    } else {
      const resolveTimer = setTimeout(() => setPhase('resolving'), POSITION_DELAY);

      return () => {
        clearTimeout(revealTimer);
        clearTimeout(resolveTimer);
      };
    }
  }, [phase, source, isUserCorrect]);

  useEffect(() => {
    if (phase !== 'feedback') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        next({
          userConfidence,
          isUserCorrect,
          lotteryValue: greenChipPercent,
          source,
          wonReward,
          pickingRT: pickingRTRef.current,
          totalRT: performance.now() - totalStartTimeRef.current,
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, next, userConfidence, isUserCorrect, greenChipPercent, source, wonReward]);

  const isPicking = phase === 'picking';
  const isComparing = phase === 'comparing';
  const isDecision = phase === 'decision';
  const isResolving = phase === 'resolving';
  const isFeedback = phase === 'feedback';

  const barFadingOut = isDecision && source !== null;
  const showSideBySide = isComparing || (isDecision && !winnerRevealed);
  const showWinnerCentered = (isDecision && winnerRevealed) || isResolving || isFeedback;

  return (
    <div
      className='neo-grid-bg min-h-screen flex items-center justify-center p-8 select-none'
      style={{ color: '#f5f5f5' }}
    >
      <LayoutGroup>
        <div className='flex flex-col items-center w-full max-w-2xl'>
          <h2 className='text-2xl font-black mb-8 text-center'>
            {isPicking && 'How confident are you that your answer was correct?'}
            {isComparing && 'DETERMINING REWARD SOURCE...'}
            {isDecision && source === 'task' && 'TAKING YOUR ANSWER!'}
            {((isDecision && source === 'lottery') || isResolving) && 'PLAYING THE LOTTERY...'}
            {isFeedback &&
              wonReward !== null &&
              (wonReward ? (
                <span className='text-green-400'>ADDITIONAL REWARDS EARNED!</span>
              ) : (
                <span className='text-red-400'>NO EXTRA REWARD</span>
              ))}
          </h2>
          {isPicking && (
            <>
              <PickingBar confidence={userConfidence} onConfidenceChange={setUserConfidence} />
              <SubmitButton onClick={handleSubmit} />
            </>
          )}

          {(isComparing || (isDecision && !winnerRevealed)) && (
            <ComparingBar
              userConfidence={userConfidence}
              lotteryValue={greenChipPercent}
              animationDuration={animationDuration}
              winningSource={source}
              isFadingOut={barFadingOut}
              onPositionChange={setIndicatorPosition}
            />
          )}

          {(showSideBySide || showWinnerCentered) && (
            <motion.div
              layout
              className='flex justify-center items-start mt-3'
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {(showSideBySide || source === 'task') && (
                <motion.div
                  key='answer-card'
                  layout
                  style={{ marginRight: showSideBySide ? 40 : 0 }}
                  animate={{ opacity: source === 'lottery' ? 0 : 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <AnswerCard
                    revealed={cardRevealed}
                    isCorrect={isUserCorrect}
                    showLabel={showSideBySide}
                  />
                </motion.div>
              )}

              {(showSideBySide || source === 'lottery') && (
                <motion.div
                  key='lottery'
                  layout
                  style={{ marginLeft: showSideBySide ? 40 : 0 }}
                  animate={{ opacity: source === 'task' ? 0 : 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <LotteryGrid
                    displayPercent={
                      isComparing && liveLotteryFill ? indicatorPosition : greenChipPercent
                    }
                    grayedOut={!liveLotteryFill && isComparing}
                    gridSize={chipGridSize}
                    state={
                      isComparing
                        ? 'activating'
                        : isResolving
                          ? 'scanning'
                          : isFeedback
                            ? 'complete'
                            : 'idle'
                    }
                    showLabel={showSideBySide}
                    onResolved={handleLotteryResolved}
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {isFeedback && source === 'lottery' && (
            <p className='text-xl font-bold mt-12 text-gray-400'>
              Your original answer would have been{' '}
              <span className={isUserCorrect ? 'text-green-400' : 'text-red-400'}>
                {isUserCorrect ? 'correct' : 'incorrect'}
              </span>
              .
            </p>
          )}

          {isFeedback && <ContinuePrompt className={source === 'task' ? 'mt-12' : 'mt-8'} />}
        </div>
      </LayoutGroup>
    </div>
  );
};
