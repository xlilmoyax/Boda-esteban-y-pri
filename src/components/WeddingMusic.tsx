import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type PlayerState = 'loading' | 'playing' | 'paused' | 'blocked' | 'error';

interface YouTubePlayer {
  destroy: () => void;
  getPlayerState: () => number;
  pauseVideo: () => void;
  playVideo: () => void;
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, number>;
      events: {
        onReady: (event: { target: YouTubePlayer }) => void;
        onStateChange: (event: { data: number }) => void;
        onError: (event: { data: number }) => void;
        onAutoplayBlocked: () => void;
      };
    }
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    ENDED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface WeddingMusicContextValue {
  state: PlayerState;
  toggle: () => void;
}

const WeddingMusicContext = createContext<WeddingMusicContextValue>({
  state: 'loading',
  toggle: () => undefined,
});

let youtubeApiPromise: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    ) ?? document.createElement('script');
    let timeout: number;
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      window.clearTimeout(timeout);
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        youtubeApiPromise = null;
        reject(new Error('La API de YouTube no estuvo disponible.'));
      }
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      youtubeApiPromise = null;
      reject(new Error('No se pudo cargar el reproductor de YouTube.'));
    };

    timeout = window.setTimeout(() => {
      youtubeApiPromise = null;
      reject(new Error('La carga del reproductor de YouTube agotó el tiempo de espera.'));
    }, 15000);

    if (!script.src) {
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export function WeddingMusicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayerState>('loading');
  const playerRef = useRef<YouTubePlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let autoplayTimer = 0;
    const host = document.getElementById('wedding-youtube-player');
    if (!host) {
      const error = new Error('No se encontró el espacio del reproductor de música.');
      console.error(error);
      setState('error');
      return;
    }

    loadYouTubeApi()
      .then((youtube) => {
        if (cancelled) return;
        playerRef.current = new youtube.Player(host, {
          videoId: 'q25_mYOSa-Q',
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: ({ target }) => {
              if (cancelled) return;
              playerRef.current = target;
              target.playVideo();
              autoplayTimer = window.setTimeout(() => {
                if (
                  target.getPlayerState() !== youtube.PlayerState.PLAYING &&
                  target.getPlayerState() !== youtube.PlayerState.BUFFERING
                ) {
                  setState('blocked');
                }
              }, 1800);
            },
            onStateChange: ({ data }) => {
              if (data === youtube.PlayerState.PLAYING) {
                window.clearTimeout(autoplayTimer);
                setState('playing');
              } else if (data === youtube.PlayerState.PAUSED || data === youtube.PlayerState.ENDED) {
                setState('paused');
              } else if (data === youtube.PlayerState.BUFFERING) {
                setState('loading');
              }
            },
            onError: ({ data }) => {
              console.error(`YouTube no pudo reproducir la canción (código ${data}).`);
              setState('error');
            },
            onAutoplayBlocked: () => setState('blocked'),
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Error al iniciar el reproductor de música:', error);
        setState('error');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(autoplayTimer);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) {
      setState('loading');
      return;
    }

    if (
      state === 'playing' ||
      player.getPlayerState() === window.YT?.PlayerState.PLAYING ||
      player.getPlayerState() === window.YT?.PlayerState.BUFFERING
    ) {
      player.pauseVideo();
      setState('paused');
    } else {
      player.playVideo();
      setState('loading');
    }
  }, [state]);

  return (
    <WeddingMusicContext.Provider value={{ state, toggle }}>
      {children}
    </WeddingMusicContext.Provider>
  );
}

export function useWeddingMusic() {
  return useContext(WeddingMusicContext);
}
