import type { Metadata } from "next";
import { SimulatorApp } from "@/src/components/simulator-app";

export const metadata: Metadata = {
  title: "Legacy Scoreboard Console Trainer",
  description:
    "Practice source-backed All Sport 4000 hockey and ice-rink workflows on a responsive virtual console.",
};

export default function Home() {
  return <SimulatorApp />;
}
