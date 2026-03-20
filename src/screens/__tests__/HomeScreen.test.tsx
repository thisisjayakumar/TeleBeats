import { render, screen, waitFor } from "@testing-library/react-native";

import { HomeScreen } from "../HomeScreen";

describe("HomeScreen", () => {
  it("renders the TeleBeats title", async () => {
    render(
      <HomeScreen
        onSignOut={async () => {}}
        session={{ phone: "+910000000000", sessionString: "session" }}
      />
    );

    expect(screen.getByText("TeleBeats")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText(/DB backend:/)).toBeTruthy();
    });
  });
});
