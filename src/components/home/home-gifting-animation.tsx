"use client";

import { Player, Thumbnail } from "@remotion/player";
import { useSyncExternalStore } from "react";

import { HomepageGifting } from "@/remotion/root";

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function prefersReducedMotion() {
  return window.matchMedia(motionQuery).matches;
}

export function HomeGiftingAnimation() {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    () => true,
  );

  return reducedMotion ? (
    <Thumbnail
      component={HomepageGifting}
      durationInFrames={180}
      frameToDisplay={96}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
      style={{ width: "100%", aspectRatio: "16 / 9" }}
    />
  ) : (
    <Player
      component={HomepageGifting}
      durationInFrames={180}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
      autoPlay
      initiallyMuted
      loop
      clickToPlay={false}
      doubleClickToFullscreen={false}
      style={{ width: "100%", aspectRatio: "16 / 9" }}
    />
  );
}
