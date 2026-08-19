import pkg from "../../../package.json" with { type: "json" };

export const APP_VERSION = pkg.version;
export const APP_NAME = pkg.name;
export const NPM_PACKAGE_NAME = "@tonamson2/bee-router";
