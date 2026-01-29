/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { ExperimentRunner, BaseComponentProps, ExperimentConfig } from '@adriansteffan/reactive';
import { RandomDotKinematogram, RDKProps } from './RandomDotKinematogram';


const config: ExperimentConfig = { showProgressBar: false};

const CustomTrial = ({ next, maxCount }: BaseComponentProps & { maxCount: number }) => {
  const [count, setCount] = useState(0);

  return (
    <>
      <h1 className='text-4xl'>
        <strong>Custom Component</strong>
      </h1>
      <br />
      This is a custom component component. Click the button {maxCount} times to progress
      <br />
      <button
        onClick={() => {
          setCount(count + 1);
          if (count + 1 === maxCount) {
            next({});
          }
        }}
        className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-sm hover:bg-blue-600 transition-colors'
      >
        Count: {count}
      </button>
    </>
  );
};

const CustomQuestion = () => {
  return (
    <>
      <p>This is a custom question</p>
    </>
  );
};

const experiment = [
  {
    name: 'introtext',
    type: 'Text',
    props: {
      buttonText: "Let's Begin",
      animate: true,
      content: (
        <>
          <h1 className='text-4xl'>
            <strong>Hello Reactive! </strong>
          </h1>
          <br />
          This is a basic text component. <br />
        </>
      ),
    },
  },
  {
    name: 'rdk_instructions',
    type: 'Text',
    props: {
      buttonText: "Start RDK Trial",
      content: (
        <>
          <h1 className='text-4xl'>
            <strong>Random Dot Kinematogram</strong>
          </h1>
          <br />
          <p>In the next trial, you will see dots moving on the screen.</p>
          <p>Press the <strong>LEFT arrow key</strong> if dots are moving left.</p>
          <p>Press the <strong>RIGHT arrow key</strong> if dots are moving right.</p>
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
      correctResponse: 'arrowright',
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
      backgroundColor: '#1a1a2e',  // Dark navy

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
    name: 'rdk_colored_instructions',
    type: 'Text',
    props: {
      buttonText: "Try Colored Version",
      content: (
        <>
          <h1 className='text-4xl'>
            <strong>Colored Coherent Dots</strong>
          </h1>
          <br />
          <p>In this trial, <strong style={{ color: 'red' }}>coherent dots will be red</strong> and noise dots will be white.</p>
          <p>This makes it easier to see which dots are moving together.</p>
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
      backgroundColor: '#16213e',  // Deep blue

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
      content: (
        <>
          <h1 className='text-4xl'>
            <strong>Emoji Dots 🎯</strong>
          </h1>
          <br />
          <p>In this trial, instead of circles, you'll see <strong>emoji bees 🐝</strong>!</p>
          <p>Which direction are the bees flying?</p>
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
      backgroundColor: '#e8f4f8',  // Light blue sky

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
      content: (
        <>
          <h1 className='text-4xl'>
            <strong>Late Responses Allowed</strong>
          </h1>
          <br />
          <p>In this trial, the dots will disappear after 1 second.</p>
          <p>However, you can <strong>still respond after they disappear</strong>.</p>
          <p>Try waiting until after the dots vanish before pressing a key.</p>
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
      backgroundColor: '#2d3436',  // Charcoal

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
    name: 'customtrial',
    type: 'CustomTrial',
    props: {
      maxCount: 5,
    },
  },
  {
    name: 'survey',
    type: 'Quest',
    props: {
      surveyJson: {
        pages: [
          {
            elements: [
              {
                type: 'rating',
                name: 'examplequestion',
                title: 'We can use all of the surveyjs components in the framework',
                isRequired: true,
                rateMin: 1,
                rateMax: 6,
                minRateDescription: 'Not at all',
                maxRateDescription: 'Extremely',
              },
              {
                title: 'Cutom Question',
                type: 'CustomQuestion',
              },
            ],
          },
        ],
      },
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
      content: <>Thank you for participating in our study, you can now close the browser window.</>,
    },
  },
];

export default function Experiment() {
  return (
    <ExperimentRunner
      config={config}
      timeline={experiment}
      components={{ CustomTrial, RandomDotKinematogram }}
      questions={{ CustomQuestion }}
    />
  );
}