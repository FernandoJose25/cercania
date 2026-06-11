// 📁 cercania/app-scaffold/plugins/withMapboxAuth.js
/**
 * Config plugin para inyectar la autenticación de Mapbox en android/build.gradle.
 * Al declararlo en app.json, Expo lo ejecuta automáticamente en cada `prebuild`.
 * Esto evita tener que editar android/build.gradle manualmente cada vez.
 */

const { withProjectBuildGradle } = require('@expo/config-plugins');

const MAPBOX_MAVEN_BLOCK = `
        maven {
            url 'https://api.mapbox.com/downloads/v2/releases/maven'
            authentication {
                basic(BasicAuthentication)
            }
            credentials {
                username = "mapbox"
                password = project.properties['MAPBOX_DOWNLOADS_TOKEN'] ?: ""
            }
        }`;

function addMapboxMaven(buildGradle) {
  // Si ya está, no duplicar
  if (buildGradle.includes('api.mapbox.com/downloads')) {
    return buildGradle;
  }

  // Insertar después de mavenCentral()
  return buildGradle.replace(
    /mavenCentral\(\)/,
    `mavenCentral()${MAPBOX_MAVEN_BLOCK}`
  );
}

const withMapboxAuth = (config) => {
  return withProjectBuildGradle(config, (config) => {
    config.modResults.contents = addMapboxMaven(config.modResults.contents);
    return config;
  });
};

module.exports = withMapboxAuth;
