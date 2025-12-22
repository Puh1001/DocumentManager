"use client";

import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadProgressProps {
  open: boolean;
  fileName: string;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // seconds
  onCancel?: () => void;
}

export function UploadProgress({
  open,
  fileName,
  percentage,
  speed,
  eta,
  onCancel,
}: UploadProgressProps) {
  const formatSpeed = (bytesPerSecond: number): string => {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Đang upload
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">{fileName}</p>
            <Progress value={percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{percentage}%</span>
              <span>{formatSpeed(speed)}</span>
              <span>ETA: {formatTime(eta)}</span>
            </div>
          </div>
          {onCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Hủy upload
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
