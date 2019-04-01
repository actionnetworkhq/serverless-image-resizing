#!/usr/bin/env node

const { promisify } = require('util');
const path = require('path');
const _ = require('lodash');

const exec = promisify(require('child_process').exec);

const BUILD_DIR = process.env.BUILD_DIR || 'build';

const makeSureDirExists = dir => exec(`mkdir -p ${dir}`);

const getFileList = async () => {
    const ignore = [`./${BUILD_DIR}`, './node_modules', './build.js', './types'];

    const ignoreStr = ignore.map(i => `-path ${i} -prune -o`).join(' ');

    const { stdout } = await exec(`find . ${ignoreStr} -name "*.js" -print`);

    return stdout.split('\n').filter(f => f !== '');
};

const buildFile = async file => {
    console.log(`Building file: ${file}`);

    const buildPath = `./${BUILD_DIR}/${file}`;
    const dir = path.dirname(buildPath);

    await makeSureDirExists(dir);

    try {
        await exec(`npx flow-remove-types ${file} > ${buildPath}`);
    } catch (err) {
        console.error(err.stderr);
        throw new Error(`Could not build file '${file}'`);
    }
};

const run = async () => {
    const files = await getFileList();

    const chunked = _.chunk(files, 10);

    for (const chunk of chunked) {
        try {
            await Promise.all(chunk.map(f => buildFile(f)));
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    }
};

run();
