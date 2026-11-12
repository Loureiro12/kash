// @ts-check
const fs = require('node:fs');
const path = require('node:path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const FILE = 'KashQuickAdd.swift';

/**
 * App Intents "Lançar gasto" / "Lançar entrada" (Toque Atrás, Siri, Atalhos): copia
 * `plugins/quick-add/KashQuickAdd.swift` para o target do app no prebuild e o adiciona ao projeto Xcode.
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
const withQuickAddIntents = (config) => {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
      fs.copyFileSync(path.join(__dirname, 'quick-add', FILE), path.join(cfg.modRequest.platformProjectRoot, projectName, FILE));
      return Promise.resolve(cfg);
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(cfg.modRequest.projectRoot);
    const filepath = `${projectName}/${FILE}`;
    if (!cfg.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath, groupName: projectName, project: cfg.modResults });
    }
    return cfg;
  });
};

module.exports = withQuickAddIntents;
