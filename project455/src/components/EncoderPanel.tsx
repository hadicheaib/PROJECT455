import { useState } from "react";
import type { ChangeEvent, FC } from "react";
import { Upload, Lock, FileAudio, FileVideo, FileImage, FileText, Download, Loader2, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  encodeAudio,
  encodeVideo,
  encodeImage,
  encodeText,
  isVideoFile,
  isAudioFile,
  isImageFile,
} from "@/lib/steganography";

export const EncoderPanel: FC = () => {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [secretFile, setSecretFile] = useState<File | null>(null);
  const [key, setKey] = useState("");
  const [isEncoding, setIsEncoding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [encodedBlob, setEncodedBlob] = useState<Blob | null>(null);
  const [encodedExtension, setEncodedExtension] = useState(".wav");
  const [coverText, setCoverText] = useState("");
  const [textSecret, setTextSecret] = useState("");
  const [encodedText, setEncodedText] = useState("");
  const [isEncodingText, setIsEncodingText] = useState(false);
  const secretFileAllowed = mediaFile !== null && !isAudioFile(mediaFile);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAudioFile(file) && !isVideoFile(file) && !isImageFile(file)) {
        toast.error("Please select an audio (WAV), video (MP4, WebM, etc.), or image (PNG, JPG) file");
        return;
      }
      setMediaFile(file);
      setEncodedBlob(null);
      setEncodedText("");
      setSecretFile(null);
      const fileType = isVideoFile(file) ? "Video" : isImageFile(file) ? "Image" : "Audio";
      toast.success(`${fileType} file selected`);
    }
  };

  const handleSecretFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!mediaFile) {
      toast.error("Select a carrier file before choosing a secret file.");
      return;
    }
    if (!secretFileAllowed) {
      toast.error("Audio carriers currently support text payloads only.");
      return;
    }
    setSecretFile(file);
    setEncodedBlob(null);
    toast.success(`Secret file selected (${file.name})`);
  };

  const removeSecretFile = () => {
    setSecretFile(null);
  };

  const handleEncode = async () => {
    if (!mediaFile) {
      toast.error("Please select an audio, video, or image file");
      return;
    }
    if (!message.trim() && !secretFile) {
      toast.error("Enter a secret message or choose a secret file to embed.");
      return;
    }
    if (!key.trim()) {
      toast.error("Please enter an encryption key");
      return;
    }
    if (isAudioFile(mediaFile) && secretFile) {
      toast.error("Audio carriers currently support text payloads only.");
      return;
    }

    setIsEncoding(true);
    setProgress(0);
    setEncodedBlob(null);

    try {
      let encoded: Blob;
      if (isVideoFile(mediaFile)) {
        encoded = await encodeVideo(mediaFile, key, {
          message,
          file: secretFile,
          onProgress: (prog) => setProgress(prog),
        });
        setEncodedExtension(".mp4");
      } else if (isImageFile(mediaFile)) {
        encoded = await encodeImage(mediaFile, key, {
          message,
          file: secretFile,
          onProgress: (prog) => setProgress(prog),
        });
        setEncodedExtension(".png");
      } else {
        encoded = await encodeAudio(mediaFile, message, key, (prog) => setProgress(prog));
        setEncodedExtension(".wav");
      }
      setEncodedBlob(encoded);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success(secretFile ? "Secret file embedded successfully! ✨" : "Message encoded successfully! ✨");
    } catch (error: any) {
      console.error("Encoding error:", error);
      toast.error(error.message || "Failed to encode message");
    } finally {
      setIsEncoding(false);
    }
  };

  const handleTextEncode = async () => {
    if (!coverText.trim()) {
      toast.error("Please provide the host text that will carry the watermark");
      return;
    }
    if (!textSecret.trim()) {
      toast.error("Please enter the secret message to embed in the text");
      return;
    }
    if (!key.trim()) {
      toast.error("Please enter an encryption key");
      return;
    }

    setIsEncodingText(true);
    try {
      const watermarked = await encodeText(coverText, textSecret, key);
      setEncodedText(watermarked);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success("Watermark embedded in text! ✨");
    } catch (error: any) {
      console.error("Text watermark error:", error);
      toast.error(error.message || "Failed to embed watermark into text");
    } finally {
      setIsEncodingText(false);
    }
  };

  const handleDownload = () => {
    if (!encodedBlob || !mediaFile) return;
    const url = URL.createObjectURL(encodedBlob);
    const a = document.createElement("a");
    a.href = url;
    const extension = encodedExtension || (isVideoFile(mediaFile) ? ".mp4" : isImageFile(mediaFile) ? ".png" : ".wav");
    const originalName = mediaFile.name.split(".")[0];
    a.download = `stego_${originalName}${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Encoded file downloaded!");
  };


  const handleCopyWatermarked = async () => {
    if (!encodedText) return;
    try {
      await navigator.clipboard.writeText(encodedText);
      toast.success("Watermarked text copied to clipboard!");
    } catch (error) {
      console.error("Clipboard error:", error);
      toast.error("Failed to copy watermarked text");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8 glass-effect">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/20">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Encode Message</h2>
            <p className="text-muted-foreground">
              Hide your secret message in an audio, video, or image file
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Audio (WAV), Video (MP4, WebM, etc.), or Image (PNG, JPG) File
            </label>
            <div className="space-y-3">
              <label className="flex-1">
                <input
                  type="file"
                  accept="audio/wav,.wav,video/*,.mp4,.webm,.avi,.mov,image/png,image/jpeg,image/jpg,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-3 p-4 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 text-primary" />
                  <span className="text-foreground">
                    {mediaFile ? mediaFile.name : "Click to upload audio, video, or image file"}
                  </span>
                </div>
              </label>
              {mediaFile && (
                <Card className="p-3 glass-effect border-primary/20 animate-scale-in">
                  <div className="flex items-center gap-3">
                    {isVideoFile(mediaFile) ? (
                      <FileVideo className="w-8 h-8 text-primary" />
                    ) : isImageFile(mediaFile) ? (
                      <FileImage className="w-8 h-8 text-primary" />
                    ) : (
                      <FileAudio className="w-8 h-8 text-primary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{mediaFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(mediaFile.size / 1024).toFixed(1)} KB • {isVideoFile(mediaFile) ? "Video" : isImageFile(mediaFile) ? "Image" : "Audio"}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Message / File Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Secret Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the message you want to hide..."
                className="w-full p-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]"
                rows={4}
                disabled={Boolean(secretFile) && secretFileAllowed}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {message.length} characters
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="block text-sm font-medium text-foreground">
                  Secret File <span className="text-xs text-muted-foreground">(optional)</span>
                </span>
                {secretFile && (
                  <Button variant="ghost" size="sm" className="text-xs px-2" onClick={removeSecretFile}>
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
              <label
                className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg text-sm transition-colors ${
                  secretFileAllowed
                    ? "border-primary/20 cursor-pointer hover:border-primary/40"
                    : "border-border cursor-not-allowed opacity-70"
                }`}
              >
                <input type="file" className="hidden" onChange={handleSecretFileChange} disabled={!secretFileAllowed} />
                <Upload className="w-4 h-4 text-primary" />
                {secretFile ? secretFile.name : "Choose a file to hide (PDF, ZIP, MP3, ...)"}
              </label>
              <p className="text-xs text-muted-foreground">
                Leave the message empty if you prefer to embed a file instead. Images &amp; videos can carry files; audio currently supports text only.
              </p>
              {!secretFileAllowed && (
                <p className="text-xs text-destructive">
                  Select an image or video carrier to enable file embedding.
                </p>
              )}
            </div>
          </div>

          {/* Key Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Encryption Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter encryption key..."
              className="w-full p-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Keep this key safe! You'll need it to decode the message.
            </p>
          </div>

          {/* Encode Button */}
          <Button
            onClick={handleEncode}
            disabled={
              isEncoding ||
              !mediaFile ||
              (!message.trim() && !secretFile) ||
              !key.trim() ||
              (secretFile !== null && mediaFile !== null && isAudioFile(mediaFile))
            }
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isEncoding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Encoding... {Math.round(progress * 100)}%
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Encode Message
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {isEncoding && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress < 0.3 ? "Encrypting..." : progress < 0.7 ? "Embedding..." : "Finalizing..."}</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Button */}
          {encodedBlob && (
            <Card className="p-6 glass-effect border-primary/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Encoding Complete!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Your message has been hidden in the{" "}
                    {mediaFile
                      ? isVideoFile(mediaFile)
                        ? "video"
                        : isImageFile(mediaFile)
                        ? "image"
                        : "audio"
                      : "media"}{" "}
                    file
                  </p>
                </div>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Card>

      <Card className="p-8 glass-effect">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-secondary/20">
            <FileText className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Encode Text Watermark</h2>
            <p className="text-muted-foreground">
              Hide secrets inside plain text using invisible zero-width watermarking.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Host Text
            </label>
            <textarea
              value={coverText}
              onChange={(e) => {
                setCoverText(e.target.value);
                setEncodedText("");
              }}
              placeholder="Paste or type the paragraph that will carry the hidden message..."
              className="w-full p-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary min-h-[120px]"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-2">
              The invisible watermark will be appended to this text.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Secret Message
            </label>
            <textarea
              value={textSecret}
              onChange={(e) => {
                setTextSecret(e.target.value);
                setEncodedText("");
              }}
              placeholder="Enter the secret message you want to conceal within the host text..."
              className="w-full p-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary min-h-[100px]"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Uses the same encryption key defined above.
            </p>
          </div>

          <Button
            onClick={handleTextEncode}
            disabled={isEncodingText || !coverText.trim() || !textSecret.trim() || !key.trim()}
            size="lg"
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            {isEncodingText ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Embedding watermark...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Encode Text Watermark
              </>
            )}
          </Button>

          {encodedText && (
            <Card className="p-6 glass-effect border-secondary/50">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <FileText className="w-5 h-5 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">Watermarked Text</h3>
                  <p className="text-xs text-muted-foreground">
                    Copy and share this text. The hidden message survives copy &amp; paste.
                  </p>
                </div>
              </div>
              <textarea
                readOnly
                value={encodedText}
                className="w-full p-4 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-secondary min-h-[140px]"
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCopyWatermarked} variant="outline" className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Watermarked Text
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Card>
    </div>
  );
};