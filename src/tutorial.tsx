import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTutorialSlide } from '@adriansteffan/reactive';
import {
  PickingBar,
  ComparingBar,
  LotteryGrid,
  AnswerCard,
  SETTLE_DELAY,
  CARD_REVEAL_INITIAL,
  CARD_REVEAL_ANIMATE,
  CARD_REVEAL_TRANSITION,
  useBDMPhases,
  BDMAnimationStage,
} from './feedback/shared';
import { DemoRDK, keyLabel, KEY_LEFT, KEY_RIGHT } from './rdk';

const BAR_LAYOUT_ID = 'tutorial-bar';
const CARD_LAYOUT_ID = 'tutorial-card';
const LOTTERY_LAYOUT_ID = 'tutorial-lottery';

const SLIDE_CONTAINER = 'text-[#f5f5f5] flex flex-col items-center gap-4 w-full max-w-2xl';

const FeedbackText = ({ correct }: { correct: boolean }) => (
  <motion.p
    key={correct ? 'correct' : 'incorrect'}
    initial={{ opacity: 0, y: 4 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`text-lg font-bold ${correct ? 'text-green-400' : 'text-red-400'}`}
  >
    {correct ? 'Correct! Go on to the next slide.' : 'Try again!'}
  </motion.p>
);

const KeyBadge = ({ children }: { children: ReactNode }) => (
  <span className='inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 bg-white border border-black rounded text-black font-bold text-sm min-w-[1.5rem]'>
    {children}
  </span>
);

const PracticeSlide = ({ direction }: { direction: 'left' | 'right' }) => {
  const { unlock } = useTutorialSlide({ locked: true });
  const [answer, setAnswer] = useState<string | null>(null);
  const correctKey = direction === 'left' ? KEY_LEFT : KEY_RIGHT;
  const correct = answer === correctKey;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === KEY_LEFT || key === KEY_RIGHT) {
        e.preventDefault();
        setAnswer(key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (correct) unlock();
  }, [correct, unlock]);

  return (
    <div className='text-[#f5f5f5] flex flex-col items-center gap-4'>
      <p>
        Which direction are the dots generally moving? Press{' '}
        <KeyBadge>{keyLabel(KEY_LEFT)}</KeyBadge> or <KeyBadge>{keyLabel(KEY_RIGHT)}</KeyBadge> on
        your keyboard.
      </p>
      <div className='relative'>
        <DemoRDK
          coherence={0.8}
          direction={direction === 'left' ? 270 : 90}
          coherentDotColor={correct ? '#22c55e' : undefined}
        />
        {answer && (
          <div className='absolute -bottom-12 left-0 right-0 text-center'>
            <FeedbackText correct={correct} />
          </div>
        )}
      </div>
    </div>
  );
};

const ConfidenceIntroSlide = () => {
  const [confidence, setConfidence] = useState(50);

  return (
    <div className='text-[#f5f5f5] flex flex-col items-center gap-10 w-full max-w-2xl'>
      <p className='max-w-lg leading-relaxed'>
        After each trial, you will rate how confident you are that you chose the correct direction
        on a scale of 0-100. 100% means you are certain you got it right, 0% means you are certain
        you got it wrong, and 50% means you are guessing.
      </p>
      <div className='w-full flex flex-col items-center'>
        <PickingBar
          confidence={confidence}
          onConfidenceChange={setConfidence}
          layoutId='tutorial-practice-bar'
        />
      </div>
    </div>
  );
};

const ConfidencePracticeSlide = ({
  prompt,
  acceptRange,
}: {
  prompt: string;
  acceptRange: [number, number];
}) => {
  const { unlock } = useTutorialSlide({ locked: true });
  const [confidence, setConfidence] = useState(50);
  const [unlocked, setUnlocked] = useState(false);
  const [touched, setTouched] = useState(false);
  const [dragging, setDragging] = useState(false);

  const inRange = confidence >= acceptRange[0] && confidence <= acceptRange[1];

  useEffect(() => {
    if (touched && !dragging && inRange && !unlocked) {
      setUnlocked(true);
      unlock();
    }
  }, [touched, dragging, inRange, unlocked, unlock]);

  return (
    <div className='text-[#f5f5f5] flex flex-col items-center gap-10 w-full max-w-2xl'>
      <p className='max-w-lg leading-relaxed'>{prompt}</p>
      <div className='w-full flex flex-col items-center'>
        <PickingBar
          confidence={confidence}
          onConfidenceChange={setConfidence}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => {
            setDragging(false);
            setTouched(true);
          }}
          layoutId='tutorial-practice-bar'
        />
        <div className='mt-4 h-14 flex items-center'>
          {touched && !dragging && <FeedbackText correct={inRange} />}
        </div>
      </div>
    </div>
  );
};

const LoopingAnswerReveal = () => {
  const [state, setState] = useState<{ revealed: boolean; isCorrect: boolean; step: number }>({
    revealed: false,
    isCorrect: true,
    step: 0,
  });

  useEffect(() => {
    let step = 0;
    const sequence = [
      { revealed: false, isCorrect: true },
      { revealed: true, isCorrect: true },
      { revealed: false, isCorrect: false },
      { revealed: true, isCorrect: false },
    ];
    const durations = [1500, 2000, 1500, 2000];

    const advance = () => {
      step = (step + 1) % sequence.length;
      setState({ ...sequence[step], step });
      timer = setTimeout(advance, durations[step]);
    };

    let timer = setTimeout(advance, durations[0]);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className='text-[#f5f5f5] flex flex-col items-center gap-16'>
      <motion.div
        key={state.step}
        initial={state.revealed ? CARD_REVEAL_INITIAL : undefined}
        animate={CARD_REVEAL_ANIMATE}
        transition={CARD_REVEAL_TRANSITION}
      >
        <AnswerCard revealed={state.revealed} isCorrect={state.isCorrect} showLabel={false} />
      </motion.div>
      <p className='max-w-lg leading-relaxed'>
        After you give your confidence rating, it will be revealed whether your answer to the trial
        with the moving dots was correct or not.
      </p>
    </div>
  );
};

/** Simple BDM demo: bar sweep with optional position label, randomizable landing */
const BDMDemoSlide = ({
  children,
  userConfidence,
  lotteryValue,
  animationDuration = 4000,
  showPositionLabel = false,
  randomizeLanding = false,
  hideIndicator = false,
}: {
  children: React.ReactNode;
  userConfidence: number;
  lotteryValue: number;
  animationDuration?: number;
  showPositionLabel?: boolean;
  randomizeLanding?: boolean;
  hideIndicator?: boolean;
}) => {
  const [key, setKey] = useState(0);
  const [currentLottery, setCurrentLottery] = useState(
    randomizeLanding ? Math.floor(Math.random() * 100) : lotteryValue,
  );

  useEffect(() => {
    const restartDelay = SETTLE_DELAY + animationDuration + 1000;
    const timer = setTimeout(() => {
      setCurrentLottery(randomizeLanding ? Math.floor(Math.random() * 100) : lotteryValue);
      setKey((k) => k + 1);
    }, restartDelay);
    return () => clearTimeout(timer);
  }, [key, animationDuration, randomizeLanding, lotteryValue]);

  return (
    <div className={SLIDE_CONTAINER}>
      {children}
      <ComparingBar
        key={key}
        layoutId={BAR_LAYOUT_ID}
        userConfidence={userConfidence}
        lotteryValue={currentLottery}
        animationDuration={animationDuration}
        showPositionLabel={showPositionLabel}
        hideIndicator={hideIndicator}
      />
    </div>
  );
};

/** Payout explanation: continuous bar + card/lottery with dynamic opacity */
const ContinuousPayoutSlide = ({ children }: { children: React.ReactNode }) => {
  const [pos, setPos] = useState(0);
  const taskWins = pos < 60;

  return (
    <div className={SLIDE_CONTAINER}>
      {children}
      <ComparingBar
        userConfidence={60}
        continuous
        showPositionLabel
        layoutId={BAR_LAYOUT_ID}
        onPositionChange={setPos}
      />
      <div className='flex justify-center items-start gap-16 mt-2'>
        <motion.div
          layoutId={CARD_LAYOUT_ID}
          animate={{ opacity: taskWins ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        >
          <AnswerCard revealed={false} isCorrect={true} showLabel />
        </motion.div>
        <motion.div
          layoutId={LOTTERY_LAYOUT_ID}
          animate={{ opacity: taskWins ? 0.3 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <LotteryGrid
            displayPercent={pos}
            gridSize={10}
            state='idle'
            grayedOut={taskWins}
            showLabel
            onResolved={() => {}}
          />
        </motion.div>
      </div>
    </div>
  );
};

/** Continuous bar with live lottery fill */
const ContinuousLotterySlide = ({ children }: { children: React.ReactNode }) => {
  const [pos, setPos] = useState(0);

  return (
    <div className={SLIDE_CONTAINER}>
      {children}
      <ComparingBar
        userConfidence={60}
        continuous
        showPositionLabel
        minValue={60}
        maxValue={100}
        sweepDuration={3000}
        layoutId={BAR_LAYOUT_ID}
        onPositionChange={setPos}
      />
      <div className='flex justify-center mt-2'>
        <motion.div layoutId={LOTTERY_LAYOUT_ID}>
          <LotteryGrid displayPercent={pos} gridSize={10} state='idle' onResolved={() => {}} />
        </motion.div>
      </div>
    </div>
  );
};

/** Full BDM animation replay — uses shared hook + stage, adds looping */
const FullBDMDemo = ({
  children,
  userConfidence,
  lotteryValue,
  isUserCorrect,
  animationDuration = 3000,
  chipGridSize = 10,
  liveLotteryFill = false,
  predeterminedOutcome,
}: {
  children: React.ReactNode;
  userConfidence: number;
  lotteryValue: number;
  isUserCorrect?: boolean;
  animationDuration?: number;
  chipGridSize?: number;
  liveLotteryFill?: boolean;
  predeterminedOutcome?: boolean;
}) => {
  const [key, setKey] = useState(0);
  const [currentCorrect, setCurrentCorrect] = useState(isUserCorrect ?? true);

  const bdmState = useBDMPhases({
    userConfidence,
    lotteryValue,
    isUserCorrect: currentCorrect,
    animationDuration,
    resetToken: key,
  });

  // Feedback -> loop
  useEffect(() => {
    if (!bdmState.isFeedback) return;
    const timer = setTimeout(() => {
      setCurrentCorrect(isUserCorrect ?? !currentCorrect);
      setKey((k) => k + 1);
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps — currentCorrect intentionally omitted to avoid double-fire
  }, [bdmState.isFeedback, isUserCorrect]);

  return (
    <div className={SLIDE_CONTAINER}>
      {children}
      <div className='flex flex-col items-center justify-center w-full min-h-[520px]'>
        <BDMAnimationStage
          phaseState={bdmState}
          userConfidence={userConfidence}
          lotteryValue={lotteryValue}
          isUserCorrect={currentCorrect}
          animationDuration={animationDuration}
          chipGridSize={chipGridSize}
          liveLotteryFill={liveLotteryFill}
          predeterminedOutcome={predeterminedOutcome}
          barLayoutId={BAR_LAYOUT_ID}
          cardLayoutId={CARD_LAYOUT_ID}
          lotteryLayoutId={LOTTERY_LAYOUT_ID}
          animationKey={key}
          cardRevealBounce
        />

        {bdmState.isFeedback && bdmState.wonReward !== null && (
          <h2 className='text-2xl font-black mt-8 text-center'>
            {bdmState.wonReward ? (
              <span className='text-green-400'>ADDITIONAL REWARDS EARNED!</span>
            ) : (
              <span className='text-red-400'>NO EXTRA REWARD</span>
            )}
          </h2>
        )}
      </div>
    </div>
  );
};

/** Looping demo cycling through the three trial phases */
const TrialOrderDemo = () => {
  const [phase, setPhase] = useState(0);
  const labels = ['1. Moving Dots', '2. Confidence Voting', '3. Reward Procedure'];

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 3), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className='text-[#f5f5f5] flex flex-col items-center gap-14'>
      <p className='max-w-lg leading-relaxed'>
        You will play all trials in the exact same order: <br />
        Moving Dots, Confidence Voting, Reward Procedure.
      </p>
      <div className='relative w-full max-w-md h-80 flex items-center justify-center'>
        <AnimatePresence mode='wait'>
          {phase === 0 && (
            <motion.div
              key='dots'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className='flex flex-col items-center gap-4'
            >
              <p className='text-lg font-bold text-gray-400'>{labels[0]}</p>
              <DemoRDK />
            </motion.div>
          )}
          {phase === 1 && (
            <motion.div
              key='confidence'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className='flex flex-col items-center gap-4 w-full'
            >
              <p className='text-lg font-bold text-gray-400'>{labels[1]}</p>
              <div className='w-full'>
                <PickingBar
                  confidence={65}
                  onConfidenceChange={() => {}}
                  layoutId='tutorial-trial-order-bar'
                />
              </div>
            </motion.div>
          )}
          {phase === 2 && (
            <motion.div
              key='reward'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className='flex flex-col items-center gap-8'
            >
              <p className='text-lg font-bold text-gray-400'>{labels[2]}</p>
              <div className='flex justify-center items-start gap-8'>
                <AnswerCard revealed={false} isCorrect={true} showLabel={false} />
                <LotteryGrid
                  displayPercent={50}
                  gridSize={10}
                  state='idle'
                  grayedOut
                  onResolved={() => {}}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StartSlide = () => (
  <div className='text-[#f5f5f5] flex flex-col items-center'>
    <div className='max-w-lg flex flex-col gap-3'>
      <p className='leading-loose'>If you are ready, we can start with a few practice rounds.</p>
      <p className='leading-loose'>
        Place your fingers on <KeyBadge>{keyLabel(KEY_LEFT)}</KeyBadge> and{' '}
        <KeyBadge>{keyLabel(KEY_RIGHT)}</KeyBadge> and press <KeyBadge>Space</KeyBadge> to start.
      </p>
    </div>
  </div>
);

const RDKSlide = ({
  children,
  rdkProps,
}: {
  children: ReactNode;
  rdkProps?: Partial<React.ComponentProps<typeof DemoRDK>>;
}) => (
  <div className='text-[#f5f5f5] flex flex-col items-center gap-4'>
    <div className='h-20 flex items-center'>
      <p className='max-w-lg leading-relaxed'>{children}</p>
    </div>
    <DemoRDK {...rdkProps} />
  </div>
);

const rdkSlides: ReactNode[] = [
  <RDKSlide rdkProps={{ coherentDotColor: 'red', dotLifetime: -1 }}>
    In the following trials you will see clouds of moving dots. Some dots move together in one
    direction, while the rest move randomly.
  </RDKSlide>,

  <RDKSlide rdkProps={{ dotLifetime: -1 }}>In our trials, all dots will all be white:</RDKSlide>,

  <RDKSlide>And to make it a bit harder, the dots will get continuously replaced:</RDKSlide>,

  <div className='text-[#f5f5f5] flex flex-col items-center gap-6'>
    <p className='max-w-md leading-relaxed'>
      Your job is to decide whether the majority of the dots is moving left or right.
    </p>
    <p className='max-w-md leading-relaxed'>
      Press <KeyBadge>{keyLabel(KEY_LEFT)}</KeyBadge> if the dots move left,{' '}
      <KeyBadge>{keyLabel(KEY_RIGHT)}</KeyBadge> if the dots move right.
    </p>
  </div>,

  <PracticeSlide direction='right' />,
  <PracticeSlide direction='left' />,
];

const confidenceSlides: ReactNode[] = [
  <ConfidenceIntroSlide />,
  <ConfidencePracticeSlide
    prompt='Imagine this scenario: In the previous trial with the moving dots the direction was hard to see, but you are think you barely saw dots moving left and hence pressed the left key. Where would you place your confidence?'
    acceptRange={[55, 80]}
  />,
  <ConfidencePracticeSlide
    prompt='Imagine this scenario: In the previous trial with the moving dots, you were clearly confident that the dots were moving right, but you accidentally pressed left. Where would you place your confidence in your answer?'
    acceptRange={[0, 25]}
  />,
];

const controlSlides: ReactNode[] = [...rdkSlides, <StartSlide />];

const simpleSlides: ReactNode[] = [
  ...rdkSlides,
  ...confidenceSlides,
  <LoopingAnswerReveal />,
  <StartSlide />,
];

const bdmSlides: ReactNode[] = [
  ...rdkSlides,
  ...confidenceSlides,

  // Static bar — long duration prevents loop restart from causing a flash
  <BDMDemoSlide userConfidence={60} lotteryValue={0} animationDuration={60000} hideIndicator>
    <p className='max-w-lg leading-relaxed'>
      Your confidence rating is followed by a reward procedure. This procedure is designed so you
      will earn the most rewards by 1. performing well on the dot task and 2. giving accurate
      confidence ratings.
    </p>
    <p className='max-w-lg leading-relaxed'>
      For the following examples, let&apos;s assume you picked a confidence of 60%.
    </p>
  </BDMDemoSlide>,

  <BDMDemoSlide
    userConfidence={60}
    lotteryValue={50}
    animationDuration={5000}
    showPositionLabel
    randomizeLanding
  >
    <p className='max-w-lg leading-relaxed'>
      First, the computer will pick a random number between 0 and 100.
    </p>
  </BDMDemoSlide>,

  <ContinuousPayoutSlide>
    <p className='max-w-lg leading-relaxed'>
      The picked number decides how your rewards are paid out.
    </p>
  </ContinuousPayoutSlide>,

  <FullBDMDemo userConfidence={60} lotteryValue={35} animationDuration={3000}>
    <p className='max-w-lg leading-relaxed'>
      If the number is lower than your provided confidence score, you will receive a reward based on
      whether your answer in the moving dot trial was correct. The more confident you are in your
      answer, the higher you want this chance to be!
    </p>
  </FullBDMDemo>,

  <FullBDMDemo userConfidence={60} lotteryValue={80} animationDuration={3000}>
    <p className='max-w-lg leading-relaxed'>
      If the number is higher than your provided confidence score, a special lottery will decide if
      you get a reward.
    </p>
  </FullBDMDemo>,

  <ContinuousLotterySlide>
    <p className='max-w-lg leading-relaxed'>
      The lottery&apos;s win probability is exactly the picked number, so if the computer picked 80,
      you will win 80% of the time with that lottery. If your confidence in your answer is high, the
      lotteries you play will also have higher win chances!
    </p>
  </ContinuousLotterySlide>,

  <FullBDMDemo
    userConfidence={60}
    lotteryValue={85}
    animationDuration={3000}
    liveLotteryFill
    predeterminedOutcome={true}
  >
    <p className='max-w-lg leading-relaxed'>
      If you pick a high confidence and the number goes above it, you gain a strong lottery.
    </p>
  </FullBDMDemo>,

  <FullBDMDemo
    userConfidence={30}
    lotteryValue={35}
    animationDuration={3000}
    liveLotteryFill
    predeterminedOutcome={false}
  >
    <p className='max-w-lg leading-relaxed'>
      If you are less confident, the lotteries can also turn out weaker. But remember, when you are
      really unsure that your answer is right, even a weak lottery has a chance to give you a
      reward!
    </p>
  </FullBDMDemo>,

  <TrialOrderDemo />,

  <StartSlide />,
];

export function getTutorialSlides(condition: string): ReactNode[] {
  switch (condition) {
    case 'simple':
      return simpleSlides;
    case 'bdm':
      return bdmSlides;
    default:
      return controlSlides;
  }
}
