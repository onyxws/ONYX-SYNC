import { Application } from '@nativescript/core';
import { initializeLogging } from './services/logging.service';

// Initialize logging service
initializeLogging();

Application.run({ moduleName: 'app-root' });