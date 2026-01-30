import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

// Styling constants
export const BORDER = 'border-4 border-black';
export const SHADOW = '6px 6px 0px #000';

// Tick mark labels for the confidence bar
export const TICK_MARKS = [
  { pos: 0, label: 'Certainly\nwrong' },
  { pos: 25, label: 'Probably\nwrong' },
  { pos: 50, label: 'Uncertain' },
  { pos: 75, label: 'Probably\nright' },
  { pos: 100, label: 'Certainly\nright' },
] as const;

export const TickMarks = () => (
  <div className='relative w-full h-14 mt-2'>
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
}: {
  confidence: number;
  onConfidenceChange: (value: number) => void;
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
      isDraggingRef.current = false;
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
  }, [updateConfidence]);

  return (
    <>
      {/* Large percentage display */}
      <div className='flex items-baseline mb-6'>
        <span className='text-8xl font-black tabular-nums text-white'>{confidence}</span>
        <span className='text-4xl font-bold text-gray-400 ml-2'>%</span>
      </div>

      <motion.div
        layout
        layoutId='confidence-bar'
        ref={barRef}
        className={`relative w-full h-16 bg-gray-600 overflow-hidden ${BORDER} cursor-pointer`}
        style={{ boxShadow: SHADOW }}
        onMouseDown={(e) => {
          isDraggingRef.current = true;
          updateConfidence(e.clientX);
        }}
        onTouchStart={(e) => {
          isDraggingRef.current = true;
          updateConfidence(e.touches[0].clientX);
        }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        {/* User confidence marker */}
        <motion.div
          className='absolute top-0 h-full z-10'
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
          className='absolute top-1/2 w-6 h-10 bg-white border-2 border-black z-20'
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

export const ContinuePrompt = () => (
  <p className='text-xl text-gray-500 mt-12'>Press Space or Enter to continue</p>
);

export const FeedbackContainer = ({ children }: { children: React.ReactNode }) => (
  <div
    className='neo-grid-bg min-h-screen flex items-center justify-center p-8 select-none'
    style={{ color: '#f5f5f5' }}
  >
    <div className='flex flex-col items-center w-full max-w-2xl'>{children}</div>
  </div>
);
