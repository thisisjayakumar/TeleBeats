import { useEffect, useState } from "react";
import { setupAudioPlayer } from "../services/audio/playerService";

export function useAppBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        await setupAudioPlayer();
      } catch (e) {
        console.error("Failed to setup audio player:", e);
      } finally {
        setIsReady(true);
      }
    }
    void bootstrap();
  }, []);

  return { isReady };
}
