'use strict';
// @flow

const AWS = require('aws-sdk');
const Sharp = require('sharp');
const path = require('path');

const S3 = new AWS.S3({
    signatureVersion: 'v4',
});

const getFileExtension = (filename: string) =>
    path
        .extname(filename)
        .split('.')
        .join('');

module.exports = async (event: S3Event, context, callback) => {
    if (event.Records.length) {
        const {
            Records: [
                {
                    s3: {
                        bucket: { name, key: encodedKey },
                    },
                },
            ],
        } = event;

        const key = decodeURIComponent(encodedKey.replace(/+/g, ' '));
        const ext = getFileExtension(key);

        const format = type === 'jpg' ? 'jpeg' : ext;

        try {
            const { Body: img } = await S3.getObject({ Bucket: bucket, Key: key }).promise();

            const buff = await Sharp(img)
                [format]({ progressive: true })
                .toBuffer();

            await S3.putObject({
                Body: buff,
                Bucket: bucket,
                ContentType: `image/${format}`,
                Key: key,
            }).promise();
        } catch (err) {
            console.log(err);
            callback(err);
        }
    }
};
