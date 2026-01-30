/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExperimentRunner, ExperimentConfig } from '@adriansteffan/reactive';
import { RandomDotKinematogram, RDKProps } from './RandomDotKinematogram';
import { BDMReward } from './BDMReward';


const config: ExperimentConfig = { showProgressBar: false};

// Shared background color for consistent styling
const BG_COLOR = '#21294b';
// CSS class for neobrutalist grid background (defined in index.css)
const BG_CLASS = 'neo-grid-bg';


const experiment = [
  {
    name: 'introtext',
    type: 'Text',
    props: {
      buttonText: "Let's Begin",
      animate: true,
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <>
          <h1 className='text-4xl text-[#f5f5f5]'>
            <strong>Hello Reactive! </strong>
          </h1>
          <br />
          <span className="text-[#f5f5f5]">There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.</span> <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_instructions',
    type: 'Text',
    props: {
      buttonText: "Start RDK Trial",
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <>
          <h1 className='text-4xl text-[#f5f5f5]'>
            <strong>Random Dot Kinematogram</strong>
          </h1>
          <br />
          <p className="text-[#f5f5f5]">In the next trial, you will see dots moving on the screen.</p>
          <p className="text-[#f5f5f5]">Press the <strong>LEFT arrow key</strong> if dots are moving left.</p>
          <p className="text-[#f5f5f5]">Press the <strong>RIGHT arrow key</strong> if dots are moving right.</p>
          <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_trial',
    type: 'RandomDotKinematogram',
    props: {
      // Trial parameters
      validKeys: ['arrowleft', 'arrowright'],
      correctResponse: 'arrowleft',
      duration: 10000,
      responseEndsTrial: true,
      //dotLifetime: 500,

      // Motion parameters
      dotCount: 200,
      reinsertMode: 'opposite',
      direction: 240, // 90 = rightward
      coherence: 1.0,
      speed: 120,  // pixels per second
      //coherentDotColor: "blue",

      // Visual parameters
      dotRadius: 3,
      dotColor: 'white',
      backgroundColor: BG_COLOR,

      // Aperture
      apertureShape: 'circle' as const,
      apertureWidth: 600,
      apertureHeight: 600,
      updateRate: 100,

      // Display elements
      noiseMovement: 'randomDirection',
      //reassignEveryMs: 1000,  // undefined = never, 0 = every update, > 0 = every X ms
      
      //coherentDotColor: 'red',
      showFixation: true,
      showBorder: true,
      borderColor: 'white',
    }as RDKProps,
  },
  {
    name: 'bdm_reward',
    type: 'BDMReward',
    props: (data: any[]) => (
      { isUserCorrect: data[data.length - 1]?.responseData?.correct ?? false }
    ),
  },
  {
    name: 'rdk_colored_instructions',
    type: 'Text',
    props: {
      buttonText: "Try Colored Version",
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <>
          <h1 className='text-4xl text-[#f5f5f5]'>
            <strong>Colored Coherent Dots</strong>
          </h1>
          <br />
          <p className="text-[#f5f5f5]">In this trial, <strong style={{ color: 'red' }}>coherent dots will be red</strong> and noise dots will be white.</p>
          <p className="text-[#f5f5f5]">This makes it easier to see which dots are moving together.</p>
          <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_colored_trial',
    type: 'RandomDotKinematogram',
    props: {
      validKeys: ['arrowleft', 'arrowright'],
      correctResponse: 'arrowleft',
      duration: 3000,
      responseEndsTrial: true,

      dotCount: 200,
      direction: 270, // 270 = leftward
      coherence: 0.7,
      speed: 120,  // pixels per second

      dotRadius: 3,
      dotColor: 'white',
      coherentDotColor: 'red', // Coherent dots are red!
      backgroundColor: BG_COLOR,

      apertureShape: 'circle' as const,
      apertureWidth: 600,
      apertureHeight: 600,

      noiseMovement: 'randomDirection',
      reassignEveryMs: undefined,
      showFixation: true,
      showBorder: true,
      borderColor: 'white',
    },
  },
  {
    name: 'emoji_instructions',
    type: 'Text',
    props: {
      buttonText: "Try Emoji Dots!",
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <>
          <h1 className='text-4xl text-[#f5f5f5]'>
            <strong>Emoji Dots</strong>
          </h1>
          <br />
          <p className="text-[#f5f5f5]">In this trial, instead of circles, you'll see <strong>emoji bees</strong>!</p>
          <p className="text-[#f5f5f5]">Which direction are the bees flying?</p>
          <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_emoji_trial',
    type: 'RandomDotKinematogram',
    props: {
      validKeys: ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'],
      correctResponse: 'arrowup',
      duration: 3000,
      responseEndsTrial: true,

      dotCount: 100,
      direction: 0, // upward
      coherence: 0.6,
      speed: 90,  // pixels per second

      dotRadius: 5,
      dotCharacter: '🐝',          // BEE EMOJI!
      backgroundColor: BG_COLOR,

      apertureShape: 'rectangle' as const,
      apertureWidth: 800,
      apertureHeight: 500,

      noiseMovement: 'randomDirection',
      showFixation: false,
      showBorder: true,
      borderColor: '#666',
    },
  },
  {
    name: 'late_response_instructions',
    type: 'Text',
    props: {
      buttonText: "Try Late Response Trial",
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: (
        <>
          <h1 className='text-4xl text-[#f5f5f5]'>
            <strong>Late Responses Allowed</strong>
          </h1>
          <br />
          <p className="text-[#f5f5f5]">In this trial, the dots will disappear after 1 second.</p>
          <p className="text-[#f5f5f5]">However, you can <strong>still respond after they disappear</strong>.</p>
          <p className="text-[#f5f5f5]">Try waiting until after the dots vanish before pressing a key.</p>
          <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_late_response_trial',
    type: 'RandomDotKinematogram',
    props: {
      validKeys: ['arrowleft', 'arrowright'],
      correctResponse: 'arrowright',
      duration: 3000,           // Total response window: 3 seconds
      stimulusDuration: 1000,   // Dots visible for 1 second, then blank
      responseEndsTrial: true,

      dotCount: 200,
      direction: 90, // rightward
      coherence: 0.7,
      speed: 120,  // pixels per second

      dotRadius: 3,
      dotColor: 'white',
      backgroundColor: BG_COLOR,

      apertureShape: 'circle' as const,
      apertureWidth: 600,
      apertureHeight: 600,

      noiseMovement: 'randomDirection',
      showFixation: true, // Fixation remains visible after dots disappear
      showBorder: true,
      borderColor: 'white',
    },
  },
  {
    name: 'upload',
    type: 'Upload',
    props: {
      autoUpload: false,
    }
  },
  {
    name: 'finaltext',
    type: 'Text',
    props: {
      containerClass: BG_CLASS,
      className: 'text-[#f5f5f5] prose-invert prose-strong:text-[#f5f5f5]',
      content: <p className="text-[#f5f5f5]">Thank you for participating in our study, you can now close the browser window.</p>,
    },
  },
];

export default function Experiment() {
  return (
    <ExperimentRunner
      config={config}
      timeline={experiment}
      components={{ RandomDotKinematogram, BDMReward }}
    />
  );
}