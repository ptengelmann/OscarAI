import path from 'path';
import fs from 'fs';

describe('Config Loader', () => {
  const defaultConfigPath = path.resolve(process.cwd(), 'config/default.json');
  const localConfigPath = path.resolve(process.cwd(), 'config/local.json');
  const remoteConfigPath = path.resolve(process.cwd(), 'config.remote.json');

  beforeEach(() => {
    jest.resetModules();
    delete process.env.APP_CONFIG_PATH;
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.AI_ENGINES_CONFIG_PATH;
  });

  it('loads default config when APP_CONFIG_PATH is not set', () => {
    const config = require('../../src/lib/config').default;
    const expected = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));
    expect(config).toMatchObject(expected);
    expect(process.env.AI_ENGINES_CONFIG_PATH).toBe(expected.aiEngineConfigPath);
  });

  it('loads local config when APP_CONFIG_PATH is set', () => {
    process.env.APP_CONFIG_PATH = localConfigPath;
    const config = require('../../src/lib/config').default;
    const expected = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'));
    expect(config).toMatchObject(expected);
    expect(process.env.AI_ENGINES_CONFIG_PATH).toBe(expected.aiEngineConfigPath);
  });

  it('throws error for missing config file', () => {
    process.env.APP_CONFIG_PATH = '/tmp/nonexistent.json';
    expect(() => require('../../src/lib/config')).toThrow(/Config file not found/);
  });

  it('throws error for invalid config file', () => {
    const invalidPath = path.resolve(process.cwd(), 'test/lib/invalid-config.json');
    fs.writeFileSync(invalidPath, '{invalid json');
    process.env.APP_CONFIG_PATH = invalidPath;
    expect(() => require('../../src/lib/config')).toThrow(/not valid JSON/);
    fs.unlinkSync(invalidPath);
  });
});
