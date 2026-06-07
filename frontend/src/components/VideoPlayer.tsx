import { ExternalLink } from 'lucide-react';

type VideoPlayerProps = {
  videoUrl: string;
  title: string;
  startAtSeconds?: number;
  onProgress?: (currentSeconds: number, durationSeconds: number) => void;
  onEnded?: (durationSeconds: number) => void;
};

function getYoutubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '').trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (parsed.hostname.includes('youtube.com')) {
      const videoId = parsed.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;

      const parts = parsed.pathname.split('/').filter(Boolean);
      const embedIndex = parts.findIndex((part) => part === 'embed' || part === 'shorts');
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getVimeoEmbed(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('vimeo.com')) return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const id = segments.find((segment) => /^\d+$/.test(segment));
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url);
}

export default function VideoPlayer({ videoUrl, title, startAtSeconds = 0, onProgress, onEnded }: VideoPlayerProps) {
  const youtubeEmbed = getYoutubeEmbed(videoUrl);
  const vimeoEmbed = getVimeoEmbed(videoUrl);
  const embedUrl = youtubeEmbed || vimeoEmbed;

  if (embedUrl) {
    return (
      <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
        <div className="relative pt-[56.25%]">
          <iframe
            title={title}
            src={embedUrl}
            className="absolute top-0 left-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (isDirectVideo(videoUrl)) {
    return (
      <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
        <video
          controls
          className="w-full"
          preload="metadata"
          onLoadedMetadata={(e) => {
            if (startAtSeconds > 0) {
              e.currentTarget.currentTime = startAtSeconds;
            }
          }}
          onTimeUpdate={(e) => {
            if (!onProgress) return;
            onProgress(e.currentTarget.currentTime || 0, e.currentTarget.duration || 0);
          }}
          onEnded={(e) => {
            if (!onEnded) return;
            onEnded(e.currentTarget.duration || 0);
          }}
        >
          <source src={videoUrl} />
          Seu navegador não suporta reprodução de vídeo.
        </video>
      </div>
    );
  }

  return (
    <div className="card-glass rounded-2xl p-5 border border-amber-500/20">
      <p className="text-amber-300 text-sm">Não foi possível incorporar este vídeo automaticamente.</p>
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-primary-300 hover:text-primary-200 text-sm"
      >
        Abrir vídeo em nova guia
        <ExternalLink size={14} />
      </a>
    </div>
  );
}
