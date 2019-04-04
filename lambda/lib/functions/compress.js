'use strict';
// @flow

const AWS = require('aws-sdk');
const Sharp = require('sharp');
const path = require('path');
const awsUtil = require('../util/aws');
const qs = require('querystring');

const S3 = new AWS.S3({
    signatureVersion: 'v4',
});

const getFileExtension = (filename: string) =>
    path
        .extname(filename)
        .split('.')
        .join('');

type CompressS3Event = S3Event & {
    method?: 'manual',
    bucket?: string,
    key?: string,
    region?: string,
};

module.exports = async (event: CompressS3Event, context, callback) => {
    let bucket: string, key: string, region: string;

    if (event.method && event.method === 'manual') {
        ({ bucket, key, region } = event);
    } else if (event.Records && event.Records.length) {
        ({
            Records: [
                {
                    awsRegion: region,
                    s3: {
                        bucket: { name: bucket },
                        object: { key },
                    },
                },
            ],
        } = event);
    }

    console.log(`Starting with bucket '${bucket}', file '${key}'`);

    if (bucket && key) {
        const ext = getFileExtension(key);

        const format = ext === 'jpg' ? 'jpeg' : ext;

        try {
            console.log(`Checking if '${key}' has been processed...`);

            const tagging: S3Tagging = await S3.getObjectTagging({ Bucket: bucket, Key: key }).promise();
            const tags = awsUtil.transformS3ObjectTagging(tagging);

            if (tags.compressed) {
                console.log(`File '${key}' already compressed.`);
            } else {
                console.log(`Begin processing on: ${key}`);

                const { Body: img } = await S3.getObject({ Bucket: bucket, Key: key }).promise();

                const baseParams = {
                    Bucket: bucket,
                    Tagging: qs.stringify({ ...tags, compressed: true }),
                    ACL: 'public-read',
                    CacheControl: 'max-age=31536000, immutable',
                };
                console.log('Image received');

                const buff = await Sharp(img)
                    [format]({ progressive: true })
                    .toBuffer();

                console.log('Image compressed');

                await S3.putObject({
                    ...baseParams,
                    Body: buff,
                    ContentType: `image/${format}`,
                    Key: key,
                }).promise();

                console.log('Image re-uploaded');

                // if right file type, make a webp copy
                if (format === 'jpeg' || format === 'png') {
                    console.log('Begin processing webp..');
                    const webpBuff = await Sharp(img)
                        .webp()
                        .toBuffer();

                    console.log('Webp compressed');

                    await S3.putObject({
                        ...baseParams,
                        Body: webpBuff,
                        ContentType: `image/webp`,
                        Key: `${awsUtil.snipFileType(key)}.webp`,
                    }).promise();
                    console.log('Webp uploaded');
                }
            }

            callback(null);
        } catch (err) {
            console.log(err);
            callback(err);
        }
    }
};
