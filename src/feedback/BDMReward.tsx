// Becker-DeGroot-Marschak implementation with a hopefully tracable animation

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, LayoutGroup } from 'motion/react';
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
}

type Phase = 'picking' | 'comparing' | 'decision' | 'resolving' | 'feedback';

interface ChipPosition {
  row: number;
  col: number;
}

// BDM-specific timing constants (in ms)
const SETTLE_DELAY = 600;
const FADE_DURATION = 400;
const POSITION_DELAY = 1200;

type GridState = 'idle' | 'activating' | 'scanning' | 'complete';

const LotteryGrid = ({
  greenChipPercent,
  gridSize,
  animationDuration,
  state,
  showLabel = false,
  onResolved,
}: {
  greenChipPercent: number;
  gridSize: number;
  animationDuration: number;
  state: GridState;
  showLabel?: boolean;
  onResolved: (won: boolean) => void;
}) => {
  const [activeChipCount, setActiveChipCount] = useState(0);
  const [scanPosition, setScanPosition] = useState<ChipPosition | null>(null);
  const [selectedChip, setSelectedChip] = useState<ChipPosition | null>(null);

  const { chipGrid, activationOrder, finalChip } = useMemo(() => {
    const totalChips = gridSize * gridSize;
    const greenCount = Math.round((greenChipPercent / 100) * totalChips);
    const chips = shuffle([
      ...Array(greenCount).fill(true),
      ...Array(totalChips - greenCount).fill(false),
    ]);

    const grid: boolean[][] = [];
    const greenIndices: number[] = [];
    for (let row = 0; row < gridSize; row++) {
      grid.push(chips.slice(row * gridSize, (row + 1) * gridSize));
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col]) greenIndices.push(row * gridSize + col);
      }
    }

    return {
      chipGrid: grid,
      activationOrder: shuffle(greenIndices),
      finalChip: {
        row: Math.floor(Math.random() * gridSize),
        col: Math.floor(Math.random() * gridSize),
      },
    };
  }, [gridSize, greenChipPercent]);

  useEffect(() => {
    if (state !== 'activating') return;

    const totalChips = gridSize * gridSize;
    const targetChips = Math.round((greenChipPercent / 100) * totalChips);
    const delayPerChip = (animationDuration - 200) / Math.max(targetChips, 1);
    let count = 0;
    let chipTimer: ReturnType<typeof setTimeout>;

    const activateNext = () => {
      if (count >= targetChips) return;
      count++;
      setActiveChipCount(count);
      if (count < targetChips) chipTimer = setTimeout(activateNext, delayPerChip);
    };
    chipTimer = setTimeout(activateNext, SETTLE_DELAY + 100);

    return () => clearTimeout(chipTimer);
  }, [state, greenChipPercent, gridSize, animationDuration]);

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
        const isWin = chipGrid[finalChip.row][finalChip.col];
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
  }, [state, gridSize, chipGrid, finalChip, onResolved]);

  const showAll = state === 'scanning' || state === 'complete';
  const activated = new Set(activationOrder.slice(0, activeChipCount));

  return (
    <div className='flex flex-col items-center'>
      {showLabel && <p className='text-lg font-bold text-gray-400 mb-3'>LOTTERY</p>}
      <div className={`p-4 ${BORDER}`} style={{ boxShadow: SHADOW, background: '#374151' }}>
        <div className='flex flex-col gap-1'>
          {chipGrid.map((row, r) => (
            <div key={r} className='flex gap-1'>
              {row.map((isGreen, c) => {
                const idx = r * gridSize + c;
                const showGreen = isGreen && (showAll || activated.has(idx));
                const scanning = scanPosition?.row === r && scanPosition?.col === c;
                const selected = selectedChip?.row === r && selectedChip?.col === c;
                return (
                  <motion.div
                    key={c}
                    className={`w-5 h-5 border-2 border-black ${showGreen ? 'bg-green-400' : 'bg-red-400'} ${scanning ? 'ring-2 ring-white' : ''} ${selected ? 'ring-4 ring-white' : ''}`}
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

const ComparingBar = ({
  userConfidence,
  lotteryValue,
  animationDuration,
  winningSource,
  isFadingOut,
}: {
  userConfidence: number;
  lotteryValue: number;
  animationDuration: number;
  winningSource: 'task' | 'lottery' | null;
  isFadingOut: boolean;
}) => (
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
        initial={{ left: '0%' }}
        animate={{ left: `${lotteryValue}%` }}
        transition={{
          duration: animationDuration / 1000,
          ease: 'easeOut',
          delay: SETTLE_DELAY / 1000,
        }}
        style={{ transform: 'translateX(-50%)', boxShadow: '0 0 8px rgba(96,165,250,0.6)' }}
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

export const BDMReward = ({
  next,
  isUserCorrect,
  animationDuration = 2500,
  chipGridSize = 10,
  defaultConfidence = 50,
  decreaseKey = 'ArrowLeft',
  increaseKey = 'ArrowRight',
}: BDMRewardProps) => {
  const [phase, setPhase] = useState<Phase>('picking');
  const [userConfidence, setUserConfidence] = useState(defaultConfidence);
  const [source, setSource] = useState<'task' | 'lottery' | null>(null);
  const [wonReward, setWonReward] = useState<boolean | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);

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
    const endTimer = setTimeout(() => setPhase('decision'), SETTLE_DELAY + animationDuration);
    return () => clearTimeout(endTimer);
  }, [phase, animationDuration]);

  useEffect(() => {
    if (phase !== 'decision') return;

    const taskWins = userConfidence > greenChipPercent;
    setSource(taskWins ? 'task' : 'lottery');

    const revealTimer = setTimeout(() => setWinnerRevealed(true), FADE_DURATION);

    if (taskWins) {
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
  }, [phase, userConfidence, greenChipPercent, isUserCorrect]);

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
          <h2 className='text-2xl font-black mb-6 text-center'>
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
              winningSource={isDecision ? source : null}
              isFadingOut={barFadingOut}
            />
          )}

          {(showSideBySide || showWinnerCentered) && (
            <motion.div
              layout
              className='flex justify-center items-start mt-12'
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
                    greenChipPercent={greenChipPercent}
                    gridSize={chipGridSize}
                    animationDuration={animationDuration}
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

          {isFeedback && <ContinuePrompt />}
        </div>
      </LayoutGroup>
    </div>
  );
};
