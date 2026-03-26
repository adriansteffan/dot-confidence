/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExperimentRunner, ExperimentConfig, getParam, shuffle } from '@adriansteffan/reactive';
import { RandomDotKinematogram, RDKCanvas, RDKProps, NoiseMovement } from './RandomDotKinematogram';
import { Feedback, BDMReward } from './feedback';

const config: ExperimentConfig = { showProgressBar: false };

const BG_CLASS = 'neo-grid-bg';
const NTRIALS = getParam('ntrials', 50, 'number', 'Number of trials to show');
const STIMDUR = getParam('stimdur', 2000, 'number', 'Stimulus duration in milliseconds');

const CONDITIONS = ['control', 'simple', 'bdm'] as const;
const CONDITION = getParam(
  'condition',
  CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)],
  'string',
  'Feedback condition (control, simple, bdm)',
);

const NDOTS = getParam('ndots', 200, 'number', 'Number of dots to display');
const COHERENCES = getParam(
  'coherences',
  [0.05, 0.15, 0.25, 0.35, 0.5],
  'json',
  'List of coherence levels',
) as number[];

const DOTLIFETIME = getParam('dotlifetime', 100, 'number', 'Dot lifetime in milliseconds');
const DOTSPEED = getParam('dotspeed', 120, 'number', 'Dot speed in pixels per second');

const NOISE_MOVEMENT = getParam(
  'noiseMovement',
  'randomDirection',
  'string',
  'Noise dot movement type (randomDirection, randomWalk, randomTeleport)',
) as NoiseMovement;

const KEY_LEFT = getParam('key_left', 'arrowleft', 'string', 'Key for leftward response');
const KEY_RIGHT = getParam('key_right', 'arrowright', 'string', 'Key for rightward response');

const KEY_LABELS: Record<string, string> = {
  arrowleft: '←',
  arrowright: '→',
  arrowup: '↑',
  arrowdown: '↓',
  ' ': 'Space',
  enter: 'Enter',
  tab: 'Tab',
};
const keyLabel = (key: string) => KEY_LABELS[key.toLowerCase()] ?? key.toUpperCase();

const trialsPerCoherence = Math.floor(NTRIALS / COHERENCES.length);

const experiment = [
  {
    name: 'intro',
    type: 'Text',
    props: {
      buttonText: 'Start',
      animate: true,
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <div className='text-[#f5f5f5]'>
          <h1 className='text-4xl'>
            <strong>Instructions</strong>
          </h1>
          <br />
          <p>
            You will see a cloud of dots like the one below. Some dots move together in one
            direction, while the rest move randomly.
          </p>
          <div className='flex justify-center my-4'>
            <RDKCanvas
              width={300}
              height={300}
              apertureWidth={250}
              apertureHeight={250}
              apertureShape='circle'
              coherence={0.5}
              direction={90}
              dotCount={NDOTS / 1.5}
              speed={DOTSPEED / 2}
              dotRadius={2}
              dotColor='white'
              dotLifetime={DOTLIFETIME}
              noiseMovement={NOISE_MOVEMENT}
              backgroundColor='#21294b'
              showBorder
              borderColor='white'
              reinsertMode='opposite'
            />
          </div>
          <p>
            Your job is to decide whether the dots are moving <strong>left</strong> or{' '}
            <strong>right</strong>.
          </p>
          <p>
            Press <strong>{keyLabel(KEY_LEFT)}</strong> if dots move left,{' '}
            <strong>{keyLabel(KEY_RIGHT)}</strong> if dots move right.
          </p>
        </div>
      ),
    },
  },

  ...shuffle(
    COHERENCES.flatMap((coherence) => {
      const trialsPerDirection = Math.floor(trialsPerCoherence / 2);
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
  ).flatMap(({ coherence, direction, correctResponse }, i) => [
    {
      name: `rdk_${i}`,
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
    },
    {
      name: `feedback_${i}`,
      type: CONDITION === 'bdm' ? 'BDMReward' : 'Feedback',
      props: (data: any[]) => ({
        isUserCorrect: data[data.length - 1]?.responseData?.correct ?? false,
        showConfidencePicker: CONDITION === 'simple',
        liveLotteryFill: false,
        fastMode: true,
      }),
    },
  ]),

  {
    name: 'upload',
    type: 'Upload',
    props: { autoUpload: false },
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
      components={{ RandomDotKinematogram, Feedback, BDMReward }}
    />
  );
}
