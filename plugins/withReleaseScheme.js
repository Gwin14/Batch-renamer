// Faz o scheme principal do Xcode rodar em Release (Run/LaunchAction) após cada prebuild.
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withReleaseScheme(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const dir = path.join(
        config.modRequest.platformProjectRoot,
        `${config.modRequest.projectName}.xcodeproj`,
        'xcshareddata',
        'xcschemes'
      );
      if (fs.existsSync(dir)) {
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.xcscheme'))) {
          const p = path.join(dir, file);
          const xml = fs.readFileSync(p, 'utf8').replace(
            /(<LaunchAction[^>]*?buildConfiguration\s*=\s*")Debug(")/,
            '$1Release$2'
          );
          fs.writeFileSync(p, xml);
        }
      }
      return config;
    },
  ]);
};
