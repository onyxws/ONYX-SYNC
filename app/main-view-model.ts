import { Observable } from '@nativescript/core';
import { ConnectionService } from './services/connection.service';
import { USBService, USBDeviceInfo } from './services/usb.service';
import { DisplayService, DisplayMetrics } from './services/display.service';

export class MainViewModel extends Observable {
    private connectionService: ConnectionService;
    private usbService: USBService;
    private displayService: DisplayService;
    private _statusMessage: string;
    private _displayMetrics: DisplayMetrics;
    
    constructor() {
        super();
        this.connectionService = ConnectionService.getInstance();
        this.usbService = USBService.getInstance();
        this.displayService = DisplayService.getInstance();
        this._statusMessage = 'Ready to connect';
        this._displayMetrics = {
            fps: 0,
            compressionRatio: 1,
            latency: 0
        };

        // Mise à jour des métriques d'affichage
        setInterval(() => {
            this._displayMetrics = this.displayService.getMetrics();
            this.notifyPropertyChange('displayMetrics', this._displayMetrics);
        }, 1000);
    }

    get isConnected(): boolean {
        return this.connectionService.isConnected;
    }

    get latency(): number {
        return this._displayMetrics.latency;
    }

    get fps(): number {
        return this._displayMetrics.fps;
    }

    get compressionRatio(): number {
        return this._displayMetrics.compressionRatio;
    }

    get statusMessage(): string {
        return this._statusMessage;
    }

    get deviceInfo(): USBDeviceInfo | null {
        return this.usbService.deviceInfo;
    }

    set statusMessage(value: string) {
        if (this._statusMessage !== value) {
            this._statusMessage = value;
            this.notifyPropertyChange('statusMessage', value);
        }
    }

    async connectViaUSB() {
        this.statusMessage = 'Attempting USB connection...';
        try {
            const connected = await this.connectionService.connectViaUSB();
            if (connected) {
                const device = this.deviceInfo;
                this.statusMessage = `Connected via USB to ${device?.manufacturerName} ${device?.deviceName}`;
                await this.displayService.startDisplayStream();
            } else {
                this.statusMessage = 'USB connection failed';
            }
        } catch (error) {
            this.statusMessage = `Connection error: ${error.message}`;
        }
    }

    async connectViaWiFi() {
        this.statusMessage = 'Attempting Wi-Fi connection...';
        try {
            const connected = await this.connectionService.connectViaWiFi();
            this.statusMessage = connected ? 'Connected via Wi-Fi' : 'Wi-Fi connection failed';
        } catch (error) {
            this.statusMessage = `Connection error: ${error.message}`;
        }
    }
}