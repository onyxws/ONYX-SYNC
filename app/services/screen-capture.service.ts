import { Observable, Application } from '@nativescript/core';

declare const android: any;

export interface ScreenCaptureConfig {
    width: number;
    height: number;
    dpi: number;
}

export class ScreenCaptureService extends Observable {
    private static instance: ScreenCaptureService;
    private mediaProjection: any;
    private virtualDisplay: any;
    private imageReader: any;
    private isCapturing: boolean = false;
    
    static getInstance(): ScreenCaptureService {
        if (!ScreenCaptureService.instance) {
            ScreenCaptureService.instance = new ScreenCaptureService();
        }
        return ScreenCaptureService.instance;
    }

    async requestCapturePermission(): Promise<boolean> {
        return new Promise((resolve) => {
            const context = Application.android.context;
            const mediaProjectionManager = context.getSystemService(android.content.Context.MEDIA_PROJECTION_SERVICE);
            
            const intent = mediaProjectionManager.createScreenCaptureIntent();
            const REQUEST_CODE = 1000;

            Application.android.on(Application.android.activityResultEvent, (args: any) => {
                if (args.requestCode === REQUEST_CODE) {
                    if (args.resultCode === android.app.Activity.RESULT_OK) {
                        this.mediaProjection = mediaProjectionManager.getMediaProjection(
                            args.resultCode,
                            args.intent
                        );
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });

            Application.android.foregroundActivity.startActivityForResult(intent, REQUEST_CODE);
        });
    }

    async startCapture(config: ScreenCaptureConfig): Promise<void> {
        if (!this.mediaProjection) {
            throw new Error('Media projection not initialized');
        }

        const context = Application.android.context;
        const metrics = context.getResources().getDisplayMetrics();
        
        // Créer un ImageReader pour capturer les frames
        this.imageReader = android.media.ImageReader.newInstance(
            config.width,
            config.height,
            android.graphics.PixelFormat.RGBA_8888,
            2
        );

        // Créer un affichage virtuel
        this.virtualDisplay = this.mediaProjection.createVirtualDisplay(
            'ScreenCapture',
            config.width,
            config.height,
            config.dpi,
            android.hardware.display.DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            this.imageReader.getSurface(),
            null,
            null
        );

        this.isCapturing = true;
    }

    async captureFrame(): Promise<ArrayBuffer | null> {
        if (!this.isCapturing || !this.imageReader) {
            return null;
        }

        return new Promise((resolve) => {
            const image = this.imageReader.acquireLatestImage();
            if (!image) {
                resolve(null);
                return;
            }

            try {
                const planes = image.getPlanes();
                const buffer = planes[0].getBuffer();
                const pixelStride = planes[0].getPixelStride();
                const rowStride = planes[0].getRowStride();
                const rowPadding = rowStride - pixelStride * image.getWidth();

                // Créer un nouveau buffer sans le padding
                const data = new ArrayBuffer(image.getWidth() * image.getHeight() * 4);
                const pixelArray = new Uint8Array(data);
                let offset = 0;

                for (let y = 0; y < image.getHeight(); y++) {
                    for (let x = 0; x < image.getWidth(); x++) {
                        const pixel = buffer.get(y * rowStride + x * pixelStride);
                        pixelArray[offset++] = pixel;
                    }
                }

                resolve(data);
            } finally {
                image.close();
            }
        });
    }

    stopCapture(): void {
        if (this.virtualDisplay) {
            this.virtualDisplay.release();
            this.virtualDisplay = null;
        }
        
        if (this.imageReader) {
            this.imageReader.close();
            this.imageReader = null;
        }
        
        if (this.mediaProjection) {
            this.mediaProjection.stop();
            this.mediaProjection = null;
        }

        this.isCapturing = false;
    }
}