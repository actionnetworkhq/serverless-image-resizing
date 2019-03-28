'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
    signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

exports.handler = async (event, context, callback) => {
    const key = event.queryStringParameters.key;
    const match = key.match(/(\d+)x(\d+)\/(.*)/);
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    const originalKey = match[3];

    const fileParts = originalKey.split('.');
    const type = fileParts.pop();

    try {
        const { Body: img } = await S3.getObject({ Bucket: BUCKET, Key: originalKey }).promise();

        const buff = await Sharp(img)
            .resize(width, height)
            .toFormat(type)
            .toBuffer();

        await S3.putObject({
            Body: buff,
            Bucket: BUCKET,
            ContentType: `image/${type}`,
            Key: key,
        }).promise();

        callback(null, {
            statusCode: '301',
            headers: { location: `${URL}/${key}` },
            body: '',
        });
    } catch (err) {
        console.error(err);
        callback(err);
    }
};
