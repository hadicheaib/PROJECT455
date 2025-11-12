import { BookOpen, Code, Lock, Eye, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export const MethodologySection = () => {
  return (
    <div className="space-y-8">
      <Card className="p-8 glass-effect text-center">
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 mb-4">
          <BookOpen className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-3">
          How It Works
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Understanding LSB Steganography and XOR Encryption
        </p>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 glass-effect border-primary/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Encoding Process
            </h3>
          </div>
          <ol className="space-y-4 text-muted-foreground text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">1</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Password-Based Key Derivation</p>
                <p>Your password is run through <code className="text-xs bg-muted px-1 py-0.5 rounded">scrypt</code> (for audio) or used directly by AES-256 (for images/video/text). This produces a unique encryption key that secures your payload before embedding.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">2</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Payload Encryption</p>
                <p>Your secret message or file is encrypted. For images/video, <code className="text-xs bg-muted px-1 py-0.5 rounded">CryptoSteganography</code> applies AES-256-CBC. For audio, we use XOR with a CTR-mode stream cipher. For text, the watermark itself is password-seeded.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">3</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Carrier Preparation</p>
                <p>The carrier media is normalized: images → PNG, video → extracted first frame + audio track, audio → 16-bit PCM WAV, text → UTF-8 string. This ensures a consistent binary structure for embedding.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">4</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">LSB Embedding (or Library Call)</p>
                <p>For <strong>audio</strong>: encrypted bits replace the least significant bit of each PCM sample. Optional Hamming(7,4) ECC adds redundancy. For <strong>images/video</strong>: <code className="text-xs bg-muted px-1 py-0.5 rounded">cryptosteganography</code> hides data in pixel LSBs. For <strong>text</strong>: zero-width Unicode characters encode the watermark.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">5</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">File Reconstruction</p>
                <p>The modified carrier is rebuilt: images → saved as PNG, video → frame stitched back with FFmpeg + original audio, audio → WAV with new samples, text → appended watermark. You download the result, which looks identical to the original.</p>
              </div>
            </li>
          </ol>
        </Card>

        <Card className="p-6 glass-effect border-accent/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Decoding Process
            </h3>
          </div>
          <ol className="space-y-4 text-muted-foreground text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">1</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Carrier Analysis</p>
                <p>The stego file is parsed: images/video → <code className="text-xs bg-muted px-1 py-0.5 rounded">cryptosteganography</code> scans pixel data, audio → WAV header parsed to locate PCM samples, text → Unicode stream examined for zero-width markers. The backend identifies where the hidden data resides.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">2</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Bit Extraction</p>
                <p>LSBs are read from the carrier. For <strong>audio</strong>, each sample's lowest bit is collected. If ECC is enabled, groups of 7 bits are decoded back to 4 data bits using Hamming error correction. For <strong>images/video</strong>, the library extracts the embedded blob. For <strong>text</strong>, zero-width characters are converted to binary.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">3</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Decryption</p>
                <p>The extracted ciphertext is decrypted using the same password. For audio, the key is re-derived via <code className="text-xs bg-muted px-1 py-0.5 rounded">scrypt</code> and the XOR+CTR cipher reversed. For images/video/text, AES-256 or the library's decryption routine restores the plaintext payload.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">4</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Payload Validation & Presentation</p>
                <p>The decrypted data is checked for integrity (magic bytes, length fields). If it's a text message, it's displayed directly. If it's a file, the backend returns it as a base64-encoded blob with the original filename, and the frontend triggers a download. Wrong passwords produce gibberish or decryption failures.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">5</span>
              <div className="flex-1">
                <p className="font-semibold text-foreground mb-1">Result Delivery</p>
                <p>The API sends JSON back to the frontend: <code className="text-xs bg-muted px-1 py-0.5 rounded">{`{ message, file: { data, filename, content_type } }`}</code>. The UI displays the message in a card and/or prompts you to download the extracted file. Confetti bursts to celebrate success! 🎉</p>
              </div>
            </li>
          </ol>
        </Card>
      </div>

      <Card className="p-6 glass-effect">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-secondary/20">
            <Code className="w-5 h-5 text-secondary-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Technical Details
          </h3>
        </div>
        <div className="space-y-4 text-muted-foreground">
          <div>
            <h4 className="font-semibold text-foreground mb-2">Image Steganography (CryptoSteganography)</h4>
            <p className="text-sm">
              Carriers are normalised to lossless PNG and processed with <code>cryptosteganography</code>, which uses AES-256
              encryption under the hood. The encrypted payload is embedded into the pixel data, producing a visually identical
              image that still survives multiple saves and transfers.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Video Steganography (OpenCV + CryptoSteganography)</h4>
            <p className="text-sm">
              OpenCV extracts the first frame of the video, hides the encrypted payload using the same image pipeline, and then
              reconstructs the video stream while remuxing the original audio track via FFmpeg. Only a single frame is modified,
              keeping the resulting file lightweight and visually unchanged.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Audio Steganography (LSB with ECC)</h4>
            <p className="text-sm">
              For audio carriers we still provide classic least-significant-bit embedding with optional Hamming error-correction.
              Samples are tweaked by a single bit, preserving perceptual quality while maximising payload capacity.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Text Watermarking (text_blind_watermark)</h4>
            <p className="text-sm">
              Plain text carriers receive an invisible, zero-width watermark generated by <code>text_blind_watermark</code>.
              The password-seeded watermark is appended to the text and can be copied, pasted, or transmitted without revealing
              its presence. Extraction restores the original secret message in one step.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 glass-effect border-primary/30">
        <div className="flex items-start gap-4">
          <ArrowRight className="w-6 h-6 text-primary mt-1" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Security Best Practices
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Use strong, unique encryption keys for each message</li>
              <li>• Never share keys over insecure channels</li>
              <li>• Keep your stego files secure - they contain hidden information</li>
              <li>• Remember: Steganography provides concealment, not encryption alone</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Resources & Links Footer */}
      <Card className="p-8 glass-effect">
        <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
          Resources & Documentation
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <h4 className="font-semibold text-foreground">API Documentation</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Explore the FastAPI backend endpoints
            </p>
            <a
              href="http://localhost:3001/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              View OpenAPI Docs →
            </a>
          </div>
          <div className="text-center space-y-3">
            <h4 className="font-semibold text-foreground">Source Code</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Contribute or review the implementation
            </p>
            <a
              href="https://github.com/haf29/PROJECT455"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              GitHub Repository →
            </a>
          </div>
          <div className="text-center space-y-3">
            <h4 className="font-semibold text-foreground">Learn More</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Deep dive into steganography techniques
            </p>
            <a
              href="https://en.wikipedia.org/wiki/Steganography"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Wikipedia Article →
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};

