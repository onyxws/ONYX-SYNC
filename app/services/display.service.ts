import { Observable, Screen } from '@nativescript/core';
import { USBService } from './usb.service';
import { CompressionService, CompressedData } from './compression.service';
import { ScreenCaptureService, ScreenCaptureConfig } from './screen-capture.service';

export interface DisplayData {
    width: number;
    height: number;
    buffer: ArrayBuffer;
    timestamp: number;
}

export interface DisplayMetrics {
    fps: number;
    compressionRatio: number;
    latency: number;
}

export class DisplayService extends Observable {
    private static instance: DisplayService;
    private usbService: USBService;
    private compressionService: CompressionService;
    private screenCaptureService: ScreenCaptureService;
    private displayWidth: number = Screen.mainScreen.widthPixels;
    private displayHeight: number = Screen.mainScreen.heightPixels;
    private isStreaming: boolean = false;
    private metrics: DisplayMetrics = {
        fps: 0,
        compressionRatio: 1,
        latency: 0
    };
    private frameCount: number = 0;
    private lastFPSUpdate: number = Date.now();

    static getInstance(): DisplayService {
        if (!DisplayService.instance) {
            DisplayService.instance = new DisplayService();
        }
        return DisplayService.instance;
    }

    constructor() {
        super();
        this.usbService = USBService.getInstance();
        this.compressionService = CompressionService.getInstance();
        this.screenCaptureService = ScreenCaptureService.getInstance();
        setInterval(() => this.updateMetrics(), 1000);
    }

    async startDisplayStream(): Promise<boolean> {
        if (!this.usbService.isConnected) {
            return false;
        }

        // Demander la permission de capture d'écran
        const hasPermission = await this.screenCaptureService.requestCapturePermission();
        if (!hasPermission) {
            return false;
        }

        // Configurer et démarrer la capture
        const config: ScreenCaptureConfig = {
            width: this.displayWidth,
            height: this.displayHeight,
            dpi: Screen.mainScreen.scale * 160
        };

        await this.screenCaptureService.startCapture(config);
        this.isStreaming = true;
        this.streamLoop();
        return true;
    }

    stopDisplayStream(): void {
        this.isStreaming = false;
        this.screenCaptureService.stopCapture();
    }

    getMetrics(): DisplayMetrics {
        return { ...this.metrics };
    }

    private async streamLoop(): Promise<void> {
        while (this.isStreaming) {
            try {
                const startTime = Date.now();
                const displayData = await this.captureDisplay();
                
                if (displayData && displayData.buffer) {
                    const compressed = await this.compressionService.compressFrame(displayData.buffer);
                    await this.sendDisplayData(displayData, compressed);
                    
                    this.frameCount++;
                    this.metrics.latency = Date.now() - startTime;
                    this.metrics.compressionRatio = compressed.originalSize / compressed.compressedSize;
                }
                
                await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
            } catch (error) {
                console.error('Display streaming error:', error);
                this.isStreaming = false;
            }
        }
    }

    private async captureDisplay(): Promise<DisplayData | null> {
        const buffer = await this.screenCaptureService.captureFrame();
        if (!buffer) {
            return null;
        }

        return {
            width: this.displayWidth,
            height: this.displayHeight,
            buffer: buffer,
            timestamp: Date.now()
        };
    }

    private async sendDisplayData(data: DisplayData, compressed: CompressedData): Promise<void> {
        const header = new ArrayBuffer(24);
        const headerView = new DataView(header);
        headerView.setInt32(0, data.width, true);
        headerView.setInt32(4, data.height, true);
        headerView.setFloat64(8, data.timestamp, true);
        headerView.setInt32(16, compressed.originalSize, true);
        headerView.setInt32(20, compressed.compressedSize, true);

        // TODO: Implement actual USB data transfer
        console.log('Sending display data:', {
            width: data.width,
            height: data.height,
            timestamp: data.timestamp,
            originalSize: compressed.originalSize,
            compressedSize: compressed.compressedSize,
            compressionRatio: compressed.originalSize / compressed.compressedSize
        });
    }

    private updateMetrics(): void {
        const now = Date.now();
        const elapsed = (now - this.lastFPSUpdate) / 1000;
        
        this.metrics.fps = Math.round(this.frameCount / elapsed);
        this.frameCount = 0;
        this.lastFPSUpdate = now;
        
        this.notifyPropertyChange('metrics', this.getMetrics());
    }
}