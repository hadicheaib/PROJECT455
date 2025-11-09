import { Lock, Eye, Key, FileVideo, Sparkles, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

type FeatureTab = "demo" | "encode" | "decode" | "learn";

interface FeatureShowcaseProps {
  onFeatureSelect?: (tab: FeatureTab) => void;
}

export const FeatureShowcase = ({ onFeatureSelect }: FeatureShowcaseProps) => {
  const features = [
    {
      icon: Lock,
      title: "LSB Encoding",
      description: "Hide messages in the least significant bits of audio samples, making them imperceptible to human ears.",
      color: "primary",
      tab: "encode" as FeatureTab,
    },
    {
      icon: Key,
      title: "XOR Encryption",
      description: "Additional layer of security with key-based XOR encryption before embedding.",
      color: "accent",
      tab: "learn" as FeatureTab,
    },
    {
      icon: Eye,
      title: "Invisible",
      description: "No detectable changes to audio quality. Messages remain completely hidden.",
      color: "secondary",
      tab: "demo" as FeatureTab,
    },
    {
      icon: FileVideo,
      title: "Audio & Video Support",
      description: "Works with WAV audio files and video files (MP4, WebM, AVI, MOV). Full compatibility with media players.",
      color: "primary",
      tab: "encode" as FeatureTab,
    },
    {
      icon: Sparkles,
      title: "Easy to Use",
      description: "Simple interface for encoding and decoding. No technical knowledge required.",
      color: "accent",
      tab: "demo" as FeatureTab,
    },
    {
      icon: Shield,
      title: "Secure",
      description: "Key-based protection ensures only authorized users can extract messages.",
      color: "secondary",
      tab: "decode" as FeatureTab,
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need for secure audio steganography
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              primary: "bg-primary/20 text-primary",
              accent: "bg-accent/20 text-accent",
              secondary: "bg-secondary/20 text-secondary-foreground",
            };
            return (
              <Card
                key={index}
                role="button"
                tabIndex={0}
                onClick={() => onFeatureSelect?.(feature.tab)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onFeatureSelect?.(feature.tab);
                  }
                }}
                className="p-6 glass-effect border-primary/10 hover-lift transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <div className={`w-12 h-12 rounded-lg ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

