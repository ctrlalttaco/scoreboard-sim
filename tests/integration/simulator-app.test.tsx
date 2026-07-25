import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SimulatorApp } from "@/src/components/simulator-app";

describe("hockey simulator application", () => {
  it("presents hockey and selectable ice-rink configurations", () => {
    render(<SimulatorApp />);

    expect(
      screen.getByRole("heading", {
        name: "Legacy Scoreboard Console Trainer",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Rink configuration")).toHaveValue(
      "hockey-sog-game",
    );
    expect(screen.queryByText(/basketball/i)).not.toBeInTheDocument();
  });

  it("routes a goal and shot through the hockey engine", async () => {
    const user = userEvent.setup();
    render(<SimulatorApp />);

    await user.click(screen.getByRole("button", { name: "Enter" }));
    await user.click(screen.getByRole("button", { name: "Home score plus 1" }));
    await user.click(
      screen.getByRole("button", { name: "Home shots on goal plus 1" }),
    );

    expect(screen.getByTestId("home-score")).toHaveTextContent("1");
    expect(screen.getByTestId("home-shots")).toHaveTextContent("1");
  });

  it("configures the controller from scratch with a game code", async () => {
    const user = userEvent.setup();
    render(<SimulatorApp />);

    expect(screen.getByTestId("lcd-line-1")).toHaveTextContent("RESUME GAME?");
    expect(
      screen.getByRole("button", { name: "Home score plus 1" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reset session" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Complete controller startup first."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));
    await user.click(screen.getByRole("button", { name: "Digit 6" }));
    await user.click(screen.getByRole("button", { name: "Digit 2" }));
    await user.click(screen.getByRole("button", { name: "Enter" }));

    expect(screen.getByText("CODE 62 · LL-2274")).toBeInTheDocument();
    expect(screen.getByLabelText("Rink configuration")).toHaveValue(
      "hockey-no-sog",
    );
    expect(
      screen.getByRole("button", { name: "Home score plus 1" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Reset session" })).toBeEnabled();
  });

  it("switches to an ice-session timer configuration", async () => {
    const user = userEvent.setup();
    render(<SimulatorApp />);

    await user.selectOptions(
      screen.getByLabelText("Rink configuration"),
      "ice-session-timer",
    );

    expect(screen.getByText("CODE 96 · LL-2270")).toBeInTheDocument();
    expect(screen.getByTestId("scoreboard")).toHaveAttribute(
      "data-mode",
      "rink-timer",
    );
  });

  it("lets an operator mute and restore the horn sound", async () => {
    const user = userEvent.setup();
    const originalAudioContext = window.AudioContext;
    let audioContextCreations = 0;
    class UnavailableAudioContext {
      constructor() {
        audioContextCreations += 1;
        throw new Error("audio unavailable");
      }
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: UnavailableAudioContext,
    });

    try {
      render(<SimulatorApp />);

      const soundControl = screen.getByRole("button", {
        name: "Mute horn sound",
      });
      expect(soundControl).toHaveAttribute("aria-pressed", "true");

      await user.click(soundControl);

      expect(
        screen.getByRole("button", { name: "Enable horn sound" }),
      ).toHaveAttribute("aria-pressed", "false");
      expect(audioContextCreations).toBe(0);

      await user.click(
        screen.getByRole("button", { name: "Enable horn sound" }),
      );

      expect(audioContextCreations).toBe(1);
    } finally {
      Object.defineProperty(window, "AudioContext", {
        configurable: true,
        value: originalAudioContext,
      });
    }
  });
});
