(process.env as any).NODE_ENV = 'test';
(process.env as any).TEST_ENV = 'true';

import './scanner.test';
import './milestone3.test';
import './milestone4.test';
import './milestone4_5.test';
