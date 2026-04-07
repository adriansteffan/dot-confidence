import { ComponentProps } from 'react';
import { getParam, RDKCanvas, NoiseMovement } from '@adriansteffan/reactive';


export const NDOTS = getParam('ndots', 200, 'number', 'Number of dots to display');
export const DOTLIFETIME = getParam('dotlifetime', 100, 'number', 'Dot lifetime in milliseconds');
export const DOTSPEED = getParam('dotspeed', 120, 'number', 'Dot speed in pixels per second');

export const NOISE_MOVEMENT = getParam(
  'noiseMovement',
  'randomDirection',
  'string',
  'Noise dot movement type (randomDirection, randomWalk, randomTeleport)',
) as NoiseMovement;

export const KEY_LEFT = getParam('key_left', 'arrowleft', 'string', 'Key for leftward response');
export const KEY_RIGHT = getParam('key_right', 'arrowright', 'string', 'Key for rightward response');

export const KEY_LABELS: Record<string, string> = {
  arrowleft: '<',
  arrowright: '>',
  arrowup: '^',
  arrowdown: 'v',
  ' ': 'Space',
  enter: 'Enter',
  tab: 'Tab',
};
export const keyLabel = (key: string) => KEY_LABELS[key.toLowerCase()] ?? key.toUpperCase();

/** Reusable small RDK for tutorial slides. Accepts overrides for any RDKCanvas prop. */
export const DemoRDK = (props: Partial<ComponentProps<typeof RDKCanvas>>) => (
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
    {...props}
  />
);
