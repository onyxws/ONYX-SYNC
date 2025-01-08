import { Observable } from '@nativescript/core';
import { USBService } from './usb.service';

export class ConnectionService extends Observable {
    private static instance: ConnectionService;
    private _isConnected: boolean = false;
    private _currentLatency: number = 0;
    private usbService: USBService;

    static getInstance(): ConnectionService {
        if (!ConnectionService.instance) {
            ConnectionService.instance = new ConnectionService();
        }
        return ConnectionService.instance;
    }

    constructor() {
        super();
        this.usbService = USBService.getInstance();
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    get currentLatency(): number {
        return this._currentLatency;
    }

    async connectViaUSB(): Promise<boolean> {
        try {
            const connected = await this.usbService.startUSBConnection();
            if (connected) {
                this._isConnected = true;
                this.notifyPropertyChange('isConnected', true);
                this.startLatencyMeasurement();
            }
            return connected;
        } catch (error) {
            console.error('USB Connection error:', error);
            return false;
        }
    }

    async connectViaWiFi(): Promise<boolean> {
        // TODO: Implement WiFi connection logic
        console.log('Attempting WiFi connection...');
        return false;
    }

    async disconnect(): Promise<void> {
        if (this._isConnected) {
            await this.usbService.stopUSBConnection();
            this._isConnected = false;
            this.notifyPropertyChange('isConnected', false);
            this.stopLatencyMeasurement();
        }
    }

    private startLatencyMeasurement(): void {
        // Mesure de latence toutes les secondes
        setInterval(() => this.measureLatency(), 1000);
    }

    private stopLatencyMeasurement(): void {
        // TODO: Clear interval when implemented
    }

    private measureLatency(): void {
        // TODO: Implement actual latency measurement
        this._currentLatency = Math.floor(Math.random() * 20); // Simulation pour le moment
        this.notifyPropertyChange('currentLatency', this._currentLatency);
    }
}