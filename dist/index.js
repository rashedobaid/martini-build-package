/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 974:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 565:
/***/ ((module) => {

module.exports = eval("require")("archiver");


/***/ }),

/***/ 936:
/***/ ((module) => {

module.exports = eval("require")("form-data");


/***/ }),

/***/ 510:
/***/ ((module) => {

module.exports = eval("require")("node-fetch");


/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
const archiver = __nccwpck_require__(565);
const core = __nccwpck_require__(974);
const fs = __nccwpck_require__(896);
const path = __nccwpck_require__(928);
const fetch = __nccwpck_require__(510);
const FormData = __nccwpck_require__(936);
const stream = fs.createReadStream(zipPath);

const MARTINI_BASE_URL = core.getInput('base_url', {
    required: true,
});

const MARTINI_ACCESS_TOKEN = core.getInput('access_token', {
    required: true,
});

const PACKAGE_DIR = core.getInput('package_dir') || 'packages';
const ALLOWED_PACKAGES_INPUT = core.getInput('allowed_packages') || '';
const ALLOWED_PACKAGES = ALLOWED_PACKAGES_INPUT.split(',').map(p => p.trim()).filter(Boolean);

async function zipPackage(directory) {
    const PACKAGE_NAME = path.basename(directory);
    const ZIP_PATH = path.join(__dirname, `${PACKAGE_NAME}.zip`);

    const output = fs.createWriteStream(ZIP_PATH);
    const archive = archiver('zip', {
        zlib: { level: 9 },
    });

    return new Promise((resolve, reject) => {
        output.on('close', () => resolve(ZIP_PATH));
        archive.on('error', err => reject(err));

        archive.pipe(output);
        archive.directory(directory, PACKAGE_NAME);
        archive.finalize();
    });
}

async function uploadPackage(zipPath, PACKAGE_NAME) {
    const packageData = new FormData();
    packageData.append('file', stream, `${PACKAGE_NAME}.zip`);

    const uploadResponse = await fetch(`${MARTINI_BASE_URL}/esbapi/packages/upload?stateOnCreate=STARTED&replaceExisting=true`, {
        body: packageData,
        headers: {
            Authorization: `Bearer ${MARTINI_ACCESS_TOKEN}`,
        },
        method: 'POST',
    });
    const uploadResponseJson = await uploadResponse.json();
    if (!uploadResponse.ok || uploadResponseJson.length !== 1) {
        throw Error(JSON.stringify(uploadResponseJson));
    }

    return uploadResponseJson[0];
}

async function processPackages() {
    const packageDirs = fs.readdirSync(PACKAGE_DIR).filter((file) => {
        const fullPath = path.join(PACKAGE_DIR, file);
        const isDir = fs.statSync(fullPath).isDirectory();
        const isAllowed = ALLOWED_PACKAGES.length === 0 || ALLOWED_PACKAGES.includes(file);
        return isDir && isAllowed;
    });

    if (packageDirs.length === 0) {
        core.info('No packages matched the allowed list.');
        return;
    }

    for (const packageDir of packageDirs) {
        const directoryPath = path.join(PACKAGE_DIR, packageDir);
        try {
            core.info(`Zipping package: ${packageDir}`);
            const zipPath = await zipPackage(directoryPath);
            core.info(`Uploading package: ${packageDir}`);
            const res = await uploadPackage(zipPath, packageDir);
            core.info(`Package uploaded successfully: ${packageDir}`);

            core.setOutput('id', res.id);
            core.setOutput('name', res.name);
            core.setOutput('status', res.status);
            core.setOutput('version', res.version);
        } catch (err) {
            core.error(`Error with package ${packageDir}: ${err.message}`);
            core.setFailed(err.message);
        }
    }
}

processPackages()
    .catch((err) => {
        core.error(err);
        core.setFailed(err.message);
    });
module.exports = __webpack_exports__;
/******/ })()
;