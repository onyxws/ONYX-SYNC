import { Device } from '@nativescript/core';

export function initializeLogging() {
    console.log('Device Info:');
    console.log(`OS: ${Device.os}`);
    console.log(`OS Version: ${Device.osVersion}`);
    console.log(`Device Type: ${Device.deviceType}`);
    console.log(`Screen Width: ${Device.screenWidth}`);
    console.log(`Screen Height: ${Device.screenHeight}`);
}