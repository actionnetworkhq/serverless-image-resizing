'use strict';
// @flow

const transformS3ObjectTagging = (tagging: S3Tagging) => {
    return tagging.TagSet.reduce((acc, { Key: key, Value: value }) => {
        acc[key] = value;

        return acc;
    }, {});
};

function snipFileType(str) {
    return str.replace(/\.(\w+)$/, '');
}

module.exports = {
    snipFileType,
    transformS3ObjectTagging,
};
