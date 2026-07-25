"use client";

import { useEffect, useRef } from "react";

import {
  createArenaHornController,
  selectHornPlaybackAction,
  type ArenaHornController,
  type HornPlaybackState,
} from "./arena-horn";

const createController = (): ArenaHornController | null => {
  if (typeof window === "undefined") {
    return null;
  }

  return createArenaHornController(window.AudioContext);
};

export function useArenaHorn(state: HornPlaybackState) {
  const controller = useRef<ArenaHornController | null>(null);
  const previousState = useRef(state);

  const getController = () => {
    controller.current ??= createController();
    return controller.current;
  };

  const unlockHornAudio = (force = false) => {
    if (state.enabled || force) {
      getController()?.unlock();
    }
  };

  useEffect(() => {
    const action = selectHornPlaybackAction(previousState.current, state);
    previousState.current = state;
    if (!action) {
      return;
    }

    if (action === "start") {
      getController()?.start();
    } else if (action === "stop") {
      controller.current?.stop();
    } else if (action === "burst") {
      getController()?.burst();
    } else if (action === "stop-and-burst") {
      const horn = getController();
      horn?.stop();
      horn?.burst();
    }
  }, [state]);

  useEffect(
    () => () => {
      controller.current?.dispose();
      controller.current = null;
    },
    [],
  );

  return unlockHornAudio;
}
