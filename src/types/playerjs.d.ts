interface BunnyPlayerTimeUpdateData {
  seconds?: number;
  duration?: number;
}

interface BunnyPlayerInstance {
  on: (event: string, callback: (data?: BunnyPlayerTimeUpdateData) => void) => void;
  off: (event: string, callback?: (data?: BunnyPlayerTimeUpdateData) => void) => void;
  play: () => void;
  pause: () => void;
  setCurrentTime: (seconds: number) => void;
  setPlaybackRate?: (rate: number) => void;
  getCurrentTime: (callback: (seconds: number) => void) => void;
  getDuration: (callback: (duration: number) => void) => void;
  supports: (kind: 'method' | 'event', name: string) => boolean;
  mute?: () => void;
  unmute?: () => void;
  setVolume?: (volume: number) => void;
  getVolume?: (callback: (volume: number) => void) => void;
}

interface Window {
  playerjs?: {
    Player: new (element: HTMLIFrameElement | string) => BunnyPlayerInstance;
  };
}
