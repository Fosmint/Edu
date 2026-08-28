const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Начиная с Android 7+ приложения по умолчанию доверяют только системным
 * сертификатам, а не пользовательским. Сертификат НУЦ Минцифры, который
 * нужен для TLS-соединений с GigaChat (Сбер), пользователь устанавливает
 * именно как пользовательский сертификат через Госуслуги/настройки Android —
 * поэтому без этого файла приложение не сможет установить соединение,
 * даже если сертификат установлен и виден в системных настройках.
 */
const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;

function withGigaChatNetworkConfig(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, "app/src/main/res/xml");
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, "network_security_config.xml"), NETWORK_SECURITY_CONFIG);
      return config;
    },
  ]);

  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];
    application.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    return config;
  });

  return config;
}

module.exports = withGigaChatNetworkConfig;
