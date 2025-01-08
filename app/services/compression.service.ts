import { Observable } from '@nativescript/core';

export interface CompressedData {
    buffer: ArrayBuffer;
    originalSize: number;
    compressedSize: number;
}

export class CompressionService extends Observable {
    private static instance: CompressionService;
    
    static getInstance(): CompressionService {
        if (!CompressionService.instance) {
            CompressionService.instance = new CompressionService();
        }
        return CompressionService.instance;
    }

    async compressFrame(data: ArrayBuffer): Promise<CompressedData> {
        // Implémentation de RLE (Run-Length Encoding) pour la compression
        const input = new Uint32Array(data);
        const output = new Uint32Array(input.length * 2); // Pire cas
        let outputIndex = 0;
        let count = 1;

        for (let i = 1; i <= input.length; i++) {
            if (i < input.length && input[i] === input[i - 1]) {
                count++;
            } else {
                // Store count and value
                output[outputIndex++] = count;
                output[outputIndex++] = input[i - 1];
                count = 1;
            }
        }

        const compressedBuffer = output.buffer.slice(0, outputIndex * 4);
        
        return {
            buffer: compressedBuffer,
            originalSize: data.byteLength,
            compressedSize: compressedBuffer.byteLength
        };
    }

    async decompressFrame(compressed: CompressedData): Promise<ArrayBuffer> {
        const input = new Uint32Array(compressed.buffer);
        const output = new Uint32Array(compressed.originalSize / 4);
        let outputIndex = 0;

        for (let i = 0; i < input.length; i += 2) {
            const count = input[i];
            const value = input[i + 1];
            
            for (let j = 0; j < count; j++) {
                output[outputIndex++] = value;
            }
        }

        return output.buffer;
    }
}