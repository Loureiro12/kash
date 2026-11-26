// @ts-check
const { withXcodeProject } = require('expo/config-plugins');

/**
 * Idioma do app no iOS: português do Brasil. O Expo gera o projeto Xcode com `developmentRegion = en`;
 * aqui trocamos para `pt-BR` (e `knownRegions`), junto com `CFBundleDevelopmentRegion`/
 * `CFBundleLocalizations` do app.json. Assim as telas do sistema (câmera, fotos, permissões) e a
 * App Store tratam o app como português.
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
const withPortugueseRegion = (config) =>
  withXcodeProject(config, (cfg) => {
    const projects = cfg.modResults.hash.project.objects.PBXProject ?? {};
    for (const [key, project] of Object.entries(projects)) {
      if (key.endsWith('_comment') || typeof project !== 'object') continue;
      project.developmentRegion = 'pt-BR';
      project.knownRegions = ['"pt-BR"', 'Base'];
    }
    return cfg;
  });

module.exports = withPortugueseRegion;
