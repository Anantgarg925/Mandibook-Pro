// metro.config.js
// NOTE TO AI: Do note change this file unless you are 110% sure you know what you are doing. It will likely break the app.

const { getDefaultConfig } = require("expo/metro-config");
const { withVibecodeMetro } = require("@vibecodeapp/sdk/metro");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;
const path = require("path");
const fs = require("fs");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Only configure shared folder if it exists (may not exist during Docker build)
const sharedFolder = path.resolve(__dirname, "../shared");
const sharedFolderExists = fs.existsSync(sharedFolder);
const workspaceRoot = path.resolve(__dirname, "../");

// DEBUG: Log metro.config.js version and shared folder status at startup
console.log("[Metro Config] Version: 2025-02-03-v3-fix-dynamic-imports (source: workspace-mobile)");
console.log(`[Metro Config] Shared folder: ${sharedFolder}`);
console.log(`[Metro Config] Shared folder exists: ${sharedFolderExists}`);
console.log(`[Metro Config] Workspace root: ${workspaceRoot}`);

// CRITICAL FIX: Watch the entire workspace root so Metro can see hoisted node_modules
config.watchFolders = [workspaceRoot];

// Disable Watchman for file watching.
config.resolver.useWatchman = false;

// Configure asset and source extensions.
const { assetExts, sourceExts } = config.resolver;

// SVG transformer is configured by withVibecodeMetro
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configure resolver with SVG support, shared folder resolution, and web platform mocking
config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...sourceExts, "svg"],
  useWatchman: false,
  blockList: exclusionList([
    /.*\/android\/(app\/)?build\/.*/,
    /.*\/android\/app\/\.cxx\/.*/,
    /.*\/android\/\.gradle\/.*/,
    /.*\/ios\/build\/.*/,
    /.*\/ios\/Pods\/.*\.xcodeproj\/.*/,
    /.*\/\.expo\/.*/,
    /.*\/dist\/.*/,
    /.*\/backend\/node_modules\/.*/,
    /.*\/node_modules\/.*\/(__tests__|test|tests|docs|example|examples)\/.*/,
  ]),
  
  // CRITICAL FIX: Moved nodeModulesPaths outside the shared folder condition 
  // so Metro ALWAYS checks the monorepo root for hoisted packages.
  nodeModulesPaths: [
    path.resolve(__dirname, "node_modules"),
    path.resolve(__dirname, "../backend/node_modules"),
    path.resolve(__dirname, "../node_modules"),
  ],

  // Only add shared folder resolution if it exists
  ...(sharedFolderExists && {
    unstable_enablePackageExports: true,
    extraNodeModules: {
      ...config.resolver.extraNodeModules,
      "@/shared": sharedFolder,
    },
  }),
  
  resolveRequest: (context, moduleName, platform) => {

   if (
      moduleName.startsWith("openai/_shims") ||
      moduleName.startsWith("openai/shims")
    ) {
      return context.resolveRequest(context, moduleName, platform);
    }

   if (
      moduleName === "openai" ||
      (moduleName.startsWith("openai/") &&
        !moduleName.startsWith("openai/_shims") &&
        !moduleName.startsWith("openai/shims"))
    ) {
      console.log(`[Metro Resolve] Routing ${moduleName} safely to static index entry point.`);
      return context.resolveRequest(context, "openai/index.js", platform);
    }
    
    if (sharedFolderExists && moduleName.startsWith("@/shared/")) {
      const subpath = moduleName.slice("@/shared/".length);
      const resolvedPath = path.join(sharedFolder, subpath);
      console.log(`[Metro Resolve] @/shared alias: ${moduleName} -> ${resolvedPath}`);
      return context.resolveRequest(context, resolvedPath, platform);
    }

    if (sharedFolderExists && moduleName === "@/shared") {
      console.log(`[Metro Resolve] @/shared exact: ${moduleName} -> ${sharedFolder}`);
      return context.resolveRequest(context, sharedFolder, platform);
    }
    
    if (moduleName.includes("opentelemetry")) {
      console.log(`[Metro Resolve] Intercepting opentelemetry module: ${moduleName}`);
      return { type: "empty" };
    }

    if (sharedFolderExists && !context.originModulePath?.includes("node_modules")) {
      const relativeSharedMatch = moduleName.match(/^(?:\.\.\/)+shared\/(.+)$/);
      if (relativeSharedMatch) {
        const subpath = relativeSharedMatch[1];
        const resolvedPath = path.join(sharedFolder, subpath);
        console.log(`[Metro Resolve] RELATIVE SHARED: ${moduleName} -> ${resolvedPath}`);
        return context.resolveRequest(context, resolvedPath, platform);
      }
    }

    if (moduleName.includes("better-auth") && moduleName.endsWith(".cjs")) {
      const mjsPath = moduleName.replace(/\.cjs$/, ".mjs");
      return context.resolveRequest(context, mjsPath, platform);
    }

    if (moduleName.includes("@expo/metro-config") || moduleName.includes("async-require")) {
      return { type: "empty" };
    }

    if (platform === "web") {
      if (
        moduleName === "react-native-reanimated" ||
        moduleName.startsWith("react-native-reanimated/") ||
        moduleName === "react-native-worklets" ||
        moduleName.startsWith("react-native-worklets/")
      ) {
        return context.resolveRequest(
          context,
          path.resolve(__dirname, "src/lib/reanimatedWebMock.ts"),
          platform
        );
      }

      const nativeOnlyModules = [
        "react-native-pager-view",
        "reanimated-tab-view",
        "@bottom-tabs/react-navigation",
      ];

      if (nativeOnlyModules.some((mod) => moduleName.includes(mod))) {
        return {
          type: "empty",
        };
      }
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;