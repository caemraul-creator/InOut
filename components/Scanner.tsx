
import React, { useRef, useEffect, useState } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

interface ScannerProps {
  onScan: (sku: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
      }
    }
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const simulateScan = () => {
    // In a real app, we'd use a library like quagga or jsQR
    // For this demo, we simulate a successful scan of a random product SKU from our list
    const skus = ['LAP-001', 'MOB-001', 'MON-001', 'ACC-001'];
    const randomSku = skus[Math.floor(Math.random() * skus.length)];
    onScan(randomSku);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center text-white z-10">
        <h3 className="font-bold">Scan Barcode</h3>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {hasPermission === false ? (
          <div className="text-white text-center p-8">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Camera access denied. Please enable permissions in your settings.</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            {/* Scanner Overlay */}
            <div className="relative w-64 h-64 border-2 border-indigo-400 rounded-3xl">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 -translate-x-1 -translate-y-1"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 translate-x-1 -translate-y-1"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 -translate-x-1 translate-y-1"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 translate-x-1 translate-y-1"></div>
              
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse"></div>
            </div>
            
            <button 
              onClick={simulateScan}
              className="absolute bottom-12 px-8 py-3 bg-indigo-600 text-white rounded-full font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Simulate Scan
            </button>
          </>
        )}
      </div>
      
      <div className="p-8 bg-black/80 text-white text-center text-sm">
        Align barcode within the frame to scan
      </div>
    </div>
  );
};
