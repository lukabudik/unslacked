import React from "react";
import { Composition } from "remotion";
import { Video, TOTAL } from "./Video";
import { FPS, WIDTH, HEIGHT } from "./lib/theme";
import "./lib/fonts";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Unslacked"
      component={Video}
      durationInFrames={TOTAL}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
