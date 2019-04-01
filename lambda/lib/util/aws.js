'use strict';
// @flow

const transformS3ObjectTagging = (tagging: S3Tagging) => {
    return tagging.TagSet.reduce((acc, { Key: key, Value: value }) => {
        acc[key] = value;

        return acc;
    }, {});
};

module.exports = {
    transformS3ObjectTagging,
};
