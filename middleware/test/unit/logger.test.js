import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLogger } from '../../src/logger.js';

describe('logger module', () => {
  it('creates logger and writes structured JSON records', () => {
    const originalWrite = process.stdout.write;
    const outputs = [];
    process.stdout.write = (chunk) => {
      outputs.push(chunk);
      return true;
    };

    try {
      const log = createLogger({ level: 'info' });
      log.info('Test message', { key: 'value123' });

      assert.equal(outputs.length, 1);
      const record = JSON.parse(outputs[0]);
      assert.equal(record.level, 'info');
      assert.equal(record.msg, 'Test message');
      assert.equal(record.key, 'value123');
      assert.ok(record.time);
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('respects log level filtering', () => {
    const originalWrite = process.stdout.write;
    const outputs = [];
    process.stdout.write = (chunk) => {
      outputs.push(chunk);
      return true;
    };

    try {
      const log = createLogger({ level: 'warn' });
      log.debug('Debug message');
      log.info('Info message');
      assert.equal(outputs.length, 0);

      log.warn('Warn message');
      assert.equal(outputs.length, 1);
      const record = JSON.parse(outputs[0]);
      assert.equal(record.level, 'warn');
      assert.equal(record.msg, 'Warn message');
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('creates child loggers with merged context', () => {
    const originalWrite = process.stdout.write;
    const outputs = [];
    process.stdout.write = (chunk) => {
      outputs.push(chunk);
      return true;
    };

    try {
      const parent = createLogger({ level: 'info', context: { service: 'test-service' } });
      const child = parent.child({ ticketId: 456 });

      child.info('Child log event');
      assert.equal(outputs.length, 1);
      const record = JSON.parse(outputs[0]);
      assert.equal(record.service, 'test-service');
      assert.equal(record.ticketId, 456);
      assert.equal(record.msg, 'Child log event');
    } finally {
      process.stdout.write = originalWrite;
    }
  });

  it('writes errors to stderr with stack trace', () => {
    const originalWrite = process.stderr.write;
    const outputs = [];
    process.stderr.write = (chunk) => {
      outputs.push(chunk);
      return true;
    };

    try {
      const log = createLogger({ level: 'error' });
      const testErr = new Error('Sample failure');
      log.error('An error occurred', { err: testErr });

      assert.equal(outputs.length, 1);
      const record = JSON.parse(outputs[0]);
      assert.equal(record.level, 'error');
      assert.equal(record.msg, 'An error occurred');
      assert.equal(record.error.message, 'Sample failure');
      assert.ok(record.error.stack);
    } finally {
      process.stderr.write = originalWrite;
    }
  });
});
