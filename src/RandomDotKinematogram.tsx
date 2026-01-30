import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { BaseComponentProps, shuffle } from '@adriansteffan/reactive';

// this is assigned per dot
export type NoiseMovement = 'randomTeleport' | 'randomWalk' | 'randomDirection';
type FrameMovement = 'coherent' | 'opposite' | NoiseMovement;

type ApertureShape = 'circle' | 'ellipse' | 'square' | 'rectangle';
type ReinsertType = 'random' | 'opposite' | 'oppositeSimple' | 'wrap';

// Constants for refresh rate calibration
const CALIBRATION_FRAME_COUNT = 10;
const EMA_ALPHA = 0.1; // Smoothing factor for exponential moving average

// Generate shuffled assignments with exact counts
const generateShuffledAssignments = (
  dotCount: number,
  coherence: number,
  opposite: number,
  noiseMovement: FrameMovement,
): FrameMovement[] => {
  const nCoherent = Math.floor(dotCount * coherence);
  const nOpposite = Math.floor(dotCount * opposite);
  const assignments: FrameMovement[] = [
    ...Array(nCoherent).fill('coherent' as FrameMovement),
    ...Array(nOpposite).fill('opposite' as FrameMovement),
    ...Array(dotCount - nCoherent - nOpposite).fill(noiseMovement),
  ];
  return shuffle(assignments);
};

interface Dot {
  x: number;
  y: number;
  randomDirX: number; // x and y fields are only used when a dot currently has randomDirection movement
  randomDirY: number;
  lifeCount: number;
  assignedMovement: FrameMovement;
}

interface Aperture {
  centerX: number;
  centerY: number;
  getRandomPosition(): [number, number];
  isOutside(x: number, y: number, margin: number): boolean;
  getOppositePosition(dot: Dot, dirX?: number, dirY?: number): [number, number];
  getOppositePositionSimple(dot: Dot): [number, number];
  wrap(x: number, y: number): [number, number];
  clip(ctx: CanvasRenderingContext2D): void;
  drawBorder(ctx: CanvasRenderingContext2D, color: string, lineWidth: number): void;
}

export interface RDKProps extends BaseComponentProps {
  validKeys?: string[];
  correctResponse?: string | string[];
  duration?: number;
  stimulusDuration?: number; // How long to show stimulus (defaults to duration)
  responseEndsTrial?: boolean;
  dotCount?: number;
  dotSetCount?: number;
  direction?: number;
  coherence?: number;
  opposite?: number;
  speed?: number;
  dotLifetime?: number;
  updateRate?: number;
  dotRadius?: number;
  dotCharacter?: string;
  dotColor?: string;
  coherentDotColor?: string;
  backgroundColor?: string;
  apertureShape?: ApertureShape;
  apertureWidth?: number;
  apertureHeight?: number;
  apertureCenterX?: number;
  apertureCenterY?: number;
  reinsertMode?: ReinsertType;
  noiseMovement?: NoiseMovement;
  reassignEveryMs?: number; // undefined = never, 0 = every update, > 0 = every X ms
  showFixation?: boolean;
  fixationTime?: number;
  fixationWidth?: number;
  fixationHeight?: number;
  fixationColor?: string;
  fixationThickness?: number;
  showBorder?: boolean;
  borderWidth?: number;
  borderColor?: string;
}

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const createAperture = (
  shape: ApertureShape,
  width: number,
  height: number,
  centerX: number,
  centerY: number,
): Aperture => {
  const horizontalAxis = width / 2;
  const verticalAxis = shape === 'circle' || shape === 'square' ? horizontalAxis : height / 2;

  // Toroidal wrap on bounding box - x and y wrap independently
  const wrapOnBounds = (x: number, y: number): [number, number] => {
    const w = horizontalAxis * 2;
    const h = verticalAxis * 2;
    const left = centerX - horizontalAxis;
    const top = centerY - verticalAxis;
    return [((((x - left) % w) + w) % w) + left, ((((y - top) % h) + h) % h) + top];
  };

  if (shape === 'circle' || shape === 'ellipse') {
    return {
      centerX,
      centerY,
      getRandomPosition() {
        const phi = randomBetween(-Math.PI, Math.PI);
        const rho = Math.sqrt(Math.random());
        return [
          Math.cos(phi) * rho * horizontalAxis + centerX,
          Math.sin(phi) * rho * verticalAxis + centerY,
        ];
      },
      isOutside(x, y, margin) {
        const effH = horizontalAxis + margin;
        const effV = verticalAxis + margin;
        const dx = (x - centerX) / effH;
        const dy = (y - centerY) / effV;
        return dx * dx + dy * dy > 1;
      },
      getOppositePosition(dot, dirX, dirY) {
        // Ray-ellipse intersection: find where backward ray hits far side of boundary
        if (dirX !== undefined && dirY !== undefined) {
          const dirMagSq = dirX * dirX + dirY * dirY;
          if (dirMagSq > 1e-10) {
            // Normalize direction
            const mag = Math.sqrt(dirMagSq);
            const dx = dirX / mag;
            const dy = dirY / mag;

            // Position relative to center
            const xRel = dot.x - centerX;
            const yRel = dot.y - centerY;

            // Ellipse: semi-axes squared
            const a2 = horizontalAxis * horizontalAxis;
            const b2 = verticalAxis * verticalAxis;

            // Quadratic coefficients for ray-ellipse intersection
            // Ray: P(t) = (dot.x - dx*t, dot.y - dy*t)
            const A = (dx * dx) / a2 + (dy * dy) / b2;
            const B = (xRel * dx) / a2 + (yRel * dy) / b2;
            const C = (xRel * xRel) / a2 + (yRel * yRel) / b2 - 1;

            const discriminant = B * B - A * C;
            if (discriminant >= 0) {
              // Larger root gives far intersection (entry point from other side)
              const t = (B + Math.sqrt(discriminant)) / A;
              if (t > 0 && Number.isFinite(t)) {
                return [dot.x - dx * t, dot.y - dy * t];
              }
            }
          }
        }
        // Fallback: use simple center-mirror
        return this.getOppositePositionSimple(dot);
      },
      getOppositePositionSimple(dot) {
        // Mirror through center, clamp to boundary if outside
        const mirroredX = 2 * centerX - dot.x;
        const mirroredY = 2 * centerY - dot.y;
        const mx = (mirroredX - centerX) / horizontalAxis;
        const my = (mirroredY - centerY) / verticalAxis;
        const dist = Math.sqrt(mx * mx + my * my);
        if (dist > 1) {
          return [centerX + (mx / dist) * horizontalAxis, centerY + (my / dist) * verticalAxis];
        }
        return [mirroredX, mirroredY];
      },
      wrap: wrapOnBounds,
      clip(ctx) {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, horizontalAxis, verticalAxis, 0, 0, Math.PI * 2);
        ctx.clip();
      },
      drawBorder(ctx, color, lineWidth) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.ellipse(
          centerX,
          centerY,
          horizontalAxis + lineWidth / 2,
          verticalAxis + lineWidth / 2,
          0,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      },
    };
  }

  // Rectangle or square
  return {
    centerX,
    centerY,
    getRandomPosition() {
      return [
        randomBetween(centerX - horizontalAxis, centerX + horizontalAxis),
        randomBetween(centerY - verticalAxis, centerY + verticalAxis),
      ];
    },
    isOutside(x, y, margin) {
      const effH = horizontalAxis + margin;
      const effV = verticalAxis + margin;
      return x < centerX - effH || x > centerX + effH || y < centerY - effV || y > centerY + effV;
    },
    getOppositePosition(dot, dirX, dirY) {
      // Ray-rectangle intersection using slab method
      if (dirX === undefined || dirY === undefined) {
        return this.getOppositePositionSimple(dot);
      }

      const mag = Math.sqrt(dirX * dirX + dirY * dirY);
      if (mag < 1e-10) {
        return this.getOppositePositionSimple(dot);
      }

      // Normalized backward direction (opposite of movement)
      const dx = -dirX / mag;
      const dy = -dirY / mag;

      const left = centerX - horizontalAxis;
      const right = centerX + horizontalAxis;
      const top = centerY - verticalAxis;
      const bottom = centerY + verticalAxis;

      // Compute t for each edge (Infinity when parallel to that axis)
      const tx1 = dx !== 0 ? (left - dot.x) / dx : -Infinity;
      const tx2 = dx !== 0 ? (right - dot.x) / dx : -Infinity;
      const ty1 = dy !== 0 ? (top - dot.y) / dy : -Infinity;
      const ty2 = dy !== 0 ? (bottom - dot.y) / dy : -Infinity;

      // Ray is inside rectangle when inside both slabs
      // tEnter = latest entry, tExit = earliest exit
      const tEnter = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2));
      const tExit = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));

      // Use far intersection (tExit) for reinsertion
      if (tExit > 0 && tEnter <= tExit && Number.isFinite(tExit)) {
        return [dot.x + dx * tExit, dot.y + dy * tExit];
      }

      return this.getOppositePositionSimple(dot);
    },
    getOppositePositionSimple(dot) {
      // Flip any out-of-bounds coordinate to the opposite edge
      const left = centerX - horizontalAxis;
      const right = centerX + horizontalAxis;
      const top = centerY - verticalAxis;
      const bottom = centerY + verticalAxis;

      let x = dot.x,
        y = dot.y;

      if (dot.x < left) x = right;
      else if (dot.x > right) x = left;

      if (dot.y < top) y = bottom;
      else if (dot.y > bottom) y = top;

      return [x, y];
    },
    wrap: wrapOnBounds,
    clip(ctx) {
      ctx.beginPath();
      ctx.rect(
        centerX - horizontalAxis,
        centerY - verticalAxis,
        horizontalAxis * 2,
        verticalAxis * 2,
      );
      ctx.clip();
    },
    drawBorder(ctx, color, lineWidth) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(
        centerX - horizontalAxis - lineWidth / 2,
        centerY - verticalAxis - lineWidth / 2,
        horizontalAxis * 2 + lineWidth,
        verticalAxis * 2 + lineWidth,
      );
    },
  };
};

const createDot = (
  assignedMovement: FrameMovement,
  maxDotLife: number,
  aperture: Aperture,
): Dot => {
  const [x, y] = aperture.getRandomPosition();

  // compute random direction for dots that need it
  const theta = assignedMovement === 'randomDirection' ? randomBetween(-Math.PI, Math.PI) : 0;

  return {
    x,
    y,
    randomDirX: theta ? Math.cos(theta) : 0,
    randomDirY: theta ? -Math.sin(theta) : 0,
    lifeCount: randomBetween(0, maxDotLife > 0 ? maxDotLife : 0),
    assignedMovement,
  };
};

const updateDot = (
  dot: Dot,
  distance: number,
  deltaTimeMs: number,
  maxDotLife: number,
  aperture: Aperture,
  reinsertType: ReinsertType,
  dotRadius: number,
  coherentDir: [x: number, y: number],
  reassignMovementTo?: FrameMovement,
): Dot => {
  const updated = { ...dot };
  updated.lifeCount += deltaTimeMs;

  // Check if dot's life has expired - respawn and skip movement calculation
  if (maxDotLife > 0 && updated.lifeCount >= maxDotLife) {
    [updated.x, updated.y] = aperture.getRandomPosition();
    updated.lifeCount = 0;
    return updated;
  }

  // Determine movement: use assigned method, or apply reassignment if provided
  let method = dot.assignedMovement;
  if (reassignMovementTo !== undefined) {
    method = reassignMovementTo;
    updated.assignedMovement = method;

    // Regenerate random direction if assigned to randomDirection
    if (method === 'randomDirection') {
      const theta = randomBetween(-Math.PI, Math.PI);
      updated.randomDirX = Math.cos(theta);
      updated.randomDirY = -Math.sin(theta);
    }
  }

  // Track movement direction for direction-aware reinsertion
  let moveDirX = 0;
  let moveDirY = 0;

  switch (method) {
    case 'coherent':
      moveDirX = coherentDir[0];
      moveDirY = coherentDir[1];
      break;
    case 'opposite':
      moveDirX = -coherentDir[0];
      moveDirY = -coherentDir[1];
      break;
    case 'randomTeleport':
      // Teleports to random position - no boundary check needed
      [updated.x, updated.y] = aperture.getRandomPosition();
      return updated;
    case 'randomWalk': {
      const theta = randomBetween(-Math.PI, Math.PI);
      moveDirX = Math.cos(theta);
      moveDirY = -Math.sin(theta);
      break;
    }
    case 'randomDirection':
      moveDirX = updated.randomDirX;
      moveDirY = updated.randomDirY;
      break;
  }

  // Apply movement
  updated.x += moveDirX * distance;
  updated.y += moveDirY * distance;

  // Check bounds and reinsert with direction info
  const outOfBounds = aperture.isOutside(updated.x, updated.y, dotRadius);
  if (outOfBounds) {
    if (reinsertType === 'random') {
      [updated.x, updated.y] = aperture.getRandomPosition();
    } else if (reinsertType === 'oppositeSimple') {
      [updated.x, updated.y] = aperture.getOppositePositionSimple(updated);
    } else if (reinsertType === 'opposite') {
      [updated.x, updated.y] = aperture.getOppositePosition(updated, moveDirX, moveDirY);
    } else if (reinsertType === 'wrap') {
      [updated.x, updated.y] = aperture.wrap(updated.x, updated.y);
    } else {
      throw new Error(`Unknown reinsertType: ${reinsertType satisfies never}`);
    }
  }

  return updated;
};

export const RandomDotKinematogram = ({
  next,
  store,
  // Trial control
  validKeys = [],
  correctResponse,
  duration = 1000,
  stimulusDuration, // defaults to duration if not provided
  responseEndsTrial = true,
  // Dot motion
  dotCount = 300,
  dotSetCount = 1,
  direction = 0, // degrees: 0=up, 90=right, 180=down, 270=left
  coherence = 0.5, // proportion of dots moving coherently
  opposite = 0, // proportion of dots moving opposite to coherent direction
  speed = 60, // pixels per second
  dotLifetime = -1, // milliseconds before dot is replaced (-1 = never)
  updateRate, // Hz, undefined = update every frame
  // Dot appearance
  dotRadius = 2,
  dotCharacter,
  dotColor = 'white',
  coherentDotColor,
  backgroundColor = 'gray',
  // Aperture: the visible region where dots appear (canvas fills viewport, dots clipped to aperture)
  apertureShape = 'ellipse',
  apertureWidth = 600,
  apertureHeight = 400,
  apertureCenterX = window.innerWidth / 2,
  apertureCenterY = window.innerHeight / 2,
  reinsertMode = 'opposite',
  noiseMovement = 'randomDirection',
  reassignEveryMs, // undefined = never, 0 = every update, > 0 = every X ms
  // Fixation cross
  showFixation = false,
  fixationTime = 500,
  fixationWidth = 15,
  fixationHeight = 15,
  fixationColor = 'white',
  fixationThickness = 2,
  // Border
  showBorder = false,
  borderWidth = 1,
  borderColor = 'black',
}: RDKProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // we need to track the dot animation frame id to cancel the animation on trial end / component unmount
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(); // For tracking frame delta (independent of update rate)
  const timeSinceReassignRef = useRef(0);
  const frameCountRef = useRef(0); // Count total frames rendered
  const stimulusHiddenRef = useRef(false); // Ensures stimulus hiding only triggers once
  const trialEndedRef = useRef(false); // Ensures trial end only triggers once

  // Refresh rate estimation for timing correction
  const frameIntervalsRef = useRef<number[]>([]);
  const estimatedFrameIntervalRef = useRef<number | null>(null);
  const isCalibrated = useRef(false);

  const [response, setResponse] = useState<string | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [trialEnded, setTrialEnded] = useState(false);
  const [fixationComplete, setFixationComplete] = useState(fixationTime <= 0);
  const [stimulusVisible, setStimulusVisible] = useState(true);

  const aperture = useMemo(
    () =>
      createAperture(
        apertureShape,
        apertureWidth,
        apertureHeight,
        apertureCenterX,
        apertureCenterY,
      ),
    [apertureShape, apertureWidth, apertureHeight, apertureCenterX, apertureCenterY],
  );

  // Unit vector for coherent direction (0=up, 90=right, 180=down, 270=left)
  const coherentDir = useMemo((): [number, number] => {
    const dirRad = ((90 - direction) * Math.PI) / 180;
    return [Math.cos(dirRad), -Math.sin(dirRad)];
  }, [direction]);

  const dotSetsRef = useRef<Dot[][]>([]);
  const currentSetRef = useRef(0);

  useEffect(() => {
    const nCoherent = Math.floor(dotCount * coherence);
    const nOpposite = Math.floor(dotCount * opposite);

    dotSetsRef.current = Array.from({ length: dotSetCount }, () =>
      Array.from({ length: dotCount }, (_, i) => {
        let assignedMovement: FrameMovement;
        if (i < nCoherent) assignedMovement = 'coherent';
        else if (i < nCoherent + nOpposite) assignedMovement = 'opposite';
        else assignedMovement = noiseMovement;

        return createDot(assignedMovement, dotLifetime, aperture);
      }),
    );
  }, []);

  // Initialize refresh rate estimate from store if available
  useEffect(() => {
    const refreshRate = store?._reactiveScreenRefreshRate;
    if (typeof refreshRate === 'number' && refreshRate >= 20 && refreshRate <= 300) {
      estimatedFrameIntervalRef.current = 1000 / refreshRate;
      isCalibrated.current = true;
    }
  }, [store]);

  // Drawing functions
  const drawDots = useCallback(
    (ctx: CanvasRenderingContext2D, dots: Dot[]) => {
      dots.forEach((dot) => {
        // Use coherent color if specified and dot is coherent, otherwise use default color
        const color =
          coherentDotColor && dot.assignedMovement === 'coherent' ? coherentDotColor : dotColor;
        ctx.fillStyle = color;

        if (dotCharacter) {
          // Draw character
          const fontSize = dotRadius * 2.5; // Scale font size to approximate circle size
          ctx.font = `${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dotCharacter, dot.x, dot.y);
        } else {
          // Draw circle
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    },
    [dotColor, coherentDotColor, dotRadius, dotCharacter],
  );

  const drawFixation = useCallback(
    (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
      if (!showFixation) return;

      ctx.fillStyle = fixationColor;

      ctx.fillRect(
        cx - fixationWidth,
        cy - fixationThickness / 2,
        fixationWidth * 2,
        fixationThickness,
      );

      ctx.fillRect(
        cx - fixationThickness / 2,
        cy - fixationHeight,
        fixationThickness,
        fixationHeight * 2,
      );
    },
    [showFixation, fixationColor, fixationThickness, fixationWidth, fixationHeight],
  );

  const drawBorder = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!showBorder) return;
      aperture.drawBorder(ctx, borderColor, borderWidth);
    },
    [showBorder, borderColor, borderWidth, aperture],
  );

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || trialEnded) return;

      if (lastUpdateTimeRef.current === undefined) {
        lastUpdateTimeRef.current = timestamp;
      }
      if (lastFrameTimeRef.current === undefined) {
        lastFrameTimeRef.current = timestamp;
      }

      // Calculate frame delta every frame, independent of update rate
      const frameDelta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;
      frameCountRef.current++;

      // Update refresh rate estimate (for timing correction)
      // Sanity check: ignore huge gaps (tab switching, etc.) and zero/negative deltas
      if (frameDelta > 0 && frameDelta < 500) {
        if (!isCalibrated.current) {
          // Calibration phase: collect frame intervals
          frameIntervalsRef.current.push(frameDelta);
          if (frameIntervalsRef.current.length >= CALIBRATION_FRAME_COUNT) {
            // Calculate rough median (better robustness against outliers)
            const sorted = [...frameIntervalsRef.current].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            estimatedFrameIntervalRef.current =
              sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            isCalibrated.current = true;
          }
        } else {
          // Continuous update with exponential moving average
          estimatedFrameIntervalRef.current =
            EMA_ALPHA * frameDelta + (1 - EMA_ALPHA) * estimatedFrameIntervalRef.current!;
        }
      }

      // Check trial timing
      if (startTimeRef.current !== undefined) {
        const elapsed = timestamp - startTimeRef.current;
        const halfFrameCorrection =
          isCalibrated.current && estimatedFrameIntervalRef.current
            ? estimatedFrameIntervalRef.current * 0.5
            : 0;
        const correctedElapsed = elapsed + halfFrameCorrection;

        // Hide stimulus after fixationTime + stimulusDuration
        const effectiveStimulusDuration = fixationTime + (stimulusDuration ?? duration);
        if (
          effectiveStimulusDuration > 0 &&
          !stimulusHiddenRef.current &&
          correctedElapsed >= effectiveStimulusDuration
        ) {
          stimulusHiddenRef.current = true;
          setStimulusVisible(false);
        }

        // End trial after fixationTime + duration
        const totalDuration = fixationTime + duration;
        if (duration > 0 && !trialEndedRef.current && correctedElapsed >= totalDuration) {
          trialEndedRef.current = true;
          setTrialEnded(true);
        }
      }

      const timeSinceLastUpdate = timestamp - (lastUpdateTimeRef.current ?? timestamp);
      const updateInterval = updateRate && updateRate > 0 ? 1000 / updateRate : 0;
      const shouldUpdate = !updateRate || updateRate <= 0 || timeSinceLastUpdate >= updateInterval;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (!stimulusVisible || !fixationComplete) {
        drawFixation(ctx, aperture.centerX, aperture.centerY);
      } else {
        if (shouldUpdate) {
          const distance = (speed * timeSinceLastUpdate) / 1000;

          // Determine if we should reassign dots
          let shouldReassign = false;
          if (reassignEveryMs !== undefined) {
            if (reassignEveryMs === 0) {
              shouldReassign = true;
            } else {
              timeSinceReassignRef.current += timeSinceLastUpdate;
              // Half-frame correction rounds to nearest frame rather than always late
              const halfFrameCorrection =
                isCalibrated.current && estimatedFrameIntervalRef.current
                  ? estimatedFrameIntervalRef.current * 0.5
                  : 0;
              const correctedTime = timeSinceReassignRef.current + halfFrameCorrection;
              shouldReassign = correctedTime >= reassignEveryMs;
              if (shouldReassign) {
                timeSinceReassignRef.current %= reassignEveryMs;
              }
            }
          }

          // Generate shuffled assignments if reassigning (exact counts)
          const reassignments = shouldReassign
            ? generateShuffledAssignments(dotCount, coherence, opposite, noiseMovement)
            : null;

          const currentSet = dotSetsRef.current[currentSetRef.current];
          const updatedDots = currentSet.map((dot, i) =>
            updateDot(
              dot,
              distance,
              timeSinceLastUpdate,
              dotLifetime,
              aperture,
              reinsertMode,
              dotRadius,
              coherentDir,
              reassignments?.[i],
            ),
          );
          dotSetsRef.current[currentSetRef.current] = updatedDots;

          // Cycle to next set if there is more than one set of dots
          currentSetRef.current = (currentSetRef.current + 1) % dotSetCount;
          lastUpdateTimeRef.current = timestamp;
        }

        const currentDots = dotSetsRef.current[currentSetRef.current];
        ctx.save();
        aperture.clip(ctx);
        drawDots(ctx, currentDots);

        ctx.restore();

        ctx.save();
        ctx.beginPath();
        drawFixation(ctx, aperture.centerX, aperture.centerY);
        drawBorder(ctx);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    },
    [
      trialEnded,
      stimulusVisible,
      backgroundColor,
      noiseMovement,
      coherence,
      opposite,
      dotCount,
      speed,
      dotLifetime,
      aperture,
      reinsertMode,
      dotSetCount,
      dotRadius,
      coherentDir,
      updateRate,
      duration,
      stimulusDuration,
      drawDots,
      drawFixation,
      drawBorder,
      fixationComplete,
      fixationTime,
    ],
  );

  // Handle keyboard response
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (trialEnded || response) return;

      const key = e.key.toLowerCase();
      const allowedKeys = validKeys.length > 0 ? validKeys.map((c) => c.toLowerCase()) : null;

      if (!allowedKeys || allowedKeys.includes(key)) {
        const rt = performance.now() - (startTimeRef.current ?? 0);
        setResponse(key);
        setResponseTime(rt);

        if (responseEndsTrial) {
          setTrialEnded(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [trialEnded, response, validKeys, responseEndsTrial]);

  // Start animation and timer
  useEffect(() => {
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Fixation duration delay before showing dots
  useEffect(() => {
    if (fixationTime <= 0) return;
    const timer = setTimeout(() => setFixationComplete(true), fixationTime);
    return () => clearTimeout(timer);
  }, [fixationTime]);

  // End trial and return data
  useEffect(() => {
    if (!trialEnded) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const correctKeys = Array.isArray(correctResponse)
      ? correctResponse.map((c) => c.toLowerCase())
      : correctResponse
        ? [correctResponse.toLowerCase()]
        : null;

    const framesDisplayed = frameCountRef.current;
    const measuredRefreshRate = estimatedFrameIntervalRef.current
      ? Math.round(1000 / estimatedFrameIntervalRef.current)
      : null;

    const data = {
      // Response data
      rt: responseTime,
      response,
      correct: response && correctKeys ? correctKeys.includes(response) : null,
      framesDisplayed,
      measuredRefreshRate,

      // Trial control
      validKeys,
      correctResponse,
      duration,
      stimulusDuration,
      responseEndsTrial,

      // Dot motion
      dotCount,
      dotSetCount,
      direction,
      coherence,
      opposite,
      speed,
      dotLifetime,
      updateRate,

      // Dot appearance
      dotRadius,
      dotCharacter,
      dotColor,
      coherentDotColor,
      backgroundColor,

      // Aperture
      apertureShape,
      apertureWidth,
      apertureHeight,
      apertureCenterX,
      apertureCenterY,
      reinsertMode,

      // Algorithm
      noiseMovement,
      reassignEveryMs,
    };

    next(data);
  }, [
    trialEnded,
    response,
    responseTime,
    correctResponse,
    duration,
    stimulusDuration,
    direction,
    coherence,
    next,
    validKeys,
    responseEndsTrial,
    dotCount,
    dotSetCount,
    opposite,
    speed,
    dotLifetime,
    updateRate,
    dotRadius,
    dotCharacter,
    dotColor,
    coherentDotColor,
    backgroundColor,
    apertureShape,
    apertureWidth,
    apertureHeight,
    apertureCenterX,
    apertureCenterY,
    reinsertMode,
    noiseMovement,
    reassignEveryMs,
  ]);

  // Setup canvas with retina display support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // retina fix
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', backgroundColor }} />
    </div>
  );
};
