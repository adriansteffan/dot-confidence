// Becker-DeGroot-Marschak implementation with a hopefully tracable animation

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { BaseComponentProps, shuffle } from '@adriansteffan/reactive';

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

const BORDER = 'border-4 border-black';
const SHADOW = '6px 6px 0px #000';

// Timing constants (in ms) - might want something more fine grained later
const SETTLE_DELAY = 600; // Wait for layout to settle before starting animations
const FADE_DURATION = 400; // Duration for fade out animations
const POSITION_DELAY = 1200; // Wait for winner to reach center position

// Tick mark labels for the confidence bar(s)
const TICK_MARKS = [
  { pos: 0, label: 'Certainly\nwrong' },
  { pos: 25, label: 'Probably\nwrong' },
  { pos: 50, label: 'Uncertain' },
  { pos: 75, label: 'Probably\nright' },
  { pos: 100, label: 'Certainly\nright' },
] as const;


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

  // Pre-generate chip grid
  const { chipGrid, activationOrder, finalChip } = useMemo(() => {
    const totalChips = gridSize * gridSize;
    const greenCount = Math.round((greenChipPercent / 100) * totalChips);

    const chips = shuffle([...Array(greenCount).fill(true), ...Array(totalChips - greenCount).fill(false)]);

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
      finalChip: { row: Math.floor(Math.random() * gridSize), col: Math.floor(Math.random() * gridSize) },
    };
  }, [gridSize, greenChipPercent]);

  // Chip activation animation
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

  // Chip scan animation
  useEffect(() => {
    if (state !== 'scanning') return;

    const scanSequence: ChipPosition[] = [];
    for (let i = 0; i < 20; i++) {
      scanSequence.push({ row: Math.floor(Math.random() * gridSize), col: Math.floor(Math.random() * gridSize) });
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
      // Deceleration effect: starts fast, slows down as it approaches the end
      const delay = 80 + (idx / scanSequence.length) ** 2 * 200;
      timer = setTimeout(runScan, delay);
    };

    timer = setTimeout(runScan, SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [state, gridSize, chipGrid, finalChip, onResolved]);

  const showAll = state === 'scanning' || state === 'complete';
  const activated = new Set(activationOrder.slice(0, activeChipCount));

  return (
    <div className="flex flex-col items-center">
      {showLabel && <p className="text-lg font-bold text-gray-400 mb-3">LOTTERY</p>}
      <div className={`p-4 ${BORDER}`} style={{ boxShadow: SHADOW, background: '#374151' }}>
        <div className="flex flex-col gap-1">
          {chipGrid.map((row, r) => (
            <div key={r} className="flex gap-1">
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

const TickMarks = () => (
  <div className="relative w-full h-14 mt-2">
    {TICK_MARKS.map(({ pos, label }) => (
      <div key={pos} className="absolute -translate-x-1/2" style={{ left: `${pos}%` }}>
        <div className="w-1 h-3 bg-gray-500 mx-auto" />
        <span className="text-xs font-bold text-gray-400 block text-center mt-1 whitespace-pre-line leading-tight">{label}</span>
      </div>
    ))}
  </div>
);

const PickingBar = ({ confidence, onConfidenceChange }: {
  confidence: number;
  onConfidenceChange: (value: number) => void;
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateConfidence = useCallback((clientX: number) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onConfidenceChange(Math.round(pct));
  }, [onConfidenceChange]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => isDraggingRef.current && updateConfidence(e.clientX);
    const onTouchMove = (e: TouchEvent) => isDraggingRef.current && e.touches[0] && updateConfidence(e.touches[0].clientX);
    const onUp = () => { isDraggingRef.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [updateConfidence]);

  return (
    <>
      {/* Large percentage display */}
      <div className="flex items-baseline mb-6">
        <span className="text-8xl font-black tabular-nums text-white">{confidence}</span>
        <span className="text-4xl font-bold text-gray-400 ml-2">%</span>
      </div>

      <motion.div
        layout
        layoutId="confidence-bar"
        ref={barRef}
        className={`relative w-full h-16 bg-gray-600 overflow-hidden ${BORDER} cursor-pointer`}
        style={{ boxShadow: SHADOW }}
        onMouseDown={(e) => { isDraggingRef.current = true; updateConfidence(e.clientX); }}
        onTouchStart={(e) => { isDraggingRef.current = true; updateConfidence(e.touches[0].clientX); }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* User confidence marker */}
        <motion.div
          className="absolute top-0 h-full z-10"
          style={{ left: `${confidence}%`, transform: 'translateX(-50%)', width: 4, backgroundColor: '#ffffff', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}
        />

        {/* Draggable handle */}
        <div
          className="absolute top-1/2 w-6 h-10 bg-white border-2 border-black z-20"
          style={{ left: `${confidence}%`, transform: 'translate(-50%, -50%)' }}
        />
      </motion.div>

      <motion.div layout className="w-full" transition={{ duration: 0.5, ease: 'easeInOut' }}>
        <TickMarks />
      </motion.div>
    </>
  );
};

const ComparingBar = ({ userConfidence, lotteryValue, animationDuration, winningSource, isFadingOut }: {
  userConfidence: number;
  lotteryValue: number;
  animationDuration: number;
  winningSource: 'task' | 'lottery' | null;
  isFadingOut: boolean;
}) => (
  <motion.div
    className="w-full"
    animate={{ opacity: isFadingOut ? 0 : 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
  >
   
    <div className="w-full relative h-12 mb-2">
      <div
        className="absolute text-2xl font-black text-yellow-400"
        style={{
          left: `${userConfidence}%`,
          transform: userConfidence <= 5 ? 'translateX(0)' : userConfidence >= 95 ? 'translateX(-100%)' : 'translateX(-50%)'
        }}
      >
        {userConfidence}%
      </div>
    </div>

    
    <motion.div
      layout={!isFadingOut}
      layoutId="confidence-bar"
      className={`relative w-full h-16 bg-gray-600 overflow-hidden ${BORDER}`}
      style={{ boxShadow: SHADOW }}
    >
      

      {/* User confidence marker */}
      <div
        className="absolute top-0 h-full z-10"
        style={{
          left: `${userConfidence}%`,
          transform: 'translateX(-50%)',
          width: 6,
          backgroundColor: '#facc15',
          boxShadow: '0 0 8px rgba(250,204,21,0.6)',
        }}
      />

      {/* Lottery indicator - animates from 0 to target on mount */}
      <motion.div
        className="absolute top-0 h-full w-1.5 bg-blue-400 z-20"
        initial={{ left: '0%' }}
        animate={{ left: `${lotteryValue}%` }}
        transition={{ duration: animationDuration / 1000, ease: 'easeOut', delay: SETTLE_DELAY / 1000 }}
        style={{ transform: 'translateX(-50%)', boxShadow: '0 0 8px rgba(96,165,250,0.6)' }}
      />

      {/* Briefly highlight winning zone */}
      {winningSource && (
        <motion.div
          className="absolute top-0 h-full bg-blue-400"
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

const AnswerCard = ({ revealed, isCorrect, showLabel = true }: {
  revealed: boolean;
  isCorrect: boolean;
  showLabel?: boolean;
}) => (
  <div className="flex flex-col items-center">
    {showLabel && <p className="text-lg font-bold text-gray-400 mb-3">YOUR ANSWER</p>}
    <div
      className={`${BORDER} rounded-lg flex items-center justify-center ${revealed ? (isCorrect ? 'bg-green-400' : 'bg-red-400') : 'bg-gray-700'}`}
      style={{ width: 160, height: 224, boxShadow: SHADOW }}
    >
      {revealed ? (
        <span className="text-xl font-black text-black text-center px-2">
          {isCorrect ? 'CORRECT' : 'INCORRECT'}
        </span>
      ) : (
        <div className="w-[90%] h-[90%] border-2 border-gray-500 rounded flex items-center justify-center">
          <span className="text-6xl font-black text-gray-500">?</span>
        </div>
      )}
    </div>
  </div>
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

  // Random value for lottery value generated once at mount
  const greenChipPercent = useRef(Math.floor(Math.random() * 101)).current;

  
  const handleLotteryResolved = useCallback((won: boolean) => {
    setWonReward(won);
    setPhase('feedback');
  }, []);


  useEffect(() => {
    if (phase !== 'picking') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === decreaseKey) setUserConfidence(v => Math.max(0, v - 1));
      else if (e.key === increaseKey) setUserConfidence(v => Math.min(100, v + 1));
      else if (e.key === 'Enter') handleSubmit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, decreaseKey, increaseKey]);

  const handleSubmit = () => {
    pickingRTRef.current = performance.now() - pickingStartTimeRef.current;
    setPhase('comparing');
  };

  // Phase: comparing - transition to decision after animation completes
  useEffect(() => {
    if (phase !== 'comparing') return;

    const endTimer = setTimeout(() => setPhase('decision'), SETTLE_DELAY + animationDuration);
    return () => clearTimeout(endTimer);
  }, [phase, animationDuration]);

  // Phase: decision
  useEffect(() => {
    if (phase !== 'decision') return;

    const taskWins = userConfidence > greenChipPercent; // Tie goes to lottery
    setSource(taskWins ? 'task' : 'lottery');

    // Wait for fade to complete, then remove bar and loser together
    const revealTimer = setTimeout(() => {
      setWinnerRevealed(true);
    }, FADE_DURATION);

    if (taskWins) {
      // Reveal card and show result together (after winner is in position)
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
      // Lottery wins: after winner is in position, go to resolving, lottery will come back with result
      const resolveTimer = setTimeout(() => {
        setPhase('resolving');
      }, POSITION_DELAY);

      return () => {
        clearTimeout(revealTimer);
        clearTimeout(resolveTimer);
      };
    }
  }, [phase, userConfidence, greenChipPercent, isUserCorrect]);

  // Phase: feedback - keypress to continue
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

  // Derived state for cleaner conditionals
  const isPicking = phase === 'picking';
  const isComparing = phase === 'comparing';
  const isDecision = phase === 'decision';
  const isResolving = phase === 'resolving';
  const isFeedback = phase === 'feedback';

  // Bar fades out when source is set in decision phase
  const barFadingOut = isDecision && source !== null;

  // Options shown during comparing and decision (before reveal), or when showing winner
  const showSideBySide = isComparing || (isDecision && !winnerRevealed);
  const showWinnerCentered = (isDecision && winnerRevealed) || isResolving || isFeedback;

  return (
    <div className="neo-grid-bg min-h-screen flex items-center justify-center p-8 select-none" style={{ color: '#f5f5f5' }}>
      <LayoutGroup>
        <div className="flex flex-col items-center w-full max-w-2xl">

          {/* Title - changes based on phase */}
          <h2 className="text-2xl font-black mb-6 text-center">
            {isPicking && 'How confident are you that your answer was correct?'}
            {isComparing && 'DETERMINING REWARD SOURCE...'}
            {isDecision && source === 'task' && 'TAKING YOUR ANSWER!'}
            {((isDecision && source === 'lottery') || isResolving) && 'PLAYING THE LOTTERY...'}
            {isFeedback && wonReward !== null && (
              wonReward
                ? <span className="text-green-400">ADDITIONAL REWARDS EARNED!</span>
                : <span className="text-red-400">NO EXTRA REWARD</span>
            )}
          </h2>

          {isPicking && (
            <>
              <PickingBar confidence={userConfidence} onConfidenceChange={setUserConfidence} />
              <button
                onClick={handleSubmit}
                className="mt-10 px-12 py-3 bg-white text-black text-xl border-4 border-black rounded-2xl font-bold uppercase tracking-wider cursor-pointer shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100"
              >
                SUBMIT
              </button>
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

          {/* Options area - cards animate between positions */}
          {(showSideBySide || showWinnerCentered) && (
            <motion.div
              layout
              className="flex justify-center items-start mt-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              {/* Answer Card - stays in DOM during transition, fades if loser */}
              {(showSideBySide || source === 'task') && (
                <motion.div
                  key="answer-card"
                  layout
                  style={{ marginRight: showSideBySide ? 40 : 0 }}
                  animate={{
                    opacity: source === 'lottery' ? 0 : 1,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <AnswerCard revealed={cardRevealed} isCorrect={isUserCorrect} showLabel={showSideBySide} />
                </motion.div>
              )}

              {/* Lottery - stays in DOM during transition, fades if loser */}
              {(showSideBySide || source === 'lottery') && (
                <motion.div
                  key="lottery"
                  layout
                  style={{ marginLeft: showSideBySide ? 40 : 0 }}
                  animate={{
                    opacity: source === 'task' ? 0 : 1,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <LotteryGrid
                    greenChipPercent={greenChipPercent}
                    gridSize={chipGridSize}
                    animationDuration={animationDuration}
                    state={isComparing ? 'activating' : isResolving ? 'scanning' : isFeedback ? 'complete' : 'idle'}
                    showLabel={showSideBySide}
                    onResolved={handleLotteryResolved}
                  />
                </motion.div>
              )}
            </motion.div>
          )}

          {isFeedback && (
            <p className="text-xl text-gray-500 mt-12">Press Space or Enter to continue</p>
          )}

        </div>
      </LayoutGroup>
    </div>
  );
};
