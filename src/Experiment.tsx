/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExperimentRunner,
  ExperimentConfig,
  getParam,
  shuffle,
  RandomDotKinematogram,
  RDKProps,
  simulateDDMTrial,
  mapDDMChoice,
  uniform,
} from '@adriansteffan/reactive';
import { Feedback, BDMReward } from './feedback';
import { ContrastDark } from 'survey-core/themes';
import { getTutorialSlides, getBDMRetrySlides, BDMSummary } from './tutorial';
import {
  BG_CLASS,
  NDOTS,
  DOTSPEED,
  DOTLIFETIME,
  NOISE_MOVEMENT,
  KEY_LEFT,
  KEY_RIGHT,
  keyLabel,
} from './rdk';

const config: ExperimentConfig = { showProgressBar: false };

// Shared props for Text components on dark background
const TEXT_CLASS =
  '!text-[#f5f5f5] prose-headings:!text-[#f5f5f5] prose-strong:!text-[#f5f5f5] prose-li:!text-[#f5f5f5]';

// Shared props for Text components on dark background
const TEXT_PROPS = {
  containerClass: BG_CLASS,
  className: TEXT_CLASS,
  buttonText: 'Continue',
};

// Centered variant — for short messages (breaks, practice end) that look better vertically centered
const TEXT_PROPS_CENTERED = {
  containerClass: `${BG_CLASS} flex items-center justify-center`,
  className: TEXT_CLASS,
  buttonText: 'Continue',
};

const NTRIALS = getParam('ntrials', 50, 'number', 'Number of trials to show');
const NPRACTICE = getParam('npractice', 10, 'number', 'Number of practice trials');

const QUIZ = {
  s1: { confidence: 80, randomNumber: 86 },
  s2: { realConfidence: 81, enteredConfidence: 18, randomNumber: 25 },
  answers: {
    q1: 'lottery',
    q2: 86,
    q3: 14,
    q4: 81,
    q5: 25,
    q6: 'lottery',
  },
};
const STIMDUR = getParam('stimdur', 2000, 'number', 'Stimulus duration in milliseconds');
const BREAK_EVERY = getParam(
  'breakevery',
  25,
  'number',
  'Insert a break screen every N trials (0 to disable)',
);

const CONDITIONS = ['control', 'simple', 'bdm'] as const;
const CONDITION = getParam(
  'condition',
  CONDITIONS[Math.floor(uniform(0, CONDITIONS.length))],
  'string',
  'Feedback condition (control, simple, bdm)',
);

const COHERENCES = getParam(
  'coherences',
  [0.05, 0.15, 0.25, 0.35, 0.5],
  'json',
  'List of coherence levels',
) as number[];

// --- Simulators ---

const BASE_BOUNDARY = 0.75;
const BOUNDARY_MULTIPLIER: Record<string, number> = { control: 1.0, simple: 1.05, bdm: 1.1 };
const CONFIDENCE_BIAS: Record<string, number> = { control: 0, simple: 7, bdm: 2 };
const CONFIDENCE_NOISE: Record<string, number> = { control: 0, simple: 5, bdm: 3 };

const rdkRespond = (trialProps: any, participant: any) => {
  const boundaries = BASE_BOUNDARY * (BOUNDARY_MULTIPLIER[CONDITION] ?? 1.0);
  const ddm = simulateDDMTrial({
    driftRate: { type: 'normal', mean: 0.005 * (trialProps.coherence ?? 0.5), sd: 0.0012 },
    boundaries,
    startingPoint: 0,
    noiseLevel: 0.02,
    sensoryDelay: { type: 'uniform', min: 150, max: 250 },
    motorDelay: { type: 'uniform', min: 130, max: 210 },
    timeLimit: trialProps.duration > 0 ? trialProps.duration : 10000,
    stimOffset: trialProps.stimulusDuration ?? trialProps.duration ?? 2000,
    postStimStrategy: { type: 'continue', residualDrift: 0.3, noiseMultiplier: 1.5 },
  });
  const key = mapDDMChoice(ddm.choice, trialProps.validKeys, trialProps.correctResponse);

  // Map 1/RT to confidence in [50, 100], with condition-dependent bias.
  const rt = ddm.rt ?? Infinity; // no response → slowest possible → lowest confidence
  const rtFast = 300;
  const rtSlow = (trialProps.stimulusDuration ?? trialProps.duration ?? 1500) + 500;
  const speed = 1 / rt;
  const normalized = (speed - 1 / rtSlow) / (1 / rtFast - 1 / rtSlow);
  const clamped = Math.max(0, Math.min(1, normalized));
  const bias = CONFIDENCE_BIAS[CONDITION] ?? 0;
  const noise = CONFIDENCE_NOISE[CONDITION] ?? 5;
  const lastConf = Math.max(
    50,
    Math.min(100, Math.round(50 + 50 * clamped + bias + uniform(-noise, noise))),
  );

  return {
    value: { rt: key ? rt : null, response: key },
    participantState: { ...participant, lastConf },
  };
};

const pickConfidence = (_trialProps: any, participant: any) => ({
  value: {
    userConfidence: participant.lastConf ?? 75,
    pickingRT: uniform(1000, 4000),
  },
  participantState: participant,
});

function generateTrialBlock(
  prefix: string,
  nTrials: number,
  { fastMode = false, breakEvery = 0 } = {},
) {
  const trialsPerCoherenceLevel = Math.ceil(nTrials / COHERENCES.length);
  const trials = shuffle(
    COHERENCES.flatMap((coherence) => {
      const trialsPerDirection = Math.max(1, Math.floor(trialsPerCoherenceLevel / 2));
      return [
        { direction: 270, correctResponse: KEY_LEFT },
        { direction: 90, correctResponse: KEY_RIGHT },
      ].flatMap(({ direction, correctResponse }) =>
        Array.from({ length: trialsPerDirection }, () => ({
          coherence,
          direction,
          correctResponse,
        })),
      );
    }),
  )
    .slice(0, nTrials)
    .flatMap(({ coherence, direction, correctResponse }, i) => {
      const trialPair = [
        {
          name: `${prefix}_rdk_${i}`,
          type: 'RandomDotKinematogram',
          props: {
            validKeys: [KEY_LEFT, KEY_RIGHT],
            responseEndsTrial: true,
            stimulusDuration: STIMDUR,
            duration: -1,
            fixationTime: 500,
            dotCount: NDOTS,
            speed: DOTSPEED,
            dotRadius: 3,
            dotColor: 'white',
            dotLifetime: DOTLIFETIME,
            apertureShape: 'circle',
            apertureWidth: 500,
            apertureHeight: 500,
            noiseMovement: NOISE_MOVEMENT,
            reinsertMode: 'opposite',
            showFixation: true,
            showBorder: true,
            borderColor: 'white',
            backgroundColor: '#21294b',
            coherence,
            direction,
            correctResponse,
            responseHint: `Press ${keyLabel(KEY_LEFT)} or ${keyLabel(KEY_RIGHT)} to respond`,
          } as RDKProps,
          simulators: { respond: rdkRespond },
        },
        {
          name: `${prefix}_feedback_${i}`,
          type: CONDITION === 'bdm' ? 'BDMReward' : 'Feedback',
          props: (data: any[]) => ({
            isUserCorrect: data[data.length - 1]?.responseData?.correct ?? false,
            showConfidencePicker: CONDITION === 'simple',
            liveLotteryFill: false,
            fastMode,
            ...(CONDITION === 'control' && { containerClass: 'bg-[#21294b]' }),
          }),
          simulators: { pickConfidence },
        },
      ];

      if (breakEvery > 0 && (i + 1) % breakEvery === 0 && i + 1 < nTrials) {
        trialPair.push({
          name: `${prefix}_break_${i}`,
          type: 'Text',
          props: {
            ...TEXT_PROPS_CENTERED,
            allowedKeys: [' ', 'Enter'],
            buttonText: '',
            content: (
              <div className='flex flex-col gap-5 leading-relaxed text-[#f5f5f5]'>
                <p>Take a short break.</p>
                <p>
                  Place your fingers on{' '}
                  <span className='inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 bg-white border border-black rounded text-black font-bold text-sm min-w-[1.5rem]'>
                    {keyLabel(KEY_LEFT)}
                  </span>{' '}
                  and{' '}
                  <span className='inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 bg-white border border-black rounded text-black font-bold text-sm min-w-[1.5rem]'>
                    {keyLabel(KEY_RIGHT)}
                  </span>{' '}
                  and press Space to continue.
                </p>
              </div>
            ),
          },
        } as any);
      }

      return trialPair;
    });

  return trials;
}

export const experiment = [
  {
    name: 'device_check',
    type: 'CheckDevice',
    props: {
      check: (info: { isMobile: boolean }) => !info.isMobile,
      content: (
        <p>
          This experiment requires a desktop or laptop computer with a keyboard. Please switch to a
          non-mobile device to participate.
        </p>
      ),
    },
  },

  {
    name: 'welcome',
    type: 'Text',
    props: {
      ...TEXT_PROPS,
      animate: true,
      content: (
        <div className='flex flex-col gap-5 leading-relaxed text-[#f5f5f5]'>
          <h1 className='text-3xl font-bold text-[#f5f5f5]'>Welcome!</h1>
          <p>
            Thank you for your interest in our study. On the next page you will find important
            information about the study and your participation. Please read it carefully before
            continuing.
          </p>
        </div>
      ),
    },
  },

  {
    name: 'consent',
    type: 'Text',
    props: {
      ...TEXT_PROPS,
      animate: true,
      buttonText: 'I agree',
      content: (
        <div className='flex flex-col gap-5 leading-relaxed text-[#f5f5f5]'>
          <h2 className='text-2xl font-bold text-[#f5f5f5]'>Participant Information</h2>
          <p>[Some legal consent talk here]</p>
          <p>
            If you agree, please click the button below. Otherwise please go back to Prolific and
            return the study so another participant can partake.
          </p>
        </div>
      ),
    },
  },

  {
    name: 'enter_fullscreen',
    type: 'EnterFullscreen',
    props: {
      ...TEXT_PROPS,
      animate: true,
      buttonText: 'Enter Fullscreen Mode',
      content: (
        <p className='text-[#f5f5f5]'>
          This experiment works best in fullscreen mode. <br />
          Please click the button below to continue.
        </p>
      ),
    },
  },

  {
    name: 'overview',
    type: 'Text',
    props: {
      ...TEXT_PROPS,
      animate: true,
      content: (
        <div className='flex flex-col gap-5 leading-relaxed text-[#f5f5f5]'>
          <p>
            Thank you for participating in this study.
            {CONDITION === 'bdm'
              ? ' You will be rewarded for completing the study and can earn an additional bonus based on your performance and choices.'
              : ' You will be rewarded for completing the study.'}
          </p>
          <p>
            You will play multiple rounds of a decision game.
            {CONDITION === 'control' &&
              ' In each round, you will decide whether a cloud of dots is moving left or right (on average), after which you will receive feedback on whether your answer was correct.'}
            {CONDITION === 'simple' &&
              ' Each round consists of two parts. First, you will decide whether a cloud of dots is moving left or right (on average). Then, you will rate your confidence in this choice, after which you will see whether your answer was correct.'}
            {CONDITION === 'bdm' &&
              ' Each round consists of two parts. First, you will decide whether a cloud of dots is moving left or right (on average). Then, you will rate your confidence in this choice, after which you will receive feedback and be informed of your reward.'}
          </p>
          <p>
            In total there will be {NTRIALS} trials split into multiple blocks. This will take
            approximately 30 minutes. Please only take breaks when instructed to do so (between
            blocks) and not during the blocks.
          </p>
          {CONDITION === 'bdm' && (
            <p>
              Each round will result in its own reward (or lack thereof). To calculate your bonus,
              the software will randomly draw three rounds. The summed payoff from those three
              rounds will be your bonus payment.
            </p>
          )}
          <p>Continue on to the next page for a detailed explanation of your task!</p>
        </div>
      ),
    },
  },

  // Full tutorial on first pass
  {
    type: 'IF_BLOCK',
    cond: (_data: any, store: any) => !store?.quizAttempts,
    timeline: [
      {
        name: 'tutorial',
        type: 'Tutorial',
        props: {
          containerClass: BG_CLASS,
          theme: 'dark' as const,
          nextKey: ' ',
          backKey: false,
          slides: getTutorialSlides(CONDITION),
        },
      },
    ],
  },

  { type: 'MARKER', id: 'instructions_start' },

  // BDM-only tutorial on quiz retry (skips RDK and confidence slides)
  ...(CONDITION === 'bdm'
    ? [
        {
          type: 'IF_BLOCK',
          cond: (_data: any, store: any) => !!store?.quizAttempts,
          timeline: [
            {
              name: 'tutorial_retry',
              type: 'Tutorial',
              props: {
                containerClass: BG_CLASS,
                theme: 'dark' as const,
                nextKey: ' ',
                backKey: false,
                slides: getBDMRetrySlides(),
              },
            },
          ],
        },
      ]
    : []),

  ...generateTrialBlock('practice', NPRACTICE),

  ...(CONDITION === 'bdm'
    ? [
        {
          name: 'pre_quiz_summary',
          type: 'Text',
          props: {
            ...TEXT_PROPS,
            animate: true,
            content: <BDMSummary maxWidth='max-w-lg' />,
          },
        },

        {
          name: 'quiz',
          type: 'Quest',
          props: {
            theme: ContrastDark,
            containerClass: BG_CLASS,
            surveyJson: {
              showQuestionNumbers: true,
              pages: [
                {
                  elements: [
                    {
                      type: 'html',
                      html: `<p>Imagine you have just chosen a direction for the moving dots. You are <strong>${QUIZ.s1.confidence}%</strong> confident that your answer is correct. The computer draws the random number <strong>${QUIZ.s1.randomNumber}</strong>.</p>`,
                    },
                    {
                      name: 'q1',
                      type: 'radiogroup',
                      title: 'Which method will be chosen to determine your reward?',
                      choices: [
                        { value: 'lottery', text: 'The Lottery' },
                        { value: 'task', text: 'Whether my answer was correct' },
                      ],
                      isRequired: true,
                    },
                    {
                      name: 'q2',
                      type: 'text',
                      inputType: 'text',
                      title: 'What is your chance (out of 100) of winning the reward?',
                      isRequired: true,
                    },
                    {
                      name: 'q3',
                      type: 'text',
                      inputType: 'text',
                      title: 'What is your chance (out of 100) of receiving nothing?',
                      isRequired: true,
                    },
                    {
                      type: 'html',
                      html: `<hr/><p>Now imagine you start a new round. You chose a direction and are fairly confident your answer is correct: <strong>${QUIZ.s2.realConfidence}%</strong>. However, you mistakenly enter <strong>"${QUIZ.s2.enteredConfidence}"</strong> as your confidence. The software assumes your confidence is only ${QUIZ.s2.enteredConfidence} out of 100. The computer draws the number <strong>${QUIZ.s2.randomNumber}</strong>.</p>`,
                    },
                    {
                      name: 'q4',
                      type: 'text',
                      inputType: 'text',
                      title:
                        'In this scenario, what do you believe is the probability that your answer is correct?',
                      isRequired: true,
                    },
                    {
                      name: 'q5',
                      type: 'text',
                      inputType: 'text',
                      title: 'What is your chance of winning if the lottery is played?',
                      isRequired: true,
                    },
                    {
                      name: 'q6',
                      type: 'radiogroup',
                      title: 'Which method will be chosen to determine your reward?',
                      choices: [
                        { value: 'lottery', text: 'The Lottery' },
                        { value: 'task', text: 'Whether my answer was correct' },
                      ],
                      isRequired: true,
                    },
                  ],
                },
              ],
            },
          },
          simulators: {
            answerQuestion: (question: any, participant: any) => {
              const correct: Record<string, any> = Object.fromEntries(
                Object.entries(QUIZ.answers).map(([k, v]) => [k, String(v)]),
              );
              // 5% chance to fail the quiz on first attempt, always pass on retry
              const shouldFail = !participant.quizFailed && Math.random() < 0.05;
              const value = shouldFail ? 'wrong' : correct[question.name] ?? null;
              return {
                value,
                participantState: shouldFail ? { ...participant, quizFailed: true } : participant,
                duration: 1000,
              };
            },
          },
        },

        {
          type: 'UPDATE_STORE',
          fun: (data: any[], store: any) => {
            const quiz = data[data.length - 1]?.responseData;
            if (!quiz) return { quizPassed: false, quizAttempts: (store?.quizAttempts ?? 0) + 1 };

            const a = QUIZ.answers;
            const passed = Object.entries(a).every(([k, v]) =>
              typeof v === 'number' ? parseInt(quiz[k]) === v : quiz[k] === v,
            );

            return { quizPassed: passed, quizAttempts: (store?.quizAttempts ?? 0) + 1 };
          },
        },

        {
          type: 'IF_BLOCK',
          cond: (_data: any, store: any) => !store.quizPassed,
          timeline: [
            {
              name: 'quiz_retry',
              type: 'Text',
              props: {
                ...TEXT_PROPS,
                content: (
                  <p className='leading-relaxed text-[#f5f5f5]'>
                    Some of your answers were incorrect. This suggests you may not have fully
                    understood the reward procedure yet. You will now go through the instructions
                    and practice again before retaking the quiz.
                  </p>
                ),
              },
            },
            { type: 'IF_GOTO', cond: () => true, marker: 'instructions_start' },
          ],
        },
      ]
    : []),

  {
    name: 'practice_end',
    type: 'Text',
    props: {
      ...TEXT_PROPS_CENTERED,
      content: (
        <div className='flex flex-col gap-2 text-[#f5f5f5]'>
          <h1>Practice complete!</h1>
          <p className='leading-relaxed'>The real experiment will now begin.</p>
        </div>
      ),
    },
  },

  ...generateTrialBlock('trial', NTRIALS, { fastMode: true, breakEvery: BREAK_EVERY }),

  {
    name: 'upload',
    type: 'Upload',
    props: (_data: any, store: any) => ({
      ...TEXT_PROPS_CENTERED,
      autoUpload: false,
      sessionData: { quizAttempts: store?.quizAttempts ?? 0 },
    }),
  },
  {
    name: 'exit_fullscreen',
    type: 'ExitFullscreen',
    props: {},
  },
  {
    name: 'end',
    type: 'ProlificEnding',
    props: {
      animate: true,
      prolificCode: import.meta.env?.VITE_PROLIFIC_CODE || undefined,
    },
  },
];

export default function Experiment() {
  return (
    <ExperimentRunner
      config={config}
      timeline={experiment}
      components={{ RandomDotKinematogram, Feedback, BDMReward }}
      hybridParticipant={{ id: 0 }}
    />
  );
}

export const simulationConfig = {
  seed: 42,
  participants: Array.from({ length: 100 }, (_, i) => ({ id: i })),
};
