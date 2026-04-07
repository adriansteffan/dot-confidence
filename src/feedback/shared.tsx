import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { shuffle, useTheme, t, DARK_BG_CLASS } from '@adriansteffan/reactive';

export const BORDER = 'border-4 border-black';
export const SHADOW = '6px 6px 0px #000';

// Timing constant shared between BDMReward and tutorial
export const SETTLE_DELAY = 600;

// Card reveal bounce — shared across Feedback, BDMAnimationStage, and LoopingAnswerReveal
export const CARD_REVEAL_INITIAL = { opacity: 0, scale: 0.9 };
export const CARD_REVEAL_ANIMATE = { opacity: 1, scale: 1 };
export const CARD_REVEAL_TRANSITION = { duration: 0.3 };

// Shared bar styling — PickingBar and ComparingBar must match so layout morphs look seamless
const BAR_CLASS = `relative w-full h-16 bg-gray-600 overflow-hidden ${BORDER}`;
const BAR_STYLE = { boxShadow: SHADOW };

export const TICK_MARKS = [
  { pos: 0, label: 'Certainly\nwrong' },
  { pos: 25, label: 'Probably\nwrong' },
  { pos: 50, label: 'Uncertain' },
  { pos: 75, label: 'Probably\nright' },
  { pos: 100, label: 'Certainly\nright' },
] as const;

export const TickMarks = () => (
  <div className='relative w-full h-14 mt-2 select-none'>
    {TICK_MARKS.map(({ pos, label }) => (
      <div key={pos} className='absolute -translate-x-1/2' style={{ left: `${pos}%` }}>
        <div className='w-1 h-3 bg-gray-500 mx-auto' />
        <span className='text-xs font-bold text-gray-400 block text-center mt-1 whitespace-pre-line leading-tight'>
          {label}
        </span>
      </div>
    ))}
  </div>
);

export const PickingBar = ({
  confidence,
  onConfidenceChange,
  onDragStart,
  onDragEnd,
  layoutId = 'confidence-bar',
}: {
  confidence: number;
  onConfidenceChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  layoutId?: string;
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const updateConfidence = useCallback(
    (clientX: number) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      onConfidenceChange(Math.round(pct));
    },
    [onConfidenceChange],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => isDraggingRef.current && updateConfidence(e.clientX);
    const onTouchMove = (e: TouchEvent) =>
      isDraggingRef.current && e.touches[0] && updateConfidence(e.touches[0].clientX);
    const onUp = () => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;
      if (wasDragging) onDragEnd?.();
    };

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
  }, [updateConfidence, onDragEnd, onDragStart]);

  return (
    <>
      {/* Large percentage display */}
      <motion.div
        layout='position'
        layoutId={`${layoutId}-pct`}
        className='w-full mb-6'
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <div className='flex items-baseline justify-center'>
          <span className='text-8xl font-black tabular-nums text-white'>{confidence}</span>
          <span className='text-4xl font-bold text-gray-400 ml-2'>%</span>
        </div>
      </motion.div>

      <motion.div
        layout
        layoutId={layoutId}
        ref={barRef}
        className={`${BAR_CLASS} cursor-pointer`}
        style={BAR_STYLE}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          updateConfidence(e.clientX);
          onDragStart?.();
        }}
        onTouchStart={(e) => {
          isDraggingRef.current = true;
          updateConfidence(e.touches[0].clientX);
          onDragStart?.();
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* User confidence marker */}
        <motion.div
          className='absolute top-0 h-full z-10 pointer-events-none'
          style={{
            left: `${confidence}%`,
            transform: 'translateX(-50%)',
            width: 4,
            backgroundColor: '#ffffff',
            boxShadow: '0 0 10px rgba(255,255,255,0.5)',
          }}
        />

        {/* Draggable handle */}
        <div
          className='absolute top-1/2 w-6 h-10 bg-white border-2 border-black z-20 cursor-pointer'
          style={{ left: `${confidence}%`, transform: 'translate(-50%, -50%)' }}
        />
      </motion.div>

      <motion.div layout className='w-full' transition={{ duration: 0.5, ease: 'easeInOut' }}>
        <TickMarks />
      </motion.div>
    </>
  );
};

export const AnswerCard = ({
  revealed,
  isCorrect,
  showLabel = true,
}: {
  revealed: boolean;
  isCorrect: boolean;
  showLabel?: boolean;
}) => (
  <div className='flex flex-col items-center'>
    {showLabel && <p className='text-lg font-bold text-gray-400 mb-3'>YOUR ANSWER</p>}
    <div
      className={`${BORDER} rounded-lg flex items-center justify-center ${revealed ? (isCorrect ? 'bg-green-400' : 'bg-red-400') : 'bg-gray-700'}`}
      style={{ width: 160, height: 224, boxShadow: SHADOW }}
    >
      {revealed ? (
        <span className='text-xl font-black text-black text-center px-2'>
          {isCorrect ? 'CORRECT' : 'INCORRECT'}
        </span>
      ) : (
        <div className='w-[90%] h-[90%] border-2 border-gray-500 rounded flex items-center justify-center'>
          <span className='text-6xl font-black text-gray-500'>?</span>
        </div>
      )}
    </div>
  </div>
);

export const SubmitButton = ({
  onClick,
  text = 'SUBMIT',
}: {
  onClick: () => void;
  text?: string;
}) => (
  <button
    onClick={onClick}
    className='mt-10 px-12 py-3 bg-white text-black text-xl border-4 border-black rounded-2xl font-bold uppercase tracking-wider cursor-pointer shadow-[4px_4px_0px_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all duration-100'
  >
    {text}
  </button>
);

export const ContinuePrompt = ({ className = 'mt-8' }: { className?: string }) => (
  <p className={`text-xl text-gray-500 ${className}`}>Press Space or Enter to continue</p>
);

export const FeedbackContainer = ({
  children,
  containerClass,
}: {
  children: React.ReactNode;
  containerClass?: string;
}) => {
  const theme = useTheme();
  return (
    <div
      className={`${containerClass ?? DARK_BG_CLASS} min-h-screen flex items-center justify-center p-8 select-none ${t(theme).text}`}
    >
      <div className='flex flex-col items-center w-full max-w-2xl'>{children}</div>
    </div>
  );
};

interface ChipPosition {
  row: number;
  col: number;
}

export type GridState = 'idle' | 'activating' | 'scanning' | 'complete';

export const LotteryGrid = ({
  displayPercent,
  gridSize,
  state,
  showLabel = false,
  grayedOut = false,
  fast = false,
  predeterminedOutcome,
  onResolved,
}: {
  displayPercent: number;
  gridSize: number;
  state: GridState;
  showLabel?: boolean;
  grayedOut?: boolean;
  fast?: boolean;
  predeterminedOutcome?: boolean;
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

    const scanSteps = fast ? 8 : 20;
    const scanSequence: ChipPosition[] = [];
    for (let i = 0; i < scanSteps; i++) {
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
        const totalChips = gridSize * gridSize;
        const greenCount = Math.round((displayPercent / 100) * totalChips);
        let resolvedChip = finalChip;
        const isWin = chipOrder.indexOf(finalChip.row * gridSize + finalChip.col) < greenCount;
        // When outcome is predetermined (tutorial), ensure the selected chip's color
        // matches the forced result — otherwise the visual (green/red chip) would
        // contradict the reported win/loss
        if (predeterminedOutcome !== undefined && predeterminedOutcome !== isWin) {
          const candidates = predeterminedOutcome
            ? chipOrder.slice(0, greenCount) // pick a green chip for a forced win
            : chipOrder.slice(greenCount); // pick a red chip for a forced loss
          if (candidates.length > 0) {
            const picked = candidates[Math.floor(Math.random() * candidates.length)];
            resolvedChip = { row: Math.floor(picked / gridSize), col: picked % gridSize };
          }
        }
        setSelectedChip(resolvedChip);
        setScanPosition(null);
        onResolved(predeterminedOutcome ?? isWin);
        return;
      }
      setScanPosition(scanSequence[idx]);
      idx++;
      const delay = fast
        ? 40 + (idx / scanSequence.length) ** 2 * 80
        : 80 + (idx / scanSequence.length) ** 2 * 200;
      timer = setTimeout(runScan, delay);
    };

    timer = setTimeout(runScan, SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, [
    state,
    gridSize,
    chipOrder,
    finalChip,
    onResolved,
    displayPercent,
    fast,
    predeterminedOutcome,
  ]);

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

export function ComparingBar({
  userConfidence,
  lotteryValue = 0,
  animationDuration = 2500,
  winningSource = null,
  isFadingOut = false,
  onPositionChange,
  layoutId = 'confidence-bar',
  // Continuous mode: cursor sweeps left-to-right endlessly (used in tutorial demo slides)
  continuous = false,
  sweepDuration = 3000,
  minValue = 0,
  maxValue = 100,
  // Display options
  showPositionLabel = false,
  hideIndicator = false,
}: {
  userConfidence: number;
  lotteryValue?: number;
  animationDuration?: number;
  winningSource?: 'task' | 'lottery' | null;
  isFadingOut?: boolean;
  onPositionChange?: (position: number) => void;
  layoutId?: string;
  continuous?: boolean;
  sweepDuration?: number;
  minValue?: number;
  maxValue?: number;
  showPositionLabel?: boolean;
  hideIndicator?: boolean;
}) {
  const distance = useMotionValue(0);
  const [currentPos, setCurrentPos] = useState(0);

  // One-shot mode: 200 = 2 full sweeps (0→100→0→100) before landing at lotteryValue
  const totalDistance = 200 + lotteryValue;
  const oneShotLeft = useTransform(distance, (v) => `${v % 100}%`); // wraps multi-sweep into 0-100%

  // Continuous mode: sweep minValue→maxValue linearly
  const range = maxValue - minValue;
  const continuousLeft = useTransform(distance, (v) => `${minValue + v}%`);

  const left = continuous ? continuousLeft : oneShotLeft;

  useEffect(() => {
    if (continuous) {
      const controls = animate(distance, range, {
        duration: sweepDuration / 1000,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'loop',
      });
      return () => controls.stop();
    } else {
      const controls = animate(distance, totalDistance, {
        duration: animationDuration / 1000,
        ease: [0.35, 0.25, 0.05, 1],
        delay: SETTLE_DELAY / 1000,
      });
      return () => controls.stop();
    }
  }, []);

  useEffect(() => {
    return distance.on('change', (v) => {
      const pos = continuous ? minValue + v : v % 100;
      setCurrentPos(Math.round(pos));
      onPositionChange?.(continuous ? minValue + v : v % 100);
    });
  }, [distance, onPositionChange, continuous, minValue]);

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
        {showPositionLabel && (
          <motion.div
            className='absolute text-xl font-black text-blue-400'
            style={{ left, transform: 'translateX(-50%)' }}
          >
            {currentPos}
          </motion.div>
        )}
      </div>

      <motion.div layout={!isFadingOut} layoutId={layoutId} className={BAR_CLASS} style={BAR_STYLE}>
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
            visibility: hideIndicator ? 'hidden' : 'visible',
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

// BDM phase timing constants
const FADE_DURATION = 600;
const POSITION_DELAY = 1000;

export type BDMPhase = 'comparing' | 'decision' | 'resolving' | 'feedback';

export interface BDMPhaseState {
  phase: BDMPhase;
  source: 'task' | 'lottery' | null;
  wonReward: boolean | null;
  cardRevealed: boolean;
  winnerRevealed: boolean;
  indicatorPosition: number;
  setIndicatorPosition: (pos: number) => void;
  handleLotteryResolved: (won: boolean) => void;
  barFadingOut: boolean;
  showSideBySide: boolean;
  showWinnerCentered: boolean;
  isComparing: boolean;
  isDecision: boolean;
  isResolving: boolean;
  isFeedback: boolean;
}

/**
 * State machine driving the BDM reward animation:
 *
 *   comparing --(bar lands)--> decision --+--(task wins)---> card flips -> feedback
 *                                        \--(lottery wins)-> resolving --(scan done)-> feedback
 *
 * - comparing: bar sweeps across, source (task/lottery) determined on landing
 * - decision: losing option fades out, winner centers
 * - resolving: LotteryGrid scans chips (lottery path only)
 * - feedback: terminal state — consumer handles continuation (BDMReward calls next, tutorial loops)
 */
export function useBDMPhases({
  userConfidence,
  lotteryValue,
  isUserCorrect,
  animationDuration,
  started = true,
  resetToken = 0,
  fastMode = false,
}: {
  userConfidence: number;
  lotteryValue: number;
  isUserCorrect: boolean;
  animationDuration: number;
  started?: boolean;
  resetToken?: number;
  fastMode?: boolean;
}): BDMPhaseState {
  const [phase, setPhase] = useState<BDMPhase>('comparing');
  const [source, setSource] = useState<'task' | 'lottery' | null>(null);
  const [wonReward, setWonReward] = useState<boolean | null>(null);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [winnerRevealed, setWinnerRevealed] = useState(false);
  const [indicatorPosition, setIndicatorPosition] = useState(0);

  const taskWins = lotteryValue < userConfidence;

  // Reset all phase state when resetToken changes (used by tutorial's FullBDMDemo to loop).
  useEffect(() => {
    // Skips resetToken=0 so the initial mount doesn't reset the already-correct initial state.
    if (resetToken === 0) return;
    setPhase('comparing');
    setSource(null);
    setWonReward(null);
    setCardRevealed(false);
    setWinnerRevealed(false);
    setIndicatorPosition(0);
  }, [resetToken]);

  // Comparing -> decision (started=false while user is still picking confidence)
  useEffect(() => {
    if (!started || phase !== 'comparing') return;
    const landTime = SETTLE_DELAY + animationDuration;
    // Highlight the winning side of the bar once the sweep animation lands
    const highlightTimer = setTimeout(() => {
      setSource(taskWins ? 'task' : 'lottery');
    }, landTime);
    // Brief pause to let the user see the highlight before transitioning
    const endTimer = setTimeout(() => setPhase('decision'), landTime + (fastMode ? 0 : 1000));
    return () => {
      clearTimeout(highlightTimer);
      clearTimeout(endTimer);
    };
  }, [started, phase, resetToken, animationDuration, taskWins, fastMode]);

  // Decision → resolving/feedback
  // First the losing option fades out (fadeDur), then the winner resolves (posDur):
  //   Task wins: card flips to reveal correct/incorrect → feedback
  //   Lottery wins: transitions to 'resolving' where LotteryGrid scans → handleLotteryResolved → feedback
  useEffect(() => {
    if (!started || phase !== 'decision') return;
    const isLottery = source === 'lottery';
    const fadeDur = fastMode && isLottery ? 200 : FADE_DURATION;
    const posDur = fastMode && isLottery ? 400 : POSITION_DELAY;

    // Losing option fades, winner centers
    const revealTimer = setTimeout(() => setWinnerRevealed(true), fadeDur);

    if (!isLottery) {
      // Task path: reveal the answer card
      const resultTimer = setTimeout(() => {
        setCardRevealed(true);
        setWonReward(isUserCorrect);
        setPhase('feedback');
      }, posDur);
      return () => {
        clearTimeout(revealTimer);
        clearTimeout(resultTimer);
      };
    } else {
      // Lottery path: hand off to LotteryGrid scanning (handleLotteryResolved completes it)
      const resolveTimer = setTimeout(() => setPhase('resolving'), posDur);
      return () => {
        clearTimeout(revealTimer);
        clearTimeout(resolveTimer);
      };
    }
  }, [started, phase, source, isUserCorrect, fastMode]);

  // Called by LotteryGrid's onResolved when scanning finishes — completes the lottery path
  const handleLotteryResolved = useCallback((won: boolean) => {
    setWonReward(won);
    setPhase('feedback');
  }, []);

  const isComparing = phase === 'comparing';
  const isDecision = phase === 'decision';
  const isResolving = phase === 'resolving';
  const isFeedback = phase === 'feedback';

  return {
    phase,
    source,
    wonReward,
    cardRevealed,
    winnerRevealed,
    indicatorPosition,
    setIndicatorPosition,
    handleLotteryResolved,
    barFadingOut: isDecision && source !== null,
    showSideBySide: isComparing || (isDecision && !winnerRevealed),
    showWinnerCentered: (isDecision && winnerRevealed) || isResolving || isFeedback,
    isComparing,
    isDecision,
    isResolving,
    isFeedback,
  };
}

export function BDMAnimationStage({
  phaseState,
  userConfidence,
  lotteryValue,
  isUserCorrect,
  animationDuration,
  chipGridSize = 10,
  liveLotteryFill = false,
  fastMode = false,
  predeterminedOutcome,
  barLayoutId,
  cardLayoutId,
  lotteryLayoutId,
  animationKey,
  cardRevealBounce = false,
  lotteryActivatingDuringComparing = false,
}: {
  phaseState: BDMPhaseState;
  userConfidence: number;
  lotteryValue: number;
  isUserCorrect: boolean;
  animationDuration: number;
  chipGridSize?: number;
  liveLotteryFill?: boolean;
  fastMode?: boolean;
  predeterminedOutcome?: boolean;
  barLayoutId?: string;
  cardLayoutId?: string;
  lotteryLayoutId?: string;
  animationKey?: number;
  cardRevealBounce?: boolean;
  lotteryActivatingDuringComparing?: boolean;
}) {
  const {
    isComparing,
    isDecision,
    isResolving,
    isFeedback,
    source,
    cardRevealed,
    winnerRevealed,
    barFadingOut,
    showSideBySide,
    showWinnerCentered,
    indicatorPosition,
    setIndicatorPosition,
    handleLotteryResolved,
  } = phaseState;

  const lotteryState: GridState = isComparing
    ? lotteryActivatingDuringComparing
      ? 'activating'
      : 'idle'
    : isResolving
      ? 'scanning'
      : isFeedback
        ? 'complete'
        : 'idle';

  const cardContent = (
    <AnswerCard revealed={cardRevealed} isCorrect={isUserCorrect} showLabel={showSideBySide} />
  );

  return (
    <>
      {(isComparing || (isDecision && !winnerRevealed)) && (
        <ComparingBar
          key={animationKey}
          layoutId={barLayoutId}
          userConfidence={userConfidence}
          lotteryValue={lotteryValue}
          animationDuration={animationDuration}
          winningSource={source}
          isFadingOut={barFadingOut}
          onPositionChange={setIndicatorPosition}
        />
      )}

      {(showSideBySide || showWinnerCentered) && (
        <motion.div
          className='flex justify-center items-start mt-3'
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {(showSideBySide || source === 'task') && (
            <motion.div
              key='answer-card'
              layout
              layoutId={cardLayoutId}
              style={{ marginRight: showSideBySide ? 40 : 0 }}
              animate={{ opacity: source === 'lottery' ? 0 : 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {cardRevealBounce ? (
                <motion.div
                  key={cardRevealed ? 'revealed' : 'hidden'}
                  initial={cardRevealed ? CARD_REVEAL_INITIAL : undefined}
                  animate={CARD_REVEAL_ANIMATE}
                  transition={CARD_REVEAL_TRANSITION}
                >
                  {cardContent}
                </motion.div>
              ) : (
                cardContent
              )}
            </motion.div>
          )}

          {(showSideBySide || source === 'lottery') && (
            <motion.div
              key='lottery'
              layout='position'
              layoutId={lotteryLayoutId}
              style={{ marginLeft: showSideBySide ? 40 : 0 }}
              animate={{ opacity: source === 'task' ? 0 : 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              <LotteryGrid
                key={animationKey != null ? `lottery-${animationKey}` : undefined}
                displayPercent={isComparing && liveLotteryFill ? indicatorPosition : lotteryValue}
                grayedOut={!liveLotteryFill && source !== 'lottery'}
                fast={fastMode}
                gridSize={chipGridSize}
                state={lotteryState}
                showLabel={showSideBySide}
                onResolved={handleLotteryResolved}
                predeterminedOutcome={predeterminedOutcome}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </>
  );
}
