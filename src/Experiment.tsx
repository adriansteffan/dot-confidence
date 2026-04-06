/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExperimentRunner,
  ExperimentConfig,
  getParam,
  shuffle,
  RandomDotKinematogram,
  RDKProps,
  Tutorial,
  simulateDDMTrial,
  mapDDMChoice,
  uniform,
} from '@adriansteffan/reactive';
import { Feedback, BDMReward } from './feedback';
import { getTutorialSlides } from './tutorial';
import { BG_CLASS, NDOTS, DOTSPEED, DOTLIFETIME, NOISE_MOVEMENT, KEY_LEFT, KEY_RIGHT, keyLabel } from './rdk';

const config: ExperimentConfig = { showProgressBar: false };

const NTRIALS = getParam('ntrials', 50, 'number', 'Number of trials to show');
const STIMDUR = getParam('stimdur', 2000, 'number', 'Stimulus duration in milliseconds');

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
  const rt = ddm.rt;
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

function generateTrialBlock(prefix: string, nTrials: number, fastMode: boolean) {
  const trialsPerCoherenceLevel = Math.ceil(nTrials / COHERENCES.length);
  return shuffle(
    COHERENCES.flatMap((coherence) => {
      const trialsPerDirection = Math.floor(trialsPerCoherenceLevel / 2);
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
  ).slice(0, nTrials).flatMap(({ coherence, direction, correctResponse }, i) => [
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
  ]);
}

export const experiment = [
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

  // Generate a block of RDK + feedback trial pairs
  ...generateTrialBlock('practice', 10, false),

  {
    name: 'practice_end',
    type: 'Text',
    props: {
      className: `${BG_CLASS} text-[#f5f5f5]`,
      content: <p className='text-[#f5f5f5] text-xl leading-relaxed max-w-lg'>Practice complete! The real experiment will now begin. Press Space or Enter to continue.</p>,
    },
  },

  ...generateTrialBlock('trial', NTRIALS, true),

  {
    name: 'upload',
    type: 'Upload',
    props: { autoUpload: false, sessionData: { condition: CONDITION } },
  },
  {
    name: 'end',
    type: 'Text',
    props: {
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: <p className='text-[#f5f5f5]'>Thank you for participating!</p>,
    },
  },
];

export default function Experiment() {
  return (
    <ExperimentRunner
      config={config}
      timeline={experiment}
      components={{ RandomDotKinematogram, Feedback, BDMReward, Tutorial }}
      hybridParticipant={{ id: 0 }}
    />
  );
}

export const simulationConfig = {
  seed: 42,
  participants: Array.from({ length: 200 }, (_, i) => ({ id: i })),
};
