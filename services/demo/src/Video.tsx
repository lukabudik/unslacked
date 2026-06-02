import React from "react";
import { AbsoluteFill, Sequence, Audio, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { scenes, TRANSITION, VO_LEAD, voClips, FPS, brand } from "./lib/theme";
import { Hook } from "./scenes/Hook";
import { World } from "./scenes/World";
import { Trace } from "./scenes/Trace";
import { Multiply } from "./scenes/Multiply";
import { Reveal } from "./scenes/Reveal";
import { Dashboard } from "./scenes/Dashboard";
import { Automations } from "./scenes/Automations";
import { Assistant } from "./scenes/Assistant";
import { Fix } from "./scenes/Fix";
import { Build } from "./scenes/Build";
import { Close } from "./scenes/Close";

const order: [keyof typeof scenes, React.FC][] = [
  ["hook", Hook],
  ["world", World],
  ["trace", Trace],
  ["multiply", Multiply],
  ["reveal", Reveal],
  ["dashboard", Dashboard],
  ["automations", Automations],
  ["assistant", Assistant],
  ["fix", Fix],
  ["build", Build],
  ["close", Close],
];

export const TOTAL =
  Object.values(scenes).reduce((a, b) => a + b, 0) - (order.length - 1) * TRANSITION;

// absolute start frame of each scene, accounting for the crossfade overlaps
const starts: Record<string, number> = {};
let acc = 0;
order.forEach(([key], i) => {
  starts[key] = acc;
  acc += scenes[key] - (i < order.length - 1 ? TRANSITION : 0);
});

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: brand.bg }}>
      <TransitionSeries>
        {order.flatMap(([key, Comp], i) => {
          const nodes = [
            <TransitionSeries.Sequence key={key} durationInFrames={scenes[key]}>
              <Comp />
            </TransitionSeries.Sequence>,
          ];
          if (i < order.length - 1) {
            nodes.push(
              <TransitionSeries.Transition
                key={`t-${key}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION })}
              />
            );
          }
          return nodes;
        })}
      </TransitionSeries>

      {/* voiceover — parallel layer, each clip at its scene start + lead-in */}
      {order.map(([key]) => {
        const clip = voClips[key];
        if (!clip) return null;
        return (
          <Sequence key={`vo-${key}`} from={starts[key] + Math.round(VO_LEAD * FPS)} durationInFrames={Math.ceil(clip.duration * FPS) + 4}>
            <Audio src={staticFile(clip.file)} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
