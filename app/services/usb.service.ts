import { Observable, Utils, Device } from '@nativescript/core';

declare const android: any;

export interface USBDeviceInfo {
    deviceId: number;
    productId: number;
    vendorId: number;
    deviceName: string;
    manufacturerName: string;
}

export class USBService extends Observable {
    private static instance: USBService;
    private _deviceInfo: USBDeviceInfo | null = null;
    private usbManager: any;
    private usbDevice: any;
    private usbConnection: any;
    private usbInterface: any;

    // Constantes AOA
    private static readonly AOA_GET_PROTOCOL = 51;
    private static readonly AOA_START = 53;
    private static readonly AOA_MANUFACTURER = "StackBlitz";
    private static readonly AOA_MODEL = "ONYX SYNC";
    private static readonly AOA_DESCRIPTION = "Second Display App";
    private static readonly AOA_VERSION = "1.0";
    private static readonly AOA_URI = "https://stackblitz.com";
    private static readonly AOA_SERIAL = "0000000012345678";

    static getInstance(): USBService {
        if (!USBService.instance) {
            USBService.instance = new USBService();
        }
        return USBService.instance;
    }

    constructor() {
        super();
        if (Device.os === "Android") {
            this.usbManager = Utils.android.getApplicationContext()
                .getSystemService(android.content.Context.USB_SERVICE);
        }
    }

    async checkUSBPermission(): Promise<boolean> {
        if (!this.usbDevice) {
            return false;
        }

        if (this.usbManager.hasPermission(this.usbDevice)) {
            return true;
        }

        return new Promise((resolve) => {
            const permissionIntent = android.app.PendingIntent.getBroadcast(
                Utils.android.getApplicationContext(),
                0,
                new android.content.Intent("com.onyx.sync.USB_PERMISSION"),
                android.app.PendingIntent.FLAG_MUTABLE
            );

            const receiver = new android.content.BroadcastReceiver({
                onReceive: (context: any, intent: any) => {
                    const granted = intent.getBooleanExtra(
                        this.usbManager.EXTRA_PERMISSION_GRANTED,
                        false
                    );
                    resolve(granted);
                    Utils.android.getApplicationContext().unregisterReceiver(receiver);
                }
            });

            Utils.android.getApplicationContext().registerReceiver(
                receiver,
                new android.content.IntentFilter("com.onyx.sync.USB_PERMISSION")
            );

            this.usbManager.requestPermission(this.usbDevice, permissionIntent);
        });
    }

    async findUSBDevice(): Promise<boolean> {
        const deviceList = this.usbManager.getDeviceList();
        const devices = Object.values(deviceList);

        for (const device of devices) {
            this.usbDevice = device;
            this._deviceInfo = {
                deviceId: device.getDeviceId(),
                productId: device.getProductId(),
                vendorId: device.getVendorId(),
                deviceName: device.getDeviceName(),
                manufacturerName: device.getManufacturerName()
            };
            return true;
        }

        return false;
    }

    async initializeAOA(): Promise<boolean> {
        try {
            if (!this.usbDevice) {
                return false;
            }

            // Obtenir l'interface
            const interfaceCount = this.usbDevice.getInterfaceCount();
            for (let i = 0; i < interfaceCount; i++) {
                this.usbInterface = this.usbDevice.getInterface(i);
                if (this.usbInterface) {
                    break;
                }
            }

            if (!this.usbInterface) {
                return false;
            }

            // Établir la connexion
            this.usbConnection = this.usbManager.openDevice(this.usbDevice);
            if (!this.usbConnection) {
                return false;
            }

            // Réclamer l'interface
            this.usbConnection.claimInterface(this.usbInterface, true);

            // Vérifier le protocole AOA
            const buffer = new Array(2).fill(0);
            const protocolVersion = await this.controlTransfer(
                USBService.AOA_GET_PROTOCOL,
                0,
                buffer
            );

            if (protocolVersion < 1) {
                return false;
            }

            // Envoyer les informations AOA
            await this.sendAOAString(USBService.AOA_MANUFACTURER, 0);
            await this.sendAOAString(USBService.AOA_MODEL, 1);
            await this.sendAOAString(USBService.AOA_DESCRIPTION, 2);
            await this.sendAOAString(USBService.AOA_VERSION, 3);
            await this.sendAOAString(USBService.AOA_URI, 4);
            await this.sendAOAString(USBService.AOA_SERIAL, 5);

            // Démarrer le mode accessoire
            await this.controlTransfer(USBService.AOA_START, 0, null);

            return true;
        } catch (error) {
            console.error('AOA initialization error:', error);
            return false;
        }
    }

    private async controlTransfer(
        request: number,
        value: number,
        buffer: any
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            try {
                const result = this.usbConnection.controlTransfer(
                    0xC0, // requestType
                    request,
                    value,
                    0, // index
                    buffer,
                    buffer ? buffer.length : 0,
                    1000 // timeout
                );
                resolve(result);
            } catch (error) {
                reject(error);
            }
        });
    }

    private async sendAOAString(str: string, index: number): Promise<void> {
        const buffer = new TextEncoder().encode(str);
        await this.controlTransfer(52, 0, buffer);
    }

    async startUSBConnection(): Promise<boolean> {
        try {
            const hasPermission = await this.checkUSBPermission();
            if (!hasPermission) {
                throw new Error('USB permission denied');
            }

            const deviceFound = await this.findUSBDevice();
            if (!deviceFound) {
                throw new Error('No compatible USB device found');
            }

            const aoaInitialized = await this.initializeAOA();
            if (!aoaInitialized) {
                throw new Error('Failed to initialize AOA protocol');
            }

            return true;
        } catch (error) {
            console.error('USB Connection error:', error);
            return false;
        }
    }

    async stopUSBConnection(): Promise<void> {
        if (this.usbConnection && this.usbInterface) {
            try {
                this.usbConnection.releaseInterface(this.usbInterface);
                this.usbConnection.close();
            } catch (error) {
                console.error('Error disconnecting USB:', error);
            }
        }
        
        this.usbConnection = null;
        this.usbInterface = null;
        this.usbDevice = null;
        this._deviceInfo = null;
    }

    get deviceInfo(): USBDeviceInfo | null {
        return this._deviceInfo;
    }
}