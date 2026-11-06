// src/session/useGameExitStore.ts

import {
    create,
  } from "zustand";
  
  
  export type GameExitHandler =
    () =>
      void |
      Promise<void>;
  
  
  type SetGameExitOptions = {
    /*
     * Is the user currently
     * inside an active game?
     */
    active: boolean;
  
    /*
     * Used by the shared modal.
     *
     * Training drills set this
     * to true because aborting
     * counts as a loss and can
     * deduct XP.
     *
     * Assessment / Versus:
     * false.
     */
    xpPenalty?: boolean;
  
    /*
     * Game-specific cleanup
     * executed only after the
     * user confirms leaving.
     *
     * IMPORTANT:
     * The handler should NOT
     * navigate anywhere.
     *
     * NavBar performs the
     * requested navigation after
     * this handler completes.
     */
    handler?:
      GameExitHandler | null;
  };
  
  
  type GameExitState = {
    active:
      boolean;
  
    xpPenalty:
      boolean;
  
    handler:
      GameExitHandler | null;
  
  
    setGameExit:
      (
        options:
          SetGameExitOptions
      ) => void;
  
  
    clearGameExit:
      () => void;
  };
  
  
  export const useGameExitStore =
    create<GameExitState>(
      (set) => ({
        active:
          false,
  
        xpPenalty:
          false,
  
        handler:
          null,
  
  
        setGameExit: (
          {
            active,
            xpPenalty = false,
            handler = null,
          }
        ) =>
          set({
            active,
            xpPenalty,
            handler,
          }),
  
  
        clearGameExit:
          () =>
            set({
              active:
                false,
  
              xpPenalty:
                false,
  
              handler:
                null,
            }),
      })
    );