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

    await user.click(screen.getByRole("button", { name: "Home score plus 1" }));
    await user.click(
      screen.getByRole("button", { name: "Home shots on goal plus 1" }),
    );

    expect(screen.getByTestId("home-score")).toHaveTextContent("1");
    expect(screen.getByTestId("home-shots")).toHaveTextContent("1");
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
});
